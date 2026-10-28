'use client';

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography,
  Button,
  Paper,
  Chip,
  Tooltip,
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TableChartIcon from '@mui/icons-material/TableChart';
import SecurityIcon from '@mui/icons-material/Security';
import MemoryIcon from '@mui/icons-material/Memory';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user, role, isAdmin, signOut, session, supabaseUser } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  // Authenticated state (checked against Supabase session or active user profile)
  const isSignedIn = Boolean(session?.user || supabaseUser);

  // Sample Interactive Demo Data for the Hero Showcase
  const sampleRows = [
    { id: 'LN-109449', borrower: 'Meridian Capital Partners', amount: 55500, rate: '10.00%', term: '60 mos', status: 'Charged Off', risk: 'High' },
    { id: 'LN-106299', borrower: 'Apex Logistics Corp', amount: 55500, rate: '10.00%', term: '60 mos', status: 'Charged Off', risk: 'High' },
    { id: 'LN-104499', borrower: 'Beacon Health Systems', amount: 55250, rate: '9.50%', term: '60 mos', status: 'Charged Off', risk: 'High' },
    { id: 'LN-102812', borrower: 'Vanguard Industrial LLC', amount: 52000, rate: '8.75%', term: '36 mos', status: '30-Days Late', risk: 'Moderate' },
    { id: 'LN-101140', borrower: 'Summit Retail Holdings', amount: 48500, rate: '7.25%', term: '36 mos', status: 'Current', risk: 'Low' },
  ];

  const filteredDemoRows = sampleRows
    .filter((r) =>
      r.borrower.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      r.status.toLowerCase().includes(filterQuery.toLowerCase())
    )
    .sort((a, b) => (sortAsc ? a.amount - b.amount : b.amount - a.amount));

  const totalFilteredAmount = filteredDemoRows.reduce((acc, curr) => acc + curr.amount, 0);

  const platformCapabilities = [
    {
      title: '10,000+ Row Tabular Engine',
      desc: 'High-speed streaming parser for large CSV and multi-sheet Excel files. Computes exact totals, averages, and delinquency rates in < 150ms without token limits.',
      badge: 'High Performance',
      icon: <CalculateIcon className="text-[#1a56db]" fontSize="small" />,
    },
    {
      title: 'Senior Banking Analyst Persona',
      desc: 'Audit-ready responses structured with comprehensive executive text summaries first, mathematical formulas, risk assessments, and interactive schedules.',
      badge: 'Audit Grade',
      icon: <AutoAwesomeIcon className="text-amber-600" fontSize="small" />,
    },
    {
      title: 'Zero-Hallucination Math',
      desc: 'Deterministic backend tools calculate loan portfolios, interest margins, and EBITDA reconciliations with 100% exact numerical precision.',
      badge: 'Exact Arithmetic',
      icon: <FactCheckIcon className="text-purple-600" fontSize="small" />,
    },
    {
      title: 'Multi-Document Cross-Referencing',
      desc: 'Join and reconcile disparate filings (e.g. Invoices against Payment Ledgers, or Form 10-K vs 10-Q) to flag variances and missing items automatically.',
      badge: 'Reconciliation',
      icon: <CompareArrowsIcon className="text-emerald-600" fontSize="small" />,
    },
    {
      title: 'Interactive GenUI Tables',
      desc: 'Dynamic schedules with client-side column sorting, instant live search filtering, summary KPI chips, and dedicated bottom totals rows.',
      badge: 'Interactive UI',
      icon: <TableChartIcon className="text-sky-600" fontSize="small" />,
    },
    {
      title: 'Enterprise Role Security (RBAC)',
      desc: 'Strict role separation between Administrator privileges (document deletion, ingestion pipelines, audit exports) and Staff Analyst conversational query access.',
      badge: 'RBAC Security',
      icon: <SecurityIcon className="text-rose-600" fontSize="small" />,
    },
  ];

  const documentFormats = [
    {
      name: 'SEC Filings & Reports',
      type: 'PDF Format',
      formats: '.pdf',
      desc: '10-K Annual Reports, 10-Q Quarterlies, 8-K Disclosures, and Audit Opinions with footnote citations.',
      icon: <PictureAsPdfIcon sx={{ fontSize: 28 }} className="text-rose-500" />,
      color: 'bg-rose-50 border-rose-100',
    },
    {
      name: 'Financial Datasets',
      type: 'CSV Format',
      formats: '.csv',
      desc: 'Transaction ledgers, loan facilities, and credit portfolios with 10,000+ rows parsed in milliseconds.',
      icon: <GridOnIcon sx={{ fontSize: 28 }} className="text-emerald-500" />,
      color: 'bg-emerald-50 border-emerald-100',
    },
    {
      name: 'Financial Workbooks',
      type: 'Excel Format',
      formats: '.xlsx, .xls',
      desc: 'Multi-sheet balance sheets, income statements, and cash flow forecasts with formula preservation.',
      icon: <TableChartIcon sx={{ fontSize: 28 }} className="text-blue-500" />,
      color: 'bg-blue-50 border-blue-100',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Enterprise Navigation Bar (Width: 1700px) */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1a56db] to-[#2563eb] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <AccountBalanceIcon fontSize="small" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 leading-tight">
                  FinAgent AI
                </span>
                <span className="text-[10px] font-bold text-[#1a56db] bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-mono">
                  v2.0 Enterprise
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                AI Financial Analyst &amp; Document Intelligence Platform
              </span>
            </div>
          </div>

          {/* Quick Actions & Dynamic Auth Button (Sign In -> Sign Out) */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] text-emerald-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>10k+ Row Tabular Engine Operational</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs">
              <span className="text-slate-500">Role:</span>
              <Chip
                label={role}
                size="small"
                color={role === 'Admin' ? 'primary' : 'success'}
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
              />
            </div>

            {isAdmin && (
              <Link to="/dashboard" className="no-underline hidden sm:block">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DashboardIcon fontSize="small" />}
                  sx={{
                    borderColor: '#cbd5e1',
                    color: '#334155',
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  Dashboard
                </Button>
              </Link>
            )}

            {/* DYNAMIC SIGN IN / SIGN OUT BUTTON */}
            {isSignedIn ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<LogoutIcon fontSize="small" />}
                onClick={async () => {
                  await signOut();
                }}
                sx={{
                  borderColor: '#fca5a5',
                  color: '#dc2626',
                  bgcolor: '#ffffff',
                  '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444' },
                  textTransform: 'none',
                  borderRadius: 2,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  px: 1.5,
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Link to="/login" className="no-underline">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LoginIcon fontSize="small" />}
                  sx={{
                    borderColor: '#cbd5e1',
                    color: '#334155',
                    bgcolor: '#ffffff',
                    '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    px: 1.5,
                  }}
                >
                  Sign In
                </Button>
              </Link>
            )}

            <Link to="/chat" className="no-underline">
              <Button
                size="small"
                variant="contained"
                endIcon={<ArrowForwardIcon fontSize="small" />}
                sx={{
                  bgcolor: '#1a56db',
                  '&:hover': { bgcolor: '#1545b0' },
                  textTransform: 'none',
                  borderRadius: 2,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  px: 2,
                  boxShadow: '0 4px 12px rgba(26, 86, 219, 0.25)',
                }}
              >
                Launch Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body (Width: 1700px across every section) */}
      <main className="flex-1 max-w-[1700px] mx-auto w-full px-4 sm:px-8 py-10 sm:py-16 space-y-16">
        {/* ============================================================= */}
        {/* 1. HERO SECTION (1700px max width)                            */}
        {/* ============================================================= */}
        <section className="text-center max-w-[1700px] mx-auto space-y-6 flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/90 text-[#1a56db] text-xs font-semibold shadow-2xs">
            <AutoAwesomeIcon sx={{ fontSize: 14 }} />
            <span>Senior Banking Analyst • 10,000+ Row Tabular Processing • Zero Hallucination</span>
          </div>

          <Typography
            variant="h1"
            align="center"
            style={{ textAlign: 'center' }}
            sx={{ textAlign: 'center', mx: 'auto' }}
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] max-w-5xl mx-auto text-center"
          >
            Institutional-Grade AI for <span className="text-[#1a56db]">Financial Documents</span> &amp; Portfolios
          </Typography>

          <Typography
            variant="body1"
            align="center"
            style={{ textAlign: 'center' }}
            sx={{ textAlign: 'center', mx: 'auto' }}
            className="text-base sm:text-xl text-slate-600 leading-relaxed max-w-4xl mx-auto font-normal text-center"
          >
            Ingest and cross-reference high-volume CSVs, Excel workbooks (10,000+ rows), and SEC filings (PDF).
            Get verifiable totals, loan summaries, averages, and delinquency rates with a senior banking analyst tone
            and interactive GenUI schedules.
          </Typography>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/chat" className="no-underline">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#1a56db',
                  '&:hover': { bgcolor: '#1545b0' },
                  textTransform: 'none',
                  borderRadius: 3,
                  py: 1.4,
                  px: 3.5,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxShadow: '0 6px 20px rgba(26, 86, 219, 0.3)',
                }}
              >
                Start Financial Analysis
              </Button>
            </Link>

            <Link to="/dashboard" className="no-underline">
              <Button
                variant="outlined"
                size="large"
                startIcon={<DashboardIcon />}
                sx={{
                  borderColor: '#cbd5e1',
                  color: '#1e293b',
                  bgcolor: '#ffffff',
                  '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                  textTransform: 'none',
                  borderRadius: 3,
                  py: 1.4,
                  px: 3,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Open Operations Dashboard
              </Button>
            </Link>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 2. LIVE METRIC STATS (1700px max width)                       */}
        {/* ============================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1700px] mx-auto">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center transition-transform hover:-translate-y-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#1a56db] font-mono block">
              10,000+
            </span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">Rows Per Dataset</span>
            <span className="text-[11px] text-slate-500">Streaming parse in &lt;150ms</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center transition-transform hover:-translate-y-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 font-mono block">
              100.0%
            </span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">Arithmetic Accuracy</span>
            <span className="text-[11px] text-slate-500">Deterministic tool calculations</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center transition-transform hover:-translate-y-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-purple-600 font-mono block">
              Multi-Doc
            </span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">Cross-Referencing</span>
            <span className="text-[11px] text-slate-500">Reconcile PDF, CSV &amp; Excel</span>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center transition-transform hover:-translate-y-0.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 font-mono block">
              GenUI
            </span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">Interactive Schedules</span>
            <span className="text-[11px] text-slate-500">Sorting, filtering, and totals</span>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 3. LIVE INTERACTIVE SHOWCASE PREVIEW (1700px max width)        */}
        {/* ============================================================= */}
        <section className="max-w-[1700px] mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1a56db]" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">
                Live Interface Preview: Senior Banking Analyst Response
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Gemini 2.5 Flash • 768-dim Vector RAG</span>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Window Topbar */}
            <div className="px-6 py-3.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="text-xs font-semibold text-slate-700 ml-2 font-mono">
                  Financial Analyst Session • Commercial_Loan_Portfolio_10k.csv
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-medium">
                Audit Status: 100% Reconciled
              </span>
            </div>

            {/* Simulated Chat Content */}
            <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-b from-white to-slate-50/50">
              {/* User Prompt */}
              <div className="flex justify-end">
                <div className="max-w-2xl bg-[#1a56db] text-white p-4 sm:p-5 rounded-2xl rounded-tr-xs shadow-xs text-xs sm:text-sm">
                  <p className="font-medium">
                    &quot;Audit our 10,482-row Commercial Loan Portfolio. Compute total commitments, average balance, delinquency percentage, and top charged-off accounts.&quot;
                  </p>
                </div>
              </div>

              {/* Agent Response */}
              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1a56db] to-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <AccountBalanceIcon sx={{ fontSize: 18 }} />
                </div>

                <div className="flex-1 space-y-5">
                  {/* Executive Text Commentary */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <div className="flex items-center gap-2 text-[#1a56db] font-bold text-sm sm:text-base">
                      <FactCheckIcon sx={{ fontSize: 20 }} />
                      <span>Executive Financial Audit: Commercial Loan Portfolio</span>
                    </div>

                    <p>
                      A comprehensive mathematical audit was completed across all <strong>10,482 loan facilities</strong>.
                      Portfolio performance indicates healthy primary coverage with concentrated credit risk in prolonged delinquent segments:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-2">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Total Principal Balance</span>
                        <span className="text-lg font-bold text-slate-900 font-mono">$148,290,120.00</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 block">Average Facility Size</span>
                        <span className="text-lg font-bold text-slate-900 font-mono">$14,147.12</span>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                        <span className="text-[11px] text-rose-700 block">Delinquency Rate</span>
                        <span className="text-lg font-bold text-rose-900 font-mono">3.18% ($4.71M)</span>
                      </div>
                    </div>

                    <p className="font-mono text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {'$$\\text{Delinquency Ratio} = \\frac{\\text{Delinquent Balance (\\$4,715,626.00)}}{\\text{Total Portfolio Commitment (\\$148,290,120.00)}} = 3.18\\%$$'}
                    </p>
                  </div>

                  {/* Interactive GenUI Table Component */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TableChartIcon sx={{ fontSize: 16 }} className="text-[#1a56db]" />
                        <span className="font-bold text-xs sm:text-sm text-slate-800">
                          Charged-Off Facility Breakdown (Interactive Schedule)
                        </span>
                        <span className="text-[10px] font-mono bg-blue-50 text-[#1a56db] border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                          GenUI Table
                        </span>
                      </div>

                      {/* Interactive Controls inside Demo */}
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <input
                            type="text"
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            placeholder="Filter borrower..."
                            className="text-[11px] px-2.5 py-1 pl-7 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 text-slate-700"
                          />
                          <SearchIcon sx={{ fontSize: 13 }} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setSortAsc(!sortAsc)}
                          className="text-[11px] font-mono px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer text-slate-700 font-medium"
                        >
                          Sort Amount: {sortAsc ? '▲ Asc' : '▼ Desc'}
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase font-mono border-b border-slate-200">
                            <th className="px-4 py-2.5">Loan ID</th>
                            <th className="px-4 py-2.5">Borrower Name</th>
                            <th className="px-4 py-2.5">Principal Balance</th>
                            <th className="px-4 py-2.5">Interest Rate</th>
                            <th className="px-4 py-2.5">Facility Term</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredDemoRows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{r.id}</td>
                              <td className="px-4 py-2.5 text-slate-700">{r.borrower}</td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                ${r.amount.toLocaleString()}.00
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-600">{r.rate}</td>
                              <td className="px-4 py-2.5 text-slate-600">{r.term}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  r.status === 'Charged Off'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : r.status.includes('Late')
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                            <td className="px-4 py-2.5 font-mono">Summary Total</td>
                            <td className="px-4 py-2.5 text-slate-600 font-normal">{filteredDemoRows.length} facilities shown</td>
                            <td className="px-4 py-2.5 font-mono text-[#1a56db]">
                              ${totalFilteredAmount.toLocaleString()}.00
                            </td>
                            <td colSpan={3} className="px-4 py-2.5 text-slate-500 font-normal">
                              Computed via Tabular Deterministic Engine
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 4. SUPPORTED DOCUMENT FORMATS (1700px max width)              */}
        {/* ============================================================= */}
        <section className="max-w-[1700px] mx-auto space-y-5">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 style={{ textAlign: 'center' }} className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
              Multimodal Document Ingestion Pipeline
            </h2>
            <p style={{ textAlign: 'center' }} className="text-xs sm:text-sm text-slate-500 text-center">
              Direct integration with Supabase Storage, Vector embeddings (768-dim), and memory-efficient streaming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1700px] mx-auto">
            {documentFormats.map((fmt, idx) => (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-[#1a56db] hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3.5 rounded-2xl ${fmt.color} border`}>
                      {fmt.icon}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                      {fmt.formats}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1.5">{fmt.name}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{fmt.desc}</p>
                </div>
                <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1a56db]">
                  <span>Supported Engine</span>
                  <CheckCircleIcon sx={{ fontSize: 18 }} className="text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* 5. 6 CORE PRODUCTION CAPABILITIES (1700px max width)          */}
        {/* ============================================================= */}
        <section className="max-w-[1700px] mx-auto space-y-5">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h2 style={{ textAlign: 'center' }} className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">
              Core Enterprise Capabilities
            </h2>
            <p style={{ textAlign: 'center' }} className="text-xs sm:text-sm text-slate-500 text-center">
              Engineered for financial institutions, hedge funds, accounting firms, and compliance teams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-[1700px] mx-auto">
            {platformCapabilities.map((item, idx) => (
              <Paper
                key={idx}
                elevation={0}
                className="p-6 sm:p-7 border border-slate-200/90 rounded-2xl bg-white flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                    Active in Production
                  </span>
                </div>
              </Paper>
            ))}
          </div>
        </section>

        {/* ============================================================= */}
        {/* 6. CTA BANNER (1700px max width)                              */}
        {/* ============================================================= */}
        <section className="rounded-3xl bg-gradient-to-r from-[#1a56db] via-[#1e40af] to-[#1e3a8a] text-white p-8 sm:p-12 max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to analyze your financial documents?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-2xl">
              Upload loan ledgers, corporate SEC filings, or commercial billing invoices and begin interactive conversational analysis instantly.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/chat" className="no-underline">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#1a56db',
                  '&:hover': { bgcolor: '#f8fafc' },
                  textTransform: 'none',
                  borderRadius: 2.5,
                  py: 1.3,
                  px: 3.5,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                Open Financial Chat
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer (1700px max width) */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500 space-y-3">
        <div className="max-w-[1700px] mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <SecurityIcon sx={{ fontSize: 14 }} className="text-slate-400" />
              256-bit AES Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <MemoryIcon sx={{ fontSize: 14 }} className="text-slate-400" />
              Google Gemini 768-dim Vector Embeddings
            </span>
            <span className="flex items-center gap-1.5">
              <AdminPanelSettingsIcon sx={{ fontSize: 14 }} className="text-slate-400" />
              Role-Based Access Control (RBAC)
            </span>
          </div>
          <p className="text-slate-400 pt-1">
            FinAgent AI — <strong>Smart Conversational Agent for Financial Document Processing</strong> • Enterprise Edition v2.0
          </p>
        </div>
      </footer>
    </div>
  );
}
