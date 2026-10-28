import { parse as parseCsvSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

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

  let s = val.trim();
  if (!s || s === '-' || s === 'N/A' || s === 'null') return null;

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

  // Parse CSV
  const csvText = buffer.toString('utf-8');
  const records = parseCsvSync(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return {
    headers,
    rows: records,
    totalRows: records.length,
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
              .map(([v, count]) => ({ value: v, count, pct: ((count / totalRows) * 100).toFixed(1) + '%' })),
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
    if (stat.isNumeric && (lower.includes('amount') || lower.includes('balance') || lower.includes('loan') || lower.includes('principal') || lower.includes('total') || lower.includes('payment'))) {
      financialInsights.amountColumns.push({
        column: header,
        total: stat.sum,
        average: stat.mean,
        min: stat.min,
        max: stat.max,
      });
      if (financialInsights.totalPortfolioVolume === 0 || lower.includes('balance') || lower.includes('loan_amount')) {
        financialInsights.totalPortfolioVolume = stat.sum;
      }
    }

    if (!stat.isNumeric && (lower.includes('status') || lower.includes('stage') || lower.includes('grade') || lower.includes('condition'))) {
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
 * This replaces 15,000 fragmented text chunks with deterministic master context!
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
- Primary Financial Volume / Balance: ${formatCurrency(financialInsights.totalPortfolioVolume)}
`;

  if (financialInsights.amountColumns.length > 0) {
    chunk1 += `\nSignificant Financial Columns Summary:\n`;
    for (const col of financialInsights.amountColumns) {
      chunk1 += `* ${col.column}: Total = ${formatCurrency(col.total)} | Average = ${formatCurrency(col.average)} | Min = ${formatCurrency(col.min)} | Max = ${formatCurrency(col.max)}\n`;
    }
  }

  if (financialInsights.statusColumns.length > 0) {
    chunk1 += `\nStatus & Portfolio Categorization:\n`;
    for (const stat of financialInsights.statusColumns) {
      chunk1 += `* Column "${stat.column}":\n`;
      for (const val of (stat.breakdown || []).slice(0, 8)) {
        chunk1 += `  - ${val.value}: ${formatNumber(val.count)} loans/records (${val.pct})\n`;
      }
    }
  }

  chunks.push(chunk1.trim());

  // Chunk 2: Comprehensive Column Statistical Metrics & Mathematical Distributions
  let chunk2 = `### COMPLETE COLUMN STATISTICAL METRICS & MATHEMATICAL DISTRIBUTIONS
File: ${filename} (Total: ${formatNumber(totalRows)} records)

Detailed Metrics by Column:\n`;

  for (const [colName, stat] of Object.entries(columns)) {
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
  }
}

/**
 * Retrieve registered dataset
 */
export function getRegisteredDataset(identifier) {
  if (!identifier) return null;
  const strId = String(identifier).toLowerCase();
  return datasetStore.get(identifier) || datasetStore.get(strId) || null;
}

/**
 * Get all registered datasets
 */
export function getAllRegisteredDatasets() {
  const unique = new Map();
  for (const [, ds] of datasetStore.entries()) {
    if (ds.documentId && !unique.has(ds.documentId)) {
      unique.set(ds.documentId, ds);
    }
  }
  return Array.from(unique.values());
}

/**
 * Deterministic Filter & Aggregate Query Engine
 */
export function queryTabularData(dataset, options = {}) {
  const { filterColumn, filterValue, filterOperator = 'equals', sortBy, sortOrder = 'desc', limit = 20 } = options;
  let resultRows = [...dataset.rows];

  if (filterColumn && filterValue !== undefined) {
    resultRows = resultRows.filter((r) => {
      const cellVal = r[filterColumn];
      if (cellVal === undefined || cellVal === null) return false;

      if (filterOperator === 'equals') {
        return String(cellVal).toLowerCase() === String(filterValue).toLowerCase();
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
    resultRows.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
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
  const slicedRows = resultRows.slice(0, limit);

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
    subtotals,
  };
}

