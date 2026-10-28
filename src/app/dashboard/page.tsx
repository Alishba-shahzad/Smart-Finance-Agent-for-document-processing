'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Tooltip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SpeedIcon from '@mui/icons-material/Speed';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BarChartIcon from '@mui/icons-material/BarChart';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface DocumentRecord {
  id: string;
  invoiceId: string;
  fileName: string;
  entityName: string;
  category: 'Invoice' | '10-K Filing' | '10-Q Report' | 'Balance Sheet' | 'Audit Report';
  date: string;
  amount?: string;
  fileSize: string;
  pages: number;
  status: 'Processed' | 'Pending' | 'Under Review' | 'Flagged';
  accuracy: number;
  extractedEntities: Array<{ label: string; value: string; confidence: number }>;
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Processed' | 'Pending' | 'Under Review' | 'Flagged'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All Months');

  // Modal and Notification states
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Upload Form states
  const [uploadCategory, setUploadCategory] = useState('Invoice');
  const [uploadEntity, setUploadEntity] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dashboardDragging, setDashboardDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Mock document database
  const [documents, setDocuments] = useState<DocumentRecord[]>([
    {
      id: 'doc-101',
      invoiceId: 'INV-2026-9812',
      fileName: 'Commercial_Vendor_Invoice_INV9812.pdf',
      entityName: 'Global Cloud Logistics LLC',
      category: 'Invoice',
      date: '2026-10-24 10:45 AM',
      amount: '$42,850.00',
      fileSize: '412 KB',
      pages: 2,
      status: 'Processed',
      accuracy: 99.2,
      extractedEntities: [
        { label: 'Invoice Subtotal', value: '$39,500.00', confidence: 0.99 },
        { label: 'Sales Tax (8.5%)', value: '$3,350.00', confidence: 0.99 },
        { label: 'Total Payable', value: '$42,850.00', confidence: 1.0 },
        { label: 'Due Date', value: 'Nov 15, 2026', confidence: 0.98 },
      ],
    },
    {
      id: 'doc-102',
      invoiceId: 'SEC-10K-2025',
      fileName: 'Alpha_Corp_2025_10K_Annual_Report.pdf',
      entityName: 'Alpha Corporation',
      category: '10-K Filing',
      date: '2026-10-24 09:12 AM',
      amount: '$4.82B Revenue',
      fileSize: '4.8 MB',
      pages: 84,
      status: 'Processed',
      accuracy: 98.7,
      extractedEntities: [
        { label: 'Total Revenue', value: '$4,820,500,000', confidence: 0.99 },
        { label: 'Operating Income', value: '$964,200,000', confidence: 0.98 },
        { label: 'Net Income', value: '$840,200,000', confidence: 0.98 },
        { label: 'Diluted EPS', value: '$4.12', confidence: 0.97 },
      ],
    },
    {
      id: 'doc-103',
      invoiceId: 'INV-2026-9820',
      fileName: 'Enterprise_Hardware_Supplies_Oct.pdf',
      entityName: 'Apex Data Hardware Inc.',
      category: 'Invoice',
      date: '2026-10-23 04:30 PM',
      amount: '$18,400.00',
      fileSize: '320 KB',
      pages: 3,
      status: 'Pending',
      accuracy: 95.0,
      extractedEntities: [
        { label: 'Subtotal', value: '$17,200.00', confidence: 0.96 },
        { label: 'Shipping & Freight', value: '$1,200.00', confidence: 0.94 },
        { label: 'Invoice Total', value: '$18,400.00', confidence: 0.98 },
      ],
    },
    {
      id: 'doc-104',
      invoiceId: 'SEC-10Q-Q3',
      fileName: 'Beta_Tech_Q3_Financial_Statement.pdf',
      entityName: 'Beta Technologies Inc.',
      category: '10-Q Report',
      date: '2026-10-23 01:15 PM',
      amount: '$482.5M Revenue',
      fileSize: '1.9 MB',
      pages: 32,
      status: 'Processed',
      accuracy: 97.9,
      extractedEntities: [
        { label: 'Q3 Revenue', value: '$482,500,000', confidence: 0.98 },
        { label: 'EBITDA', value: '$124,800,000', confidence: 0.97 },
        { label: 'EBITDA Margin', value: '25.8%', confidence: 0.97 },
      ],
    },
    {
      id: 'doc-105',
      invoiceId: 'BS-FY2024-AUD',
      fileName: 'Fiscal_Year_2024_Audited_Balance_Sheet.xlsx',
      entityName: 'Enterprise Financial Holdings',
      category: 'Balance Sheet',
      date: '2026-10-22 11:20 AM',
      amount: '$1.78B Equity',
      fileSize: '890 KB',
      pages: 14,
      status: 'Under Review',
      accuracy: 94.2,
      extractedEntities: [
        { label: 'Current Assets', value: '$1,345,500,000', confidence: 0.95 },
        { label: 'Total Liabilities', value: '$812,400,000', confidence: 0.94 },
        { label: 'Stockholders Equity', value: '$1,780,200,000', confidence: 0.96 },
      ],
    },
    {
      id: 'doc-106',
      invoiceId: 'INV-2026-9740',
      fileName: 'Consulting_Services_Retainer_Sep.pdf',
      entityName: 'Beacon Strategy Partners',
      category: 'Invoice',
      date: '2026-10-21 02:40 PM',
      amount: '$12,500.00',
      fileSize: '245 KB',
      pages: 1,
      status: 'Flagged',
      accuracy: 78.4,
      extractedEntities: [
        { label: 'Reported Total', value: '$12,500.00', confidence: 0.85 },
        { label: 'Calculated Sum', value: '$11,950.00', confidence: 0.80 },
        { label: 'Discrepancy Note', value: '$550 unitemized fee', confidence: 0.91 },
      ],
    },
    {
      id: 'doc-107',
      invoiceId: 'AUD-2025-CPA',
      fileName: 'Independent_Auditor_Compliance_Report.pdf',
      entityName: 'KPMG Audit Services LLP',
      category: 'Audit Report',
      date: '2026-10-20 09:00 AM',
      amount: 'Clean Opinion',
      fileSize: '3.1 MB',
      pages: 42,
      status: 'Processed',
      accuracy: 99.5,
      extractedEntities: [
        { label: 'Audit Opinion', value: 'Unqualified / Clean', confidence: 0.99 },
        { label: 'Internal Controls', value: 'Effective without deficiency', confidence: 0.98 },
      ],
    },
    {
      id: 'doc-108',
      invoiceId: 'INV-2026-9699',
      fileName: 'AWS_Cloud_Infrastructure_Usage.pdf',
      entityName: 'Amazon Web Services LLC',
      category: 'Invoice',
      date: '2026-10-19 03:10 PM',
      amount: '$29,140.22',
      fileSize: '512 KB',
      pages: 6,
      status: 'Processed',
      accuracy: 98.9,
      extractedEntities: [
        { label: 'EC2 Compute Charges', value: '$18,420.10', confidence: 0.99 },
        { label: 'S3 & Database', value: '$8,910.12', confidence: 0.99 },
        { label: 'Network Egress', value: '$1,810.00', confidence: 0.98 },
      ],
    },
  ]);

  // Load existing documents from Supabase 'documents' table
  useEffect(() => {
    async function loadSupabaseDocs() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: DocumentRecord[] = data.map((d: any) => ({
            id: d.id,
            invoiceId: `DOC-${d.id.slice(0, 8).toUpperCase()}`,
            fileName: d.filename,
            entityName: 'Supabase Stored Entity',
            category: d.filename.toLowerCase().includes('10-k')
              ? '10-K Filing'
              : d.filename.toLowerCase().includes('10-q')
              ? '10-Q Report'
              : d.filename.toLowerCase().endsWith('.csv')
              ? 'Balance Sheet'
              : 'Invoice',
            date: new Date(d.created_at).toLocaleDateString() + ' ' + new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            amount: 'Pending Review',
            fileSize: '—',
            pages: 1,
            status: d.status === 'pending' ? 'Pending' : 'Processed',
            accuracy: 98.0,
            extractedEntities: [
              { label: 'Public Storage URL', value: d.file_url, confidence: 1.0 },
              { label: 'Storage Bucket', value: 'financial_documents', confidence: 1.0 },
              { label: 'Database Status', value: d.status, confidence: 1.0 },
            ],
          }));

          setDocuments((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = mapped.filter((m) => !existingIds.has(m.id));
            return [...fresh, ...prev];
          });
        }
      } catch (err) {
        console.error('Failed to load documents from Supabase:', err);
      }
    }

    loadSupabaseDocs();
  }, []);

  // Monthly Chart Mock Data (Last 6 Months)
  const monthlyData = [
    { month: 'May', count: 142, invoices: 85, filings: 35, statements: 22 },
    { month: 'Jun', count: 188, invoices: 110, filings: 48, statements: 30 },
    { month: 'Jul', count: 234, invoices: 135, filings: 62, statements: 37 },
    { month: 'Aug', count: 286, invoices: 165, filings: 78, statements: 43 },
    { month: 'Sep', count: 345, invoices: 198, filings: 95, statements: 52 },
    { month: 'Oct', count: 412, invoices: 242, filings: 112, statements: 58 },
  ];

  const maxMonthlyCount = Math.max(...monthlyData.map((d) => d.count));

  // Top metric card data
  const metricCards = [
    {
      title: 'Total Documents Processed',
      value: '1,428',
      subtitle: '+12.4% vs last month',
      trend: { positive: true, text: '+158 docs' },
      icon: <ArticleIcon sx={{ fontSize: 24 }} className="text-[#1a56db]" />,
      bgIcon: 'bg-blue-50',
      secondary: '1,382 Verified • 46 In Queue',
    },
    {
      title: 'Pending Approvals',
      value: '18',
      subtitle: '3 flagged for manual audit',
      trend: { positive: false, text: 'Requires Review' },
      icon: <HourglassEmptyIcon sx={{ fontSize: 24 }} className="text-amber-600" />,
      bgIcon: 'bg-amber-50',
      secondary: 'Avg Resolution: 2.4h',
    },
    {
      title: 'System Accuracy Rate',
      value: '98.4%',
      subtitle: '+0.6% post fine-tuning',
      trend: { positive: true, text: 'High Confidence' },
      icon: <SecurityIcon sx={{ fontSize: 24 }} className="text-emerald-600" />,
      bgIcon: 'bg-emerald-50',
      secondary: 'OCR Benchmark: 99.1%',
    },
    {
      title: 'Avg Processing Latency',
      value: '1.8s',
      subtitle: '-0.4s faster than baseline',
      trend: { positive: true, text: '85 docs/min' },
      icon: <SpeedIcon sx={{ fontSize: 24 }} className="text-indigo-600" />,
      bgIcon: 'bg-indigo-50',
      secondary: 'Throughput Capacity: 99.8%',
    },
  ];

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [documents, searchTerm, statusFilter, categoryFilter]);

  const handleOpenDetails = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setDetailsDialogOpen(true);
  };

  const handleReprocess = (id: string, name: string) => {
    if (!isAdmin) {
      setSnackbarMessage('Permission Denied: Reprocessing pipeline requires Administrator role.');
      return;
    }
    setSnackbarMessage(`Pipeline re-extraction triggered for ${name} (${id}).`);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) {
      setSnackbarMessage('Permission Denied: Deleting documents requires Administrator role.');
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSnackbarMessage(`Document ${id} successfully archived by Administrator.`);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setSnackbarMessage('Please select or drop a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(25);
      const supabase = createClient();

      // Clean storage path
      const fileExt = selectedFile.name.includes('.') ? selectedFile.name.split('.').pop() : '';
      const cleanBaseName = selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 60);
      const storagePath = `${Date.now()}_${cleanBaseName}${fileExt ? `.${fileExt}` : ''}`;

      setUploadProgress(50);
      // 1. Upload to Supabase Storage bucket 'financial_documents'
      const { error: uploadError } = await supabase.storage
        .from('financial_documents')
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setUploadProgress(75);
      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('financial_documents')
        .getPublicUrl(storagePath);
      const publicUrl = publicUrlData.publicUrl;

      setUploadProgress(90);
      // 3. Insert record into Postgres 'documents' table
      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert({
          filename: selectedFile.name,
          file_url: publicUrl,
          status: 'pending',
        })
        .select('*')
        .single();

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      const newDoc: DocumentRecord = {
        id: dbData.id,
        invoiceId: `DOC-${dbData.id.slice(0, 8).toUpperCase()}`,
        fileName: dbData.filename,
        entityName: uploadEntity || 'Enterprise Corp',
        category: uploadCategory as DocumentRecord['category'],
        date: 'Just now',
        amount: 'Pending Review',
        fileSize: `${(selectedFile.size / 1024).toFixed(0)} KB`,
        pages: 1,
        status: 'Pending',
        accuracy: 95.0,
        extractedEntities: [
          { label: 'Public File URL', value: publicUrl, confidence: 1.0 },
          { label: 'Storage Bucket', value: 'financial_documents', confidence: 1.0 },
          { label: 'Ingestion Status', value: 'pending', confidence: 1.0 },
        ],
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadEntity('');
      setIsUploading(false);
      setUploadProgress(100);
      setSnackbarMessage(`Document "${newDoc.fileName}" successfully uploaded to Supabase Storage and registered with 'pending' status!`);
    } catch (err) {
      console.error('Upload submit error:', err);
      setIsUploading(false);
      setSnackbarMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  };

  const getStatusChip = (status: DocumentRecord['status']) => {
    switch (status) {
      case 'Processed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircleIcon sx={{ fontSize: 13 }} />
            <span>Processed</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <HourglassEmptyIcon sx={{ fontSize: 13 }} />
            <span>Pending</span>
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1a56db] border border-blue-200">
            <SearchIcon sx={{ fontSize: 13 }} />
            <span>Under Review</span>
          </span>
        );
      case 'Flagged':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ErrorOutlinedIcon sx={{ fontSize: 13 }} />
            <span>Flagged</span>
          </span>
        );
    }
  };

  const getCategoryBadge = (category: DocumentRecord['category']) => {
    switch (category) {
      case 'Invoice':
        return <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[11px] font-medium">Invoice</span>;
      case '10-K Filing':
        return <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium">10-K SEC</span>;
      case '10-Q Report':
        return <span className="text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-[11px] font-medium">10-Q Quarterly</span>;
      case 'Balance Sheet':
        return <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">Balance Sheet</span>;
      case 'Audit Report':
        return <span className="text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">Audit Report</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f9fafb] min-h-screen text-slate-900">
      {/* Top Header & Action Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {isAdmin ? 'Admin & Pipeline Operations Dashboard' : 'Financial Document & Analytics Dashboard'}
            </h1>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-blue-50 text-[#1a56db] border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isAdmin ? 'Admin Mode (Full Access)' : 'Staff Mode (Read-Only)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Real-time document ingestion monitoring, OCR validation accuracy, and administrative controls.'
              : 'Read-only document viewing, extraction verification, and monthly analytics.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Tooltip title="Refresh metrics and pipeline logs">
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon fontSize="small" />}
              onClick={() => setSnackbarMessage('Dashboard metrics synchronized with live pipeline.')}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 normal-case rounded-lg py-1.5 px-3"
            >
              Sync
            </Button>
          </Tooltip>

          {isAdmin ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<CloudUploadIcon fontSize="small" />}
              onClick={() => setUploadDialogOpen(true)}
              sx={{
                bgcolor: '#1a56db',
                '&:hover': { bgcolor: '#1545b0' },
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
                py: 0.8,
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              Upload Document
            </Button>
          ) : (
            <Tooltip title="Uploading documents requires Administrator role">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled
                  startIcon={<LockOutlinedIcon fontSize="small" />}
                  className="text-xs border-slate-200 text-slate-400 normal-case rounded-lg py-1.5 px-3"
                >
                  Upload (Admin Only)
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* ============================================================= */}
        {/* 1. TOP METRIC CARDS                                            */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, idx) => (
            <Paper
              key={idx}
              elevation={0}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {card.value}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                        card.trend.positive
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-amber-700 bg-amber-50'
                      }`}
                    >
                      {card.trend.text}
                    </span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${card.bgIcon}`}>
                  {card.icon}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{card.subtitle}</span>
                <span className="text-[11px] font-mono text-slate-400">{card.secondary}</span>
              </div>
            </Paper>
          ))}
        </div>

        {/* ============================================================= */}
        {/* 2. DUMMY BAR CHART: Documents Processed by Month               */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart (2 cols) */}
          <Paper
            elevation={0}
            className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChartIcon className="text-[#1a56db]" />
                    <h2 className="text-base font-bold text-slate-900">
                      Documents Processed by Month
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly ingestion volume breakdown across SEC filings, commercial invoices, and statements.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#1a56db]"></span>
                    <span>Invoices</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#60a5fa]"></span>
                    <span>SEC 10-K/Q</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-300"></span>
                    <span>Statements</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="relative pt-6 pb-2">
                {/* Horizontal reference grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                  <div className="border-b border-dashed border-slate-400 w-full"></div>
                  <div className="border-b border-slate-300 w-full"></div>
                </div>

                {/* Bars Grid */}
                <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-56 relative z-10 px-2">
                  {monthlyData.map((item, index) => {
                    const heightPercent = Math.round((item.count / maxMonthlyCount) * 100);
                    const isLatest = index === monthlyData.length - 1;

                    return (
                      <div
                        key={item.month}
                        className="flex flex-col items-center h-full justify-end group cursor-pointer"
                        onClick={() => setSelectedMonth(item.month)}
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 mb-2 px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none text-center">
                          <p className="font-bold">{item.count} total</p>
                          <p className="text-slate-300">Inv: {item.invoices} | SEC: {item.filings}</p>
                        </div>

                        {/* Stacked Bar */}
                        <div className="w-full max-w-[48px] flex flex-col justify-end rounded-t-lg overflow-hidden transition-all duration-300 group-hover:brightness-105 shadow-2xs"
                             style={{ height: `${heightPercent}%` }}>
                          {/* Segment: Statements */}
                          <div
                            className="w-full bg-slate-300 transition-all"
                            style={{ height: `${(item.statements / item.count) * 100}%` }}
                          />
                          {/* Segment: SEC Filings */}
                          <div
                            className="w-full bg-[#60a5fa] transition-all"
                            style={{ height: `${(item.filings / item.count) * 100}%` }}
                          />
                          {/* Segment: Invoices */}
                          <div
                            className={`w-full ${isLatest ? 'bg-[#1a56db]' : 'bg-[#2563eb]'} transition-all`}
                            style={{ height: `${(item.invoices / item.count) * 100}%` }}
                          />
                        </div>

                        {/* Month Label */}
                        <span className={`text-xs mt-3 font-semibold ${isLatest ? 'text-[#1a56db]' : 'text-slate-600'}`}>
                          {item.month}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Peak ingestion observed during Q3 filing window (October: +19.4% MoM)</span>
              <span className="font-semibold text-slate-800">YTD Volume: 1,607 Documents</span>
            </div>
          </Paper>

          {/* Pipeline Compliance & Accuracy Card (1 col) */}
          <Paper
            elevation={0}
            className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Pipeline Health &amp; OCR
                </h2>
                <Chip
                  label="All Systems Normal"
                  size="small"
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                />
              </div>

              {/* Progress Gauges */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Financial Table Extraction</span>
                    <span className="font-bold text-slate-900">99.1%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '99.1%' }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400">Trained on audited SEC tables</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Invoice Line-Item Matching</span>
                    <span className="font-bold text-slate-900">97.8%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#1a56db] rounded-full" style={{ width: '97.8%' }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400">Automated subtotal reconciliation</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">Vector Index Chunking</span>
                    <span className="font-bold text-slate-900">100.0%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400">1,428 documents / 4,820 chunks</span>
                </div>
              </div>

              <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-semibold mb-1">
                  <CheckIcon fontSize="inherit" className="text-emerald-600" />
                  <span>Audit Trail Compliant</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Every extracted figure retains source document page coordinates and confidence metadata.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Model: Gemini 1.5 Pro + Azure OCR</span>
              <Link href="/chat" className="text-[#1a56db] font-semibold hover:underline">
                Ask in Chat →
              </Link>
            </div>
          </Paper>
        </div>

        {/* ============================================================= */}
        {/* 3. RECENT DOCUMENT UPLOADS DATA TABLE                           */}
        {/* ============================================================= */}
        <Paper
          elevation={0}
          className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden"
        >
          {/* Table Header & Search Filter Bar */}
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Recent Document Uploads &amp; Ingestion
                </h2>
                <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-full">
                  {filteredDocuments.length} files
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit table displaying recent invoices, 10-K filings, extraction scores, and administrative actions.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {(['All', 'Processed', 'Pending', 'Under Review', 'Flagged'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[#1a56db] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Category Filter Sub-bar */}
          <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <TextField
                size="small"
                fullWidth
                placeholder="Search Invoice ID, Entity, or File..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" className="text-slate-400" />
                      </InputAdornment>
                    ),
                    sx: {
                      bgcolor: '#ffffff',
                      borderRadius: 2,
                      fontSize: '0.8125rem',
                    },
                  },
                }}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <FormControl size="small" className="min-w-[150px]">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  displayEmpty
                  sx={{
                    bgcolor: '#ffffff',
                    borderRadius: 2,
                    fontSize: '0.8125rem',
                  }}
                >
                  <MenuItem value="All">All Categories</MenuItem>
                  <MenuItem value="Invoice">Invoices</MenuItem>
                  <MenuItem value="10-K Filing">10-K Filings</MenuItem>
                  <MenuItem value="10-Q Report">10-Q Reports</MenuItem>
                  <MenuItem value="Balance Sheet">Balance Sheets</MenuItem>
                  <MenuItem value="Audit Report">Audit Reports</MenuItem>
                </Select>
              </FormControl>

              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon fontSize="small" />}
                onClick={() => setSnackbarMessage('Document list exported as CSV.')}
                className="text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-100 normal-case rounded-lg py-1.5 px-3 whitespace-nowrap"
              >
                Export
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow className="bg-slate-50">
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Invoice / File ID</TableCell>
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Document &amp; Entity</TableCell>
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Category</TableCell>
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Upload Date</TableCell>
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Extracted Amount</TableCell>
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Status</TableCell>
                  <TableCell className="font-bold text-xs text-slate-700 py-3.5">Accuracy</TableCell>
                  <TableCell align="right" className="font-bold text-xs text-slate-700 py-3.5">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" className="py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <DescriptionIcon sx={{ fontSize: 40 }} className="text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No documents found matching filters</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try resetting the search keyword or status filter.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      hover
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      {/* Invoice ID */}
                      <TableCell className="font-mono text-xs font-semibold text-[#1a56db]">
                        <div className="flex items-center gap-1.5">
                          <span>{doc.invoiceId}</span>
                          <Tooltip title="Copy ID">
                            <IconButton
                              size="small"
                              onClick={() => {
                                navigator.clipboard.writeText(doc.invoiceId);
                                setSnackbarMessage(`Copied ${doc.invoiceId} to clipboard.`);
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                            >
                              <ContentCopyIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>

                      {/* File Name & Entity */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-slate-900 truncate max-w-[220px]">
                            {doc.fileName}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[220px]">
                            {doc.entityName} • {doc.pages} pgs ({doc.fileSize})
                          </span>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>{getCategoryBadge(doc.category)}</TableCell>

                      {/* Upload Date */}
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {doc.date}
                      </TableCell>

                      {/* Extracted Amount */}
                      <TableCell className="text-xs font-semibold text-slate-900 font-mono">
                        {doc.amount || '—'}
                      </TableCell>

                      {/* Status */}
                      <TableCell>{getStatusChip(doc.status)}</TableCell>

                      {/* Accuracy Score */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-semibold font-mono text-slate-700">
                          <span>{doc.accuracy}%</span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip title="View extraction details">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDetails(doc)}
                              className="text-slate-500 hover:text-[#1a56db] p-1.5 hover:bg-blue-50"
                            >
                              <VisibilityIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={isAdmin ? "Reprocess document" : "Reprocessing requires Administrator role"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!isAdmin}
                                onClick={() => handleReprocess(doc.id, doc.fileName)}
                                className={
                                  isAdmin
                                    ? "text-slate-500 hover:text-amber-600 p-1.5 hover:bg-amber-50"
                                    : "text-slate-300 p-1.5 cursor-not-allowed"
                                }
                              >
                                <RefreshIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title={isAdmin ? "Delete record" : "Deleting documents requires Administrator role"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!isAdmin}
                                onClick={() => handleDelete(doc.id)}
                                className={
                                  isAdmin
                                    ? "text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50"
                                    : "text-slate-300 p-1.5 cursor-not-allowed"
                                }
                              >
                                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredDocuments.length} of {documents.length} recorded documents
            </span>
            <div className="flex items-center gap-2">
              <Button size="small" disabled className="text-xs normal-case text-slate-400">
                Previous
              </Button>
              <Button size="small" disabled className="text-xs normal-case text-slate-400">
                Next
              </Button>
            </div>
          </div>
        </Paper>
      </div>

      {/* ============================================================= */}
      {/* 4. MODAL: Document Details View Dialog                         */}
      {/* ============================================================= */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
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
        {selectedDoc && (
          <>
            <DialogTitle className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a56db] flex items-center justify-center">
                  <ArticleIcon fontSize="small" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedDoc.fileName}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {selectedDoc.invoiceId}
                  </span>
                </div>
              </div>
              <IconButton size="small" onClick={() => setDetailsDialogOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent className="py-4 space-y-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Entity</span>
                  <span className="font-semibold text-slate-800">{selectedDoc.entityName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Category</span>
                  <span className="font-semibold text-slate-800">{selectedDoc.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Pages &amp; Size</span>
                  <span className="font-semibold text-slate-800">{selectedDoc.pages} pages ({selectedDoc.fileSize})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status</span>
                  <div>{getStatusChip(selectedDoc.status)}</div>
                </div>
              </div>

              {/* Extracted Key-Value Entities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Extracted Financial Entities &amp; Confidence
                  </h4>
                  <span className="text-xs text-emerald-700 font-semibold font-mono bg-emerald-50 px-2 py-0.5 rounded">
                    Overall Accuracy: {selectedDoc.accuracy}%
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {selectedDoc.extractedEntities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{item.label}</p>
                        <p className="text-[11px] text-slate-500">Verified against OCR tabular schedule</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 block">
                          {item.value}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-mono">
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>

            <DialogActions className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <Link
                href="/chat"
                className="no-underline"
                onClick={() => setDetailsDialogOpen(false)}
              >
                <Button
                  size="small"
                  variant="outlined"
                  className="text-xs border-[#1a56db] text-[#1a56db] normal-case"
                >
                  Analyze with Chat Agent →
                </Button>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  onClick={() => setDetailsDialogOpen(false)}
                  className="text-xs text-slate-600 normal-case"
                >
                  Close
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<FileDownloadIcon fontSize="small" />}
                  onClick={() => {
                    setSnackbarMessage(`Downloaded extracted schema for ${selectedDoc.invoiceId}.`);
                    setDetailsDialogOpen(false);
                  }}
                  sx={{
                    bgcolor: '#1a56db',
                    '&:hover': { bgcolor: '#1545b0' },
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: '0.8125rem',
                  }}
                >
                  Download Extracted JSON
                </Button>
              </div>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ============================================================= */}
      {/* 5. MODAL: Upload New Document Dialog                           */}
      {/* ============================================================= */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
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
            <CloudUploadIcon className="text-[#1a56db]" />
            <h3 className="text-base font-bold text-slate-900">
              Upload New Financial Document
            </h3>
          </div>
          <IconButton size="small" onClick={() => setUploadDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="py-4 space-y-4">
          <p className="text-xs text-slate-500">
            Upload financial PDF filings, balance sheet spreadsheets, or commercial invoices to trigger OCR and vector indexing.
          </p>

          {/* Drag & Drop File Zone */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDashboardDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              setDashboardDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDashboardDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDashboardDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const dropped = e.dataTransfer.files[0];
                setSelectedFile(dropped);
                if (dropped.name.toLowerCase().endsWith('.csv')) {
                  setUploadCategory('Balance Sheet');
                } else if (dropped.name.toLowerCase().includes('10-k')) {
                  setUploadCategory('10-K Filing');
                } else if (dropped.name.toLowerCase().includes('10-q')) {
                  setUploadCategory('10-Q Report');
                }
              }
            }}
            className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dashboardDragging
                ? 'border-[#1a56db] bg-blue-50/80 ring-2 ring-blue-100 scale-[1.01]'
                : 'border-slate-300 hover:border-[#1a56db] bg-slate-50'
            }`}
            onClick={() => document.getElementById('dashboard-file-upload')?.click()}
          >
            <input
              id="dashboard-file-upload"
              type="file"
              accept=".pdf,.xlsx,.csv,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const dropped = e.target.files[0];
                  setSelectedFile(dropped);
                  if (dropped.name.toLowerCase().endsWith('.csv')) {
                    setUploadCategory('Balance Sheet');
                  }
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1a56db] flex items-center justify-center mb-2">
              <CloudUploadIcon />
            </div>
            {selectedFile ? (
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#1a56db] font-mono">
                    {selectedFile.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(0)} KB • Click or drop another file to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {dashboardDragging ? 'Drop PDF or CSV file here' : 'Click to select file or drag & drop'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PDF (SEC 10-K/Q, Invoices) and CSV (Balance Sheets, Max 25 MB)
                </p>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <FormControl fullWidth size="small">
              <InputLabel>Document Category</InputLabel>
              <Select
                value={uploadCategory}
                label="Document Category"
                onChange={(e) => setUploadCategory(e.target.value)}
                sx={{ borderRadius: 2, fontSize: '0.8125rem' }}
              >
                <MenuItem value="Invoice">Commercial Invoice</MenuItem>
                <MenuItem value="10-K Filing">SEC 10-K Annual Report</MenuItem>
                <MenuItem value="10-Q Report">SEC 10-Q Quarterly Report</MenuItem>
                <MenuItem value="Balance Sheet">Balance Sheet &amp; P&amp;L</MenuItem>
                <MenuItem value="Audit Report">Audit Compliance Report</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              fullWidth
              label="Entity / Organization Name"
              placeholder="e.g. Acme Corporation LLC"
              value={uploadEntity}
              onChange={(e) => setUploadEntity(e.target.value)}
              slotProps={{
                input: {
                  sx: { borderRadius: 2, fontSize: '0.8125rem' },
                },
              }}
            />
          </div>
          {/* Bucket Info Badge */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              Target Bucket: <strong className="font-mono text-slate-800">financial_documents</strong>
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
              Supabase Storage Active
            </span>
          </div>

          {/* Loading Indicator */}
          {isUploading && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Uploading to Supabase &amp; Postgres...</span>
                <span className="font-mono font-bold text-[#1a56db]">{uploadProgress}%</span>
              </div>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: '#f1f5f9',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#1a56db',
                    borderRadius: 3,
                  },
                }}
              />
            </div>
          )}
        </DialogContent>

        <DialogActions className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <Button
            size="small"
            disabled={isUploading}
            onClick={() => setUploadDialogOpen(false)}
            className="text-xs text-slate-600 normal-case"
          >
            Cancel
          </Button>

          <Button
            size="small"
            variant="contained"
            disabled={isUploading || !selectedFile}
            onClick={handleUploadSubmit}
            startIcon={isUploading ? <CircularProgress size={14} sx={{ color: '#ffffff' }} /> : <CloudUploadIcon fontSize="small" />}
            sx={{
              bgcolor: '#1a56db',
              '&:hover': { bgcolor: '#1545b0' },
              '&.Mui-disabled': { bgcolor: '#94a3b8', color: '#ffffff' },
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
            }}
          >
            {isUploading ? 'Uploading to Supabase...' : 'Upload & Register Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notification */}
      <Snackbar
        open={Boolean(snackbarMessage)}
        autoHideDuration={4000}
        onClose={() => setSnackbarMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarMessage(null)}
          severity="success"
          sx={{
            width: '100%',
            bgcolor: '#0f172a',
            color: '#ffffff',
            borderRadius: 2,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            '& .MuiAlert-icon': { color: '#34d399' },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
