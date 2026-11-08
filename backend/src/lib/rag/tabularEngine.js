import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '../supabase.js';

/**
 * In-memory registry to store parsed tabular datasets for fast deterministic queries
 * Key: documentId or filename
 */
const datasetStore = new Map();

/**
 * Clean and parse numeric strings (handles '$', commas, parentheses for negative, etc.)
 */
export function parseFinancialNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;

  let s = val.trim().replace(/^["']|["']$/g, '').trim();
  if (!s || s === '-' || s === 'N/A' || s === 'null' || s.toLowerCase() === 'unknown') return null;

  // Check for accounting negative format: (1,234.56)
  const isAccountingNegative = /^\(.*\)$/.test(s);
  s = s.replace(/[$,\s]/g, '');
  if (isAccountingNegative) {
    s = '-' + s.slice(1, -1);
  }

  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/**
 * Format currency numbers with commas and decimals
 */
export function formatCurrency(num, currency = '$') {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return `${currency}${Number(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format standard numbers
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return Number(num).toLocaleString('en-US');
}

/**
 * Parse CSV or Excel buffer into structured array of row objects
 * Uses PapaParse for CSV parsing with auto-detection and semicolon (';') support for files like 'train.csv'.
 */
export function parseTabularBuffer(buffer, filename = 'document.csv') {
  const lowerName = filename.toLowerCase();
  const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { headers: [], rows: [], totalRows: 0 };

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    const headers = Object.keys(rawRows[0]);
    return {
      headers,
      rows: rawRows,
      totalRows: rawRows.length,
      sheetName,
    };
  }

  // Parse CSV with PapaParse supporting semicolon (';'), comma (','), tab, and auto-detection
  const csvText = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const firstLine = csvText.split(/\r\n|\n|\r/)[0] || '';

  // Determine if file is 'train.csv' or uses semicolon (';') delimiter
  let delimiter = '';
  if (
    lowerName.includes('train.csv') ||
    lowerName.includes('train') ||
    (firstLine.includes(';') && !firstLine.includes(','))
  ) {
    delimiter = ';';
  }

  const papaConfig = {
    header: true,
    skipEmptyLines: 'greedy',
    delimitersToGuess: [';', ',', '\t', '|'],
    transformHeader: (header) => header.trim().replace(/^["']|["']$/g, ''),
  };

  if (delimiter) {
    papaConfig.delimiter = delimiter;
  }

  let parsed = Papa.parse(csvText, papaConfig);

  // Fallback: If auto-detection resulted in only 1 header field but line contains ';', re-parse with delimiter ';'
  if (
    (!parsed.meta?.fields || parsed.meta.fields.length <= 1) &&
    firstLine.includes(';')
  ) {
    parsed = Papa.parse(csvText, {
      ...papaConfig,
      delimiter: ';',
    });
  }

  // Filter out empty rows
  let records = (parsed.data || []).filter(
    (row) =>
      row &&
      Object.values(row).some(
        (v) => v !== null && v !== undefined && String(v).trim() !== ''
      )
  );

  let headers = parsed.meta?.fields
    ? parsed.meta.fields.map((h) => h.trim().replace(/^["']|["']$/g, ''))
    : [];

  if (headers.length === 0 && records.length > 0) {
    headers = Object.keys(records[0]);
  }

  console.log(
    `[TabularEngine] Successfully parsed "${filename}": ${records.length} records, ${headers.length} columns using delimiter "${parsed.meta?.delimiter || delimiter || ','}".`
  );

  return {
    headers,
    rows: records,
    totalRows: records.length,
    delimiter: parsed.meta?.delimiter || delimiter || ',',
  };
}

/**
 * Profile an entire tabular dataset (10,000+ rows) deterministically in milliseconds
 */
export function profileTabularDataset(rows, headers, filename = 'document.csv') {
  const totalRows = rows.length;
  if (totalRows === 0) {
    return {
      filename,
      totalRows: 0,
      columns: {},
      summary: 'Empty dataset',
      financialInsights: {
        totalPortfolioVolume: 0,
        amountColumns: [],
        statusColumns: [],
        delinquencySummary: null,
      },
    };
  }

  const columnStats = {};

  for (const header of headers) {
    let numericCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let nonNullCount = 0;
    const valueFrequencies = new Map();

    for (let i = 0; i < totalRows; i++) {
      const val = rows[i][header];
      if (val !== null && val !== undefined && val !== '') {
        nonNullCount++;
        const num = parseFinancialNumber(val);
        if (num !== null) {
          numericCount++;
          sum += num;
          if (num < min) min = num;
          if (num > max) max = num;
        }

        // Track categorical values for first 50 unique entries
        const strVal = String(val).trim();
        if (valueFrequencies.size < 50) {
          valueFrequencies.set(strVal, (valueFrequencies.get(strVal) || 0) + 1);
        }
      }
    }

    const isNumeric = numericCount > totalRows * 0.5;
    const mean = isNumeric && numericCount > 0 ? sum / numericCount : 0;

    columnStats[header] = {
      isNumeric,
      totalCount: totalRows,
      nonNullCount,
      nullCount: totalRows - nonNullCount,
      ...(isNumeric
        ? {
            sum,
            mean,
            min: min === Infinity ? 0 : min,
            max: max === -Infinity ? 0 : max,
          }
        : {
            uniqueSampleCount: valueFrequencies.size,
            topValues: Array.from(valueFrequencies.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([v, count]) => ({
                value: v,
                count,
                pct: ((count / totalRows) * 100).toFixed(1) + '%',
              })),
          }),
    };
  }

  // Detect key financial columns (Balance, Loan, Amount, Status, Delinquency, Rate)
  const financialInsights = {
    totalPortfolioVolume: 0,
    amountColumns: [],
    statusColumns: [],
    delinquencySummary: null,
  };

  for (const [header, stat] of Object.entries(columnStats)) {
    const lower = header.toLowerCase();
    if (
      stat.isNumeric &&
      (lower.includes('amount') ||
        lower.includes('balance') ||
        lower.includes('loan') ||
        lower.includes('principal') ||
        lower.includes('total') ||
        lower.includes('payment') ||
        lower.includes('duration') ||
        lower.includes('campaign'))
    ) {
      financialInsights.amountColumns.push({
        column: header,
        total: stat.sum,
        average: stat.mean,
        min: stat.min,
        max: stat.max,
      });
      if (
        financialInsights.totalPortfolioVolume === 0 ||
        lower.includes('balance') ||
        lower.includes('loan_amount')
      ) {
        financialInsights.totalPortfolioVolume = stat.sum;
      }
    }

    if (
      !stat.isNumeric &&
      (lower.includes('status') ||
        lower.includes('stage') ||
        lower.includes('grade') ||
        lower.includes('condition') ||
        lower.includes('default') ||
        lower.includes('housing') ||
        lower.includes('loan') ||
        lower.includes('education') ||
        lower.includes('job') ||
        lower.includes('marital') ||
        lower === 'y')
    ) {
      financialInsights.statusColumns.push({
        column: header,
        breakdown: stat.topValues,
      });
    }
  }

  return {
    filename,
    totalRows,
    headers,
    columns: columnStats,
    financialInsights,
  };
}

/**
 * Generate 3-5 rich, compact semantic RAG manifest chunks for vector indexing
 */
export function generateTabularManifestChunks(profile, rows) {
  const chunks = [];
  const { filename, totalRows, headers, columns, financialInsights } = profile;

  // Chunk 1: Executive Financial Portfolio Manifest
  let chunk1 = `### EXECUTIVE FINANCIAL DATASET AUDIT & PORTFOLIO MANIFEST
File: ${filename}
Total Record Count: ${formatNumber(totalRows)} rows
Available Columns (${headers.length}): ${headers.join(', ')}

Key Financial Aggregates:
- Primary Financial Volume / Balance: ${formatCurrency(financialInsights?.totalPortfolioVolume || 0)}
`;

  if (financialInsights?.amountColumns?.length > 0) {
    chunk1 += `\nSignificant Financial Columns Summary:\n`;
    for (const col of financialInsights.amountColumns) {
      chunk1 += `* ${col.column}: Total = ${formatCurrency(col.total)} | Average = ${formatCurrency(col.average)} | Min = ${formatCurrency(col.min)} | Max = ${formatCurrency(col.max)}\n`;
    }
  }

  if (financialInsights?.statusColumns?.length > 0) {
    chunk1 += `\nStatus & Categorization Breakdown:\n`;
    for (const stat of financialInsights.statusColumns) {
      chunk1 += `* Column "${stat.column}":\n`;
      for (const val of (stat.breakdown || []).slice(0, 8)) {
        chunk1 += `  - ${val.value}: ${formatNumber(val.count)} records (${val.pct})\n`;
      }
    }
  }

  chunks.push(chunk1.trim());

  // Chunk 2: Comprehensive Column Statistical Metrics & Mathematical Distributions
  let chunk2 = `### COMPLETE COLUMN STATISTICAL METRICS & MATHEMATICAL DISTRIBUTIONS
File: ${filename} (Total: ${formatNumber(totalRows)} records)

Detailed Metrics by Column:\n`;

  for (const [colName, stat] of Object.entries(columns || {})) {
    if (stat.isNumeric) {
      chunk2 += `- [Numeric] "${colName}":
    Sum: ${stat.sum.toLocaleString('en-US', { maximumFractionDigits: 2 })}
    Mean / Average: ${stat.mean.toLocaleString('en-US', { maximumFractionDigits: 2 })}
    Minimum: ${stat.min.toLocaleString('en-US', { maximumFractionDigits: 2 })}
    Maximum: ${stat.max.toLocaleString('en-US', { maximumFractionDigits: 2 })}
    Populated: ${formatNumber(stat.nonNullCount)} (${((stat.nonNullCount / totalRows) * 100).toFixed(1)}%)\n`;
    } else {
      chunk2 += `- [Categorical] "${colName}":
    Populated: ${formatNumber(stat.nonNullCount)} | Unique Sample: ${stat.uniqueSampleCount}
    Dominant Categories: ${(stat.topValues || []).slice(0, 5).map((t) => `${t.value} (${t.count})`).join(', ') || 'N/A'}\n`;
    }
  }

  chunks.push(chunk2.trim());

  // Chunk 3: Stratified Representative Sample Records (Top, Mid, Bottom)
  const sampleIndices = [0, 1, 2, Math.floor(totalRows * 0.25), Math.floor(totalRows * 0.5), Math.floor(totalRows * 0.75), totalRows - 2, totalRows - 1].filter((idx) => idx >= 0 && idx < totalRows);
  const uniqueIndices = Array.from(new Set(sampleIndices));

  let chunk3 = `### STRATIFIED AUDIT SAMPLE RECORDS FROM DATASET
File: ${filename} (Selected ${uniqueIndices.length} representative rows across ${formatNumber(totalRows)} total records)

`;

  for (const idx of uniqueIndices) {
    const row = rows[idx];
    chunk3 += `[Row ${idx + 1}]: ` + JSON.stringify(row) + '\n';
  }

  chunks.push(chunk3.trim());

  return chunks;
}

/**
 * Register dataset in memory for live tool queries
 */
export function registerDataset(documentId, dataset) {
  datasetStore.set(String(documentId), dataset);
  if (dataset.filename) {
    datasetStore.set(dataset.filename.toLowerCase(), dataset);
    datasetStore.set(dataset.filename, dataset);
    const baseName = dataset.filename.replace(/\.[^/.]+$/, '');
    if (baseName && baseName !== dataset.filename) {
      datasetStore.set(baseName.toLowerCase(), dataset);
      datasetStore.set(baseName, dataset);
    }
  }
}

/**
 * Synchronous in-memory lookup for registered dataset
 */
export function getRegisteredDatasetSync(identifier) {
  if (!identifier) return null;
  const rawId = String(identifier).trim();
  const lowerId = rawId.toLowerCase();

  if (datasetStore.has(rawId)) return datasetStore.get(rawId);
  if (datasetStore.has(lowerId)) return datasetStore.get(lowerId);

  // Check comma/semicolon-separated list of filenames (e.g. from multiple attachments)
  const parts = lowerId.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (datasetStore.has(part)) return datasetStore.get(part);
  }

  // Substring matching: e.g. "train.csv" in "train.csv, doc2.pdf" or "train"
  for (const [key, val] of datasetStore.entries()) {
    const k = String(key).toLowerCase();
    if (k && (lowerId.includes(k) || k.includes(lowerId))) {
      return val;
    }
  }

  return null;
}

/**
 * Fetches a tabular document from Supabase (via file_url or storage bucket),
 * parses it with PapaParse (CSV) or XLSX (Excel), profiles it, and loads it into memory.
 */
export async function fetchAndRegisterTabularDoc(docRecord) {
  if (!docRecord) return null;
  const filename = docRecord.filename || 'dataset.csv';
  let buffer = null;

  // 1. Direct fetch from file_url if available
  if (docRecord.file_url) {
    try {
      const res = await fetch(docRecord.file_url);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        buffer = Buffer.from(ab);
      } else {
        console.warn(`[TabularEngine] Direct fetch from file_url returned status ${res.status} for ${filename}`);
      }
    } catch (urlErr) {
      console.warn(`[TabularEngine] Direct fetch failed for ${filename}:`, urlErr?.message || urlErr);
    }
  }

  // 2. Fallback: Download directly from Supabase Storage bucket
  if (!buffer) {
    try {
      const supabase = getSupabaseClient();
      let storagePath = '';
      if (docRecord.file_url && docRecord.file_url.includes('/financial_documents/')) {
        storagePath = decodeURIComponent(docRecord.file_url.split('/financial_documents/')[1].split('?')[0]);
      } else if (docRecord.file_url && !docRecord.file_url.startsWith('http')) {
        storagePath = docRecord.file_url.replace(/^\/+/, '');
      }

      if (storagePath && supabase) {
        const { data: blob, error: downloadError } = await supabase.storage
          .from('financial_documents')
          .download(storagePath);
        if (!downloadError && blob) {
          const ab = await blob.arrayBuffer();
          buffer = Buffer.from(ab);
        } else if (downloadError) {
          console.warn(`[TabularEngine] Supabase storage download error for ${storagePath}:`, downloadError.message);
        }
      }
    } catch (storageErr) {
      console.warn(`[TabularEngine] Supabase storage download exception:`, storageErr?.message || storageErr);
    }
  }

  if (!buffer) {
    console.warn(`[TabularEngine] Could not retrieve file buffer for ${filename} (ID: ${docRecord.id})`);
    return null;
  }

  try {
    // 3. Parse buffer (uses PapaParse for CSV, XLSX for spreadsheets)
    const parsed = parseTabularBuffer(buffer, filename);
    if (!parsed || !parsed.rows || parsed.rows.length === 0) {
      console.warn(`[TabularEngine] Parsed 0 records from: ${filename}`);
      return null;
    }

    // 4. Deterministic profiling
    const profile = profileTabularDataset(parsed.rows, parsed.headers, filename);

    const datasetPayload = {
      ...parsed,
      ...profile,
      documentId: docRecord.id,
      filename: docRecord.filename,
      file_url: docRecord.file_url,
    };

    // 5. Load into in-memory store
    registerDataset(docRecord.id, datasetPayload);
    console.log(`[TabularEngine] Successfully restored "${docRecord.filename}" (${parsed.totalRows} rows) into memory from Supabase.`);
    return datasetPayload;
  } catch (parseErr) {
    console.error(`[TabularEngine] Error parsing tabular dataset from ${filename}:`, parseErr);
    return null;
  }
}

/**
 * Retrieve registered dataset with fuzzy and multi-match support.
 * If not present in memory, automatically fetches the document record from Supabase,
 * downloads the file from Supabase storage, parses it with PapaParse, and loads it into memory.
 */
export async function getRegisteredDataset(identifier) {
  // Step 1: Check in-memory store first (synchronous check)
  if (identifier) {
    const cached = getRegisteredDatasetSync(identifier);
    if (cached) return cached;
  } else {
    const all = getAllRegisteredDatasets();
    if (all.length > 0) return all[all.length - 1] || all[0];
  }

  // Step 2: Not in memory -> fetch from Supabase
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[TabularEngine] Supabase client is not available.');
      return null;
    }

    let cleanId = '';
    if (identifier) {
      cleanId = String(identifier).trim();
      // Remove any [Documents Attached (1): ...] prompt markup
      const matchAttached = cleanId.match(/\[Documents?\s+Attached(?:\s*\(\d+\))?:\s*([^\]]+)\]/i);
      if (matchAttached) {
        cleanId = matchAttached[1].trim();
      }
    }

    let candidateKeys = [];
    if (cleanId) {
      candidateKeys = cleanId
        .split(/[,;\n]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (candidateKeys.length === 0) candidateKeys = [cleanId];
    }

    let docRecord = null;

    for (const key of candidateKeys) {
      // Check if key is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      if (isUuid) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', key)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          docRecord = data[0];
          break;
        }
      }

      // Try exact filename match
      const { data: exactData, error: exactErr } = await supabase
        .from('documents')
        .select('*')
        .eq('filename', key)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!exactErr && exactData && exactData.length > 0) {
        docRecord = exactData[0];
        break;
      }

      // Try fuzzy / partial match
      const baseKey = key.replace(/\.[^/.]+$/, '');
      const { data: fuzzyData, error: fuzzyErr } = await supabase
        .from('documents')
        .select('*')
        .ilike('filename', `%${baseKey}%`)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!fuzzyErr && fuzzyData && fuzzyData.length > 0) {
        docRecord = fuzzyData[0];
        break;
      }
    }

    // If identifier was omitted or no matching record was found, look for latest CSV / tabular document
    if (!docRecord) {
      const { data: latestData, error: latestErr } = await supabase
        .from('documents')
        .select('*')
        .or('filename.ilike.%.csv,filename.ilike.%.xlsx,filename.ilike.%.xls')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!latestErr && latestData && latestData.length > 0) {
        docRecord = latestData[0];
      }
    }

    if (!docRecord) {
      console.warn(`[TabularEngine] No tabular document found in Supabase for identifier: "${identifier || ''}"`);
      return null;
    }

    console.log(`[TabularEngine] Recovering tabular dataset from Supabase: "${docRecord.filename}" (${docRecord.id})`);
    return await fetchAndRegisterTabularDoc(docRecord);
  } catch (err) {
    console.error('[TabularEngine] Error recovering tabular dataset from Supabase:', err?.message || err);
    return null;
  }
}

/**
 * Get all registered datasets
 */
export function getAllRegisteredDatasets() {
  const unique = new Map();
  for (const [, ds] of datasetStore.entries()) {
    if (ds.documentId && !unique.has(ds.documentId)) {
      unique.set(ds.documentId, ds);
    } else if (ds.filename && !unique.has(ds.filename)) {
      unique.set(ds.filename, ds);
    }
  }
  return Array.from(unique.values());
}

/**
 * Deterministic Filter & Aggregate Query Engine
 */
export function queryTabularData(dataset, options = {}) {
  const { filterColumn, filterValue, filterOperator = 'equals', sortBy, sortOrder = 'desc', limit = 20, offset = 0 } = options;
  let resultRows = [...dataset.rows];

  if (filterColumn && filterValue !== undefined) {
    const matchingCol =
      dataset.headers.find(
        (h) => h.toLowerCase() === filterColumn.toLowerCase() || h.toLowerCase().includes(filterColumn.toLowerCase())
      ) || filterColumn;

    resultRows = resultRows.filter((r) => {
      const cellVal = r[matchingCol];
      if (cellVal === undefined || cellVal === null) return false;

      if (filterOperator === 'equals') {
        return String(cellVal).trim().toLowerCase() === String(filterValue).trim().toLowerCase();
      }
      if (filterOperator === 'contains') {
        return String(cellVal).toLowerCase().includes(String(filterValue).toLowerCase());
      }
      if (filterOperator === 'greaterThan') {
        const numA = parseFinancialNumber(cellVal);
        const numB = parseFinancialNumber(filterValue);
        return numA !== null && numB !== null && numA > numB;
      }
      if (filterOperator === 'lessThan') {
        const numA = parseFinancialNumber(cellVal);
        const numB = parseFinancialNumber(filterValue);
        return numA !== null && numB !== null && numA < numB;
      }
      return true;
    });
  }

  // Sort
  if (sortBy) {
    const matchingSortCol =
      dataset.headers.find(
        (h) => h.toLowerCase() === sortBy.toLowerCase() || h.toLowerCase().includes(sortBy.toLowerCase())
      ) || sortBy;

    resultRows.sort((a, b) => {
      const valA = a[matchingSortCol];
      const valB = b[matchingSortCol];
      const numA = parseFinancialNumber(valA);
      const numB = parseFinancialNumber(valB);

      if (numA !== null && numB !== null) {
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  const totalFilteredCount = resultRows.length;
  const start = Math.max(offset, 0);
  const slicedRows = resultRows.slice(start, start + limit);

  // Compute subtotals for numeric columns in the filtered set
  const subtotals = {};
  if (resultRows.length > 0) {
    for (const h of dataset.headers) {
      if (dataset.columns && dataset.columns[h]?.isNumeric) {
        let sum = 0;
        let count = 0;
        for (const r of resultRows) {
          const num = parseFinancialNumber(r[h]);
          if (num !== null) {
            sum += num;
            count++;
          }
        }
        subtotals[h] = {
          sum,
          average: count > 0 ? sum / count : 0,
          count,
        };
      }
    }
  }

  return {
    totalMatchingRows: totalFilteredCount,
    returnedRowsCount: slicedRows.length,
    headers: dataset.headers,
    rows: slicedRows,
    records: slicedRows, // Parsed JSON array passed directly
    subtotals,
  };
}
