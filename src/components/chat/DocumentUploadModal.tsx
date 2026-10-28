'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  LinearProgress,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import CheckIcon from '@mui/icons-material/Check';

import { createClient } from '@/lib/supabase/client';
import { SupabaseDocumentRecord } from '@/services/documentService';

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete?: (documentName: string, documentRecord?: SupabaseDocumentRecord) => void;
}

type PipelineStage = 'idle' | 'uploading' | 'processing_rag' | 'completed';

interface UploadResultItem {
  file: File;
  record?: SupabaseDocumentRecord;
  chunksCount?: number;
  error?: string;
  warning?: string;
}

export default function DocumentUploadModal({
  open,
  onClose,
  onUploadComplete,
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedUrlIndex, setCopiedUrlIndex] = useState<number | null>(null);

  // Stored results from Supabase upload & RAG vector indexing
  const [uploadedResults, setUploadedResults] = useState<UploadResultItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setFiles([]);
        setStage('idle');
        setUploadProgress(0);
        setStatusMessage('');
        setErrorMessage(null);
        setIsDragging(false);
        setUploadedResults([]);
        setCopiedUrlIndex(null);
      }, 300);
    }
  }, [open]);

  const validateAndAddFiles = (newFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: File[] = [];
    const rejectedNames: string[] = [];

    Array.from(newFiles).forEach((f) => {
      const fileName = f.name.toLowerCase();
      const isPdf = fileName.endsWith('.pdf') || f.type === 'application/pdf';
      const isCsv = fileName.endsWith('.csv') || f.type === 'text/csv';
      const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (isPdf || isCsv || isXlsx) {
        // Prevent duplicate files in the current selection
        const alreadyInList = files.some(
          (existing) => existing.name === f.name && existing.size === f.size
        );
        if (!alreadyInList) {
          validFiles.push(f);
        }
      } else {
        rejectedNames.push(f.name);
      }
    });

    if (rejectedNames.length > 0) {
      setErrorMessage(
        `Unsupported format for: ${rejectedNames.join(', ')}. Please upload PDF (.pdf), CSV (.csv), or Excel (.xlsx) files.`
      );
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAll = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and Drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  /**
   * Real Supabase Storage Multi-File Upload & Postgres Record Creation
   */
  const handleStartUpload = async () => {
    if (files.length === 0) {
      setErrorMessage('Please select or drag-and-drop at least one file to upload.');
      return;
    }

    try {
      setErrorMessage(null);
      setStage('uploading');
      setUploadProgress(5);
      setStatusMessage(
        `Initiating upload for ${files.length} ${files.length === 1 ? 'document' : 'documents'}...`
      );

      const supabase = createClient();
      const results: UploadResultItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const curFile = files[i];
        const stepBase = (i / files.length) * 100;
        const stepSize = (1 / files.length) * 100;

        setStatusMessage(
          `[${i + 1}/${files.length}] Uploading "${curFile.name}" to Supabase Storage...`
        );
        setUploadProgress(Math.round(stepBase + stepSize * 0.3));

        // 1. Supabase Storage upload
        const fileExt = curFile.name.includes('.') ? curFile.name.split('.').pop() : '';
        const cleanBaseName = curFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 50);
        const storagePath = `${Date.now()}_${i}_${cleanBaseName}${fileExt ? `.${fileExt}` : ''}`;

        const { error: uploadError } = await supabase.storage
          .from('financial_documents')
          .upload(storagePath, curFile, {
            contentType: curFile.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Storage upload error for ${curFile.name}:`, uploadError);
          results.push({ file: curFile, error: uploadError.message });
          continue;
        }

        // 2. Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('financial_documents')
          .getPublicUrl(storagePath);
        const publicUrl = publicUrlData.publicUrl;

        setStatusMessage(
          `[${i + 1}/${files.length}] Registering "${curFile.name}" in Postgres documents table...`
        );
        setUploadProgress(Math.round(stepBase + stepSize * 0.6));

        // 3. Postgres insert
        const { data: dbData, error: dbError } = await supabase
          .from('documents')
          .insert({
            filename: curFile.name,
            file_url: publicUrl,
            status: 'pending',
          })
          .select('*')
          .single();

        if (dbError) {
          console.error(`Postgres insert error for ${curFile.name}:`, dbError);
          results.push({ file: curFile, error: dbError.message });
          continue;
        }

        const record = dbData as SupabaseDocumentRecord;

        // 4. Trigger RAG Pipeline
        setStage('processing_rag');
        setStatusMessage(
          `[${i + 1}/${files.length}] Vectorizing & chunking "${curFile.name}"...`
        );
        setUploadProgress(Math.round(stepBase + stepSize * 0.85));

        let chunksCount = 0;
        let warningText: string | undefined = undefined;

        try {
          const ragRes = await fetch(`/api/documents/${record.id}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          const ragData = await ragRes.json();
          if (ragRes.ok && ragData.success) {
            record.status = 'processed';
            chunksCount = ragData.data?.chunksCount || 0;
          } else {
            warningText =
              ragData.error?.message ||
              ragData.error ||
              'Vector embedding queued in pending status.';
          }
        } catch (ragErr: any) {
          warningText = ragErr?.message || 'Processing network error';
        }

        results.push({
          file: curFile,
          record,
          chunksCount,
          warning: warningText,
        });

        setUploadProgress(Math.round(stepBase + stepSize));
      }

      setUploadedResults(results);
      setUploadProgress(100);
      setStage('completed');
      setStatusMessage('Batch upload & ingestion completed!');
      const successCount = results.filter((r) => r.record).length;
      setSuccessToast(
        `Successfully uploaded ${successCount} of ${files.length} documents to Supabase.`
      );
    } catch (err) {
      console.error('Batch upload error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during batch upload.'
      );
      setStage('idle');
      setUploadProgress(0);
    }
  };

  const handleDone = () => {
    const successful = uploadedResults.filter((r) => r.record);
    if (successful.length > 0) {
      successful.forEach((res) => {
        onUploadComplete?.(res.file.name, res.record);
      });
    } else if (files.length > 0) {
      files.forEach((f) => {
        onUploadComplete?.(f.name);
      });
    }
    onClose();
  };

  const handleResetForNewUpload = () => {
    setFiles([]);
    setUploadedResults([]);
    setStage('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlIndex(index);
    setTimeout(() => setCopiedUrlIndex(null), 2000);
  };

  const totalChunks = uploadedResults.reduce((acc, curr) => acc + (curr.chunksCount || 0), 0);
  const successfulRecords = uploadedResults.filter((r) => r.record);

  return (
    <>
      <Dialog
        open={open}
        onClose={stage === 'idle' || stage === 'completed' ? onClose : undefined}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a56db] flex items-center justify-center">
              <CloudUploadIcon fontSize="small" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Upload Financial Documents
              </h3>
              <span className="text-xs text-slate-500">
                Direct Ingestion to Supabase Storage &amp; Vector Database
              </span>
            </div>
          </div>
          {(stage === 'idle' || stage === 'completed') && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent className="py-4 space-y-4">
          {stage === 'idle' ? (
            <>
              <p className="text-xs text-slate-500">
                Drag and drop your financial filings, balance sheets, or commercial invoices (PDF or CSV) to
                upload directly to Supabase Storage and register in the Postgres database:
              </p>

              {/* Error Notification */}
              {errorMessage && (
                <Alert severity="error" className="rounded-xl text-xs py-1">
                  {errorMessage}
                </Alert>
              )}

              {/* Drag & Drop Upload Zone */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-200 ${
                  isDragging
                    ? 'border-[#1a56db] bg-blue-50/80 ring-4 ring-blue-100 scale-[1.01]'
                    : 'border-slate-300 hover:border-[#1a56db] bg-slate-50/70 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      validateAndAddFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />

                {files.length === 0 ? (
                  /* Empty Drag & Drop Prompt */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer py-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1a56db] flex items-center justify-center mx-auto mb-2 shadow-2xs">
                      <CloudUploadIcon fontSize="medium" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {isDragging
                        ? 'Drop PDF or CSV files here to upload'
                        : 'Drag & drop multiple PDF or CSV files here'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      or click to browse from your computer (Multiple files supported, Max 25 MB each)
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        PDF (SEC 10-K/Q, Invoices)
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        CSV (Balance Sheets, P&amp;L)
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Multiple Files Selected List */
                  <div className="w-full space-y-2.5">
                    {/* Header bar above list */}
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-[#1a56db]"></span>
                        <span>
                          {files.length} {files.length === 1 ? 'file' : 'files'} selected for upload
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-semibold text-[#1a56db] hover:text-[#1545b0] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          + Add More
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="text-xs text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list of files with individual removal */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {files.map((curFile, idx) => {
                        const isCurCsv =
                          curFile.name.toLowerCase().endsWith('.csv') ||
                          curFile.type === 'text/csv';
                        const isCurPdf =
                          curFile.name.toLowerCase().endsWith('.pdf') ||
                          curFile.type === 'application/pdf';

                        return (
                          <div
                            key={`${curFile.name}-${idx}`}
                            className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-left shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 truncate min-w-0 pr-2">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isCurCsv
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}
                              >
                                {isCurCsv ? (
                                  <GridOnIcon fontSize="small" />
                                ) : (
                                  <PictureAsPdfIcon fontSize="small" />
                                )}
                              </div>
                              <div className="truncate min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {curFile.name}
                                  </p>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                      isCurCsv
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {isCurCsv ? 'CSV' : isCurPdf ? 'PDF' : 'DOC'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                  {(curFile.size / 1024).toFixed(0)} KB •{' '}
                                  {isCurCsv ? 'Tabular Spreadsheet' : 'Financial Document'}
                                </p>
                              </div>
                            </div>

                            <Tooltip title={`Remove ${curFile.name}`}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFile(idx);
                                }}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 shrink-0 cursor-pointer"
                              >
                                <DeleteOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick drop hint */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="pt-1 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer text-center"
                    >
                      Drag &amp; drop more files or click here to add
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : stage === 'uploading' || stage === 'processing_rag' ? (
            /* ============================================================= */
            /* LOADING STATE: REAL-TIME SUPABASE UPLOAD & INSERTION          */
            /* ============================================================= */
            <div className="space-y-5 py-4">
              <div className="text-center space-y-2">
                <div className="relative inline-flex items-center justify-center">
                  <CircularProgress size={56} thickness={4} sx={{ color: '#1a56db' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CloudUploadIcon sx={{ fontSize: 24, color: '#1a56db' }} />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Uploading to Supabase Storage &amp; Database...
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {statusMessage || 'Transmitting payload to financial_documents...'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Storage &amp; DB Progress</span>
                  <span className="font-mono font-bold text-[#1a56db]">{uploadProgress}%</span>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#f1f5f9',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#1a56db',
                      borderRadius: 4,
                    },
                  }}
                />
              </div>

              {/* Stepper overview */}
              <div className="space-y-2.5 pt-2">
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    uploadProgress >= 30
                      ? 'border-[#1a56db] bg-blue-50/60 text-[#1a56db]'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CloudUploadIcon fontSize="small" />
                    <div>
                      <p className="font-bold">1. Supabase Storage Multi-File Upload</p>
                      <p className="text-[11px] text-slate-500">
                        Bucket: financial_documents • Direct binary stream
                      </p>
                    </div>
                  </div>
                  {uploadProgress >= 60 ? (
                    <span className="text-emerald-600 font-bold font-mono text-[11px]">✓ Uploaded</span>
                  ) : (
                    <span className="font-mono text-[11px] animate-pulse">In Progress...</span>
                  )}
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    uploadProgress >= 60
                      ? 'border-[#1a56db] bg-blue-50/60 text-[#1a56db]'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PictureAsPdfIcon fontSize="small" />
                    <div>
                      <p className="font-bold">2. Postgres documents Table Batch Registration</p>
                      <p className="text-[11px] text-slate-500">
                        filename, public file_url, status: &apos;pending&apos;
                      </p>
                    </div>
                  </div>
                  {uploadProgress >= 85 ? (
                    <span className="text-emerald-600 font-bold font-mono text-[11px]">✓ Registered</span>
                  ) : uploadProgress >= 50 ? (
                    <span className="font-mono text-[11px] animate-pulse">Writing Rows...</span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">Waiting</span>
                  )}
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    stage === 'processing_rag' || uploadProgress === 100
                      ? 'border-[#1a56db] bg-blue-50/60 text-[#1a56db]'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <AutoAwesomeIcon fontSize="small" />
                    <div>
                      <p className="font-bold">3. Google Gemini RAG Ingestion Pipeline</p>
                      <p className="text-[11px] text-slate-500">
                        Text extraction • Gemini vector embeddings (768-dim) • document_chunks table
                      </p>
                    </div>
                  </div>
                  {uploadProgress === 100 ? (
                    <span className="text-emerald-600 font-bold font-mono text-[11px]">
                      ✓ Ingested
                    </span>
                  ) : stage === 'processing_rag' ? (
                    <span className="font-mono text-[11px] animate-pulse text-[#1a56db] font-semibold">
                      Embedding Chunks...
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px]">Waiting</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* SUCCESS STATE: RECORD METADATA & PUBLIC FILE URL DISPLAY      */
            /* ============================================================= */
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircleIcon fontSize="small" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Upload &amp; Registration Successful!
                    </h4>
                    <p className="text-xs text-emerald-700">
                      {successfulRecords.length}{' '}
                      {successfulRecords.length === 1 ? 'file' : 'files'} saved to Supabase
                      Storage and registered in the database.
                    </p>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                <div className="pt-2 border-t border-emerald-200/80 space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {uploadedResults.map((item, idx) => {
                    const isCurCsv =
                      item.file.name.toLowerCase().endsWith('.csv') ||
                      item.file.type === 'text/csv';

                    return (
                      <div
                        key={`${item.file.name}-${idx}`}
                        className="p-3 bg-white/95 rounded-xl border border-emerald-200 shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                isCurCsv
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {isCurCsv ? (
                                <GridOnIcon sx={{ fontSize: 14 }} />
                              ) : (
                                <PictureAsPdfIcon sx={{ fontSize: 14 }} />
                              )}
                            </div>
                            <span className="font-bold text-slate-900 truncate">
                              {item.file.name}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              item.record?.status === 'processed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {item.record?.status === 'processed' ? (
                              <CheckIcon sx={{ fontSize: 11 }} />
                            ) : (
                              <HourglassTopIcon sx={{ fontSize: 11 }} />
                            )}
                            <span>{item.record?.status || 'pending'}</span>
                          </span>
                        </div>

                        {item.chunksCount !== undefined && item.chunksCount > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                            <AutoAwesomeIcon sx={{ fontSize: 13 }} />
                            <span>
                              {item.chunksCount} chunks embedded with Google Gemini (vector(768))
                            </span>
                          </div>
                        )}

                        {item.record?.file_url && (
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                            <input
                              type="text"
                              readOnly
                              value={item.record.file_url}
                              className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1 outline-hidden truncate"
                            />
                            <Tooltip
                              title={copiedUrlIndex === idx ? 'Copied!' : 'Copy public URL'}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleCopyUrl(item.record!.file_url, idx)}
                                className="text-slate-500 hover:text-[#1a56db] p-1 shrink-0"
                              >
                                {copiedUrlIndex === idx ? (
                                  <CheckIcon sx={{ fontSize: 14, color: '#059669' }} />
                                ) : (
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Open in new browser tab">
                              <IconButton
                                size="small"
                                component="a"
                                href={item.record.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-500 hover:text-[#1a56db] p-1 shrink-0"
                              >
                                <OpenInNewIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pipeline Ready Notification */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#1a56db]">
                  <AutoAwesomeIcon sx={{ fontSize: 15 }} />
                  <span>RAG Knowledge Pipeline Updated</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {totalChunks > 0
                    ? `A total of ${totalChunks} vector chunks were indexed into Supabase document_chunks table. These documents are now available for grounded semantic retrieval in chat.`
                    : 'The documents were saved to Supabase Storage and registered with status pending. They are available for citation in chat.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>

        <DialogActions className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          {stage === 'idle' ? (
            <>
              <Button
                size="small"
                onClick={onClose}
                className="text-xs text-slate-600 normal-case"
              >
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleStartUpload}
                disabled={files.length === 0}
                startIcon={<CloudUploadIcon fontSize="small" />}
                sx={{
                  bgcolor: '#1a56db',
                  '&:hover': { bgcolor: '#1545b0' },
                  '&.Mui-disabled': { bgcolor: '#94a3b8', color: '#ffffff' },
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  fontWeight: 600,
                }}
              >
                {files.length > 1
                  ? `Upload ${files.length} Files to Supabase`
                  : 'Upload to Supabase Storage'}
              </Button>
            </>
          ) : stage === 'uploading' || stage === 'processing_rag' ? (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-500 italic truncate max-w-[400px]">
                {statusMessage}
              </span>
              <CircularProgress size={18} sx={{ color: '#1a56db' }} />
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <Button
                size="small"
                variant="outlined"
                onClick={handleResetForNewUpload}
                className="text-xs border-slate-300 text-slate-700 normal-case rounded-lg"
              >
                Upload More Documents
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleDone}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  fontWeight: 600,
                }}
              >
                {successfulRecords.length > 1
                  ? `Done / Attach ${successfulRecords.length} Files →`
                  : 'Done / Attach in Chat →'}
              </Button>
            </div>
          )}
        </DialogActions>
      </Dialog>

      {/* Success Toast / Snackbar Notification */}
      <Snackbar
        open={Boolean(successToast)}
        autoHideDuration={5000}
        onClose={() => setSuccessToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessToast(null)}
          severity="success"
          sx={{
            width: '100%',
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 2.5,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
            '& .MuiAlert-icon': { color: '#34d399' },
          }}
        >
          {successToast}
        </Alert>
      </Snackbar>
    </>
  );
}
