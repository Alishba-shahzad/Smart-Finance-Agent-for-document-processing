'use client';

import React from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  Box,
  Divider,
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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { role } = useAuth();

  const platformCapabilities = [
    {
      title: 'Multimodal Document Ingestion',
      desc: 'Automated OCR extraction, tabular layout reconstruction, and key-value entity parsing for SEC 10-K/Q filings, balance sheets, and commercial invoices.',
      badge: 'OCR & Layout Engine',
      icon: <TableChartIcon className="text-[#1a56db]" fontSize="small" />,
    },
    {
      title: 'Dynamic GenUI Visualizations',
      desc: 'Interactive financial bar charts, YoY comparative balance sheet tables, and forensic audit widgets rendered seamlessly inside conversational streams.',
      badge: 'Generative UI',
      icon: <AutoAwesomeIcon className="text-amber-600" fontSize="small" />,
    },
    {
      title: 'Forensic Discrepancy Auditing',
      desc: 'Deterministic arithmetic checks verifying line-item sums against reported payable balances, highlighting unauthorized fees and contract variances.',
      badge: 'Forensic Audit',
      icon: <FactCheckIcon className="text-purple-600" fontSize="small" />,
    },
    {
      title: 'Enterprise Vector Knowledge Base',
      desc: 'Semantic chunking and 1536-dimensional embeddings with direct footnote citations, grounded SEC item references, and zero-hallucination guardrails.',
      badge: 'RAG Grounding',
      icon: <MemoryIcon className="text-emerald-600" fontSize="small" />,
    },
    {
      title: 'Role-Based Access Control (RBAC)',
      desc: 'Granular persona isolation separating Administrator privileges (document deletion, ingestion pipelines, audit exports) from Staff Analyst query access.',
      badge: 'RBAC Security',
      icon: <SecurityIcon className="text-rose-600" fontSize="small" />,
    },
    {
      title: 'Verifiable Audit Trail & Metrics',
      desc: 'Comprehensive operational logging, extraction confidence scores, and forensic inspection records ensuring regulatory and accounting compliance.',
      badge: 'Compliance Ready',
      icon: <HistoryEduIcon className="text-sky-600" fontSize="small" />,
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a56db] text-white flex items-center justify-center shadow-md">
              <AccountBalanceIcon fontSize="small" />
            </div>
            <div>
              <Typography variant="subtitle1" className="font-bold leading-tight text-slate-900">
                FinAgent AI
              </Typography>
              <Typography variant="caption" className="text-slate-500 block">
                Enterprise Financial Document Intelligence Platform
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-slate-500">Current Role:</span>
              <Chip
                label={role}
                size="small"
                color={role === 'Admin' ? 'primary' : 'success'}
                className="font-semibold text-xs"
              />
            </div>

            <Link href="/login" className="no-underline">
              <Button
                size="small"
                variant="outlined"
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 normal-case rounded-lg"
              >
                Sign In
              </Button>
            </Link>

            <Link href="/chat" className="no-underline">
              <Button
                size="small"
                variant="contained"
                sx={{
                  bgcolor: '#1a56db',
                  '&:hover': { bgcolor: '#1545b0' },
                  textTransform: 'none',
                  borderRadius: 2,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  px: 2,
                }}
              >
                Open Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1a56db] text-xs font-semibold mb-4 shadow-2xs">
            <AutoAwesomeIcon fontSize="inherit" />
            <span>Generative UI • Multimodal Financial RAG • Discrepancy Auditing</span>
          </div>

          <Typography
            variant="h1"
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4"
          >
            Intelligent Conversational Agent for Financial Document Processing
          </Typography>

          <Typography
            variant="body1"
            className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto"
          >
            Ingest and analyze SEC 10-K/Q filings, balance sheets, and commercial invoices.
            Extract verifiable figures, audit arithmetic discrepancies, and dynamically render
            interactive GenUI charts grounded in primary source documents.
          </Typography>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full mb-12">
          {/* Chat Interface Entry */}
          <Paper
            elevation={0}
            className="p-8 border border-slate-200 hover:border-[#1a56db] hover:shadow-xl transition-all duration-200 rounded-3xl bg-white flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1a56db] flex items-center justify-center mb-5 shadow-2xs">
                <ForumIcon fontSize="medium" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="h5" className="font-bold text-slate-900">
                  Chat Assistant
                </Typography>
                <Chip label="/chat" size="small" className="font-mono text-xs bg-slate-100" />
              </div>
              <Typography variant="body2" className="text-slate-600 leading-relaxed mb-6">
                Conversational RAG interface with dynamic GenUI rendering for Q3 revenue metrics,
                comparative balance sheets, invoice discrepancies, and source citations.
              </Typography>
            </div>
            <Link href="/chat" className="no-underline">
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#1a56db',
                  '&:hover': { bgcolor: '#1545b0' },
                  textTransform: 'none',
                  borderRadius: 2.5,
                  py: 1.2,
                  fontWeight: 600,
                }}
                fullWidth
              >
                Launch Financial Chat
              </Button>
            </Link>
          </Paper>

          {/* Operations Dashboard Entry */}
          <Paper
            elevation={0}
            className="p-8 border border-slate-200 hover:border-slate-400 hover:shadow-xl transition-all duration-200 rounded-3xl bg-white flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-5 shadow-2xs">
                <DashboardIcon fontSize="medium" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="h5" className="font-bold text-slate-900">
                  Operations Dashboard
                </Typography>
                <Chip label="/dashboard" size="small" className="font-mono text-xs bg-slate-100" />
              </div>
              <Typography variant="body2" className="text-slate-600 leading-relaxed mb-6">
                Centralized monitoring for document ingestion pipelines, OCR parsing accuracy,
                vector chunk indexing status, and forensic audit logs with RBAC permissions.
              </Typography>
            </div>
            <Link href="/dashboard" className="no-underline">
              <Button
                variant="outlined"
                endIcon={<ArrowForwardIcon />}
                className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold normal-case rounded-2xl py-2.5"
                fullWidth
              >
                Open Operations Dashboard
              </Button>
            </Link>
          </Paper>
        </div>

        {/* Enterprise Platform Capabilities Grid */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AutoAwesomeIcon className="text-[#1a56db]" fontSize="small" />
              <Typography variant="h6" className="font-bold text-slate-900">
                Core Production Capabilities
              </Typography>
            </div>
            <span className="text-xs text-slate-500 font-mono">6 Modules Operational</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {platformCapabilities.map((item, idx) => (
              <Paper
                key={idx}
                elevation={0}
                className="p-5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <Typography variant="subtitle2" className="font-bold text-slate-900 mb-1">
                    {item.title}
                  </Typography>
                  <Typography variant="caption" className="text-slate-500 block leading-relaxed">
                    {item.desc}
                  </Typography>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircleIcon sx={{ fontSize: 12 }} />
                    Active
                  </span>
                </div>
              </Paper>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        <p>
          FinAgent AI — <strong>Smart Conversational Agent for Financial Document Processing</strong> • Enterprise Edition
        </p>
      </footer>
    </div>
  );
}
