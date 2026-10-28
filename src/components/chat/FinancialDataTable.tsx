'use client';

import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Tooltip,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface FinancialTableRow {
  metric: string;
  period1: string; // e.g. "FY2024" or "Unit Price"
  period2: string; // e.g. "FY2025" or "Total Line"
  variance: string; // e.g. "+20.1%" or "Valid"
  isPositive?: boolean;
  citation: string;
  confidence: number;
  isFlagged?: boolean;
  notes?: string;
}

interface FinancialDataTableProps {
  title?: string;
  subtitle?: string;
  type?: 'balanceSheet' | 'invoice';
  sourceDoc?: string;
}

export default function FinancialDataTable({
  title = 'Consolidated Balance Sheet: YoY Structural Shift',
  subtitle = 'Alpha Corp Item 8 Form 10-K Audit (in Millions USD)',
  type = 'balanceSheet',
  sourceDoc = 'Alpha_Corp_2025_10K_Annual_Report.pdf (p. 28)',
}: FinancialDataTableProps) {
  const [filterType, setFilterType] = useState<'all' | 'assets' | 'liabilities'>('all');

  const balanceSheetRows: FinancialTableRow[] = [
    {
      metric: 'Cash and Cash Equivalents',
      period1: '$320.4M',
      period2: '$415.8M',
      variance: '+29.8%',
      isPositive: true,
      citation: '10-K Item 8, p. 28',
      confidence: 0.99,
      notes: 'Strong operating cash inflow',
    },
    {
      metric: 'Marketable Securities',
      period1: '$285.0M',
      period2: '$340.2M',
      variance: '+19.4%',
      isPositive: true,
      citation: '10-K Item 8, p. 28',
      confidence: 0.98,
    },
    {
      metric: 'Accounts Receivable (Net)',
      period1: '$514.6M',
      period2: '$589.5M',
      variance: '+14.6%',
      isPositive: true,
      citation: '10-K Note 3, p. 34',
      confidence: 0.97,
    },
    {
      metric: 'Total Current Assets',
      period1: '$1,120.0M',
      period2: '$1,345.5M',
      variance: '+20.1%',
      isPositive: true,
      citation: '10-K Item 8, p. 28',
      confidence: 1.0,
      notes: 'Working Capital increased to $533.1M',
    },
    {
      metric: 'Accounts Payable & Accrued',
      period1: '$420.5M',
      period2: '$395.0M',
      variance: '-6.1%',
      isPositive: true,
      citation: '10-K Item 8, p. 29',
      confidence: 0.98,
    },
    {
      metric: 'Current Portion Long-Term Debt',
      period1: '$110.0M',
      period2: '$85.0M',
      variance: '-22.7%',
      isPositive: true,
      citation: '10-K Note 7, p. 41',
      confidence: 0.99,
      notes: 'Senior notes redeemed ahead of maturity',
    },
    {
      metric: 'Total Liabilities',
      period1: '$890.2M',
      period2: '$812.4M',
      variance: '-8.7%',
      isPositive: true,
      citation: '10-K Item 8, p. 29',
      confidence: 0.99,
      notes: 'Total de-leveraging of $77.8M',
    },
    {
      metric: 'Stockholders Equity',
      period1: '$1,420.8M',
      period2: '$1,780.2M',
      variance: '+25.3%',
      isPositive: true,
      citation: '10-K Item 8, p. 30',
      confidence: 0.99,
      notes: 'Driven by FY2025 net income retention',
    },
  ];

  const invoiceRows: FinancialTableRow[] = [
    {
      metric: '1. Cloud Infrastructure Compute (c6g.4xlarge)',
      period1: '120 hrs @ $0.68/hr',
      period2: '$8,160.00',
      variance: 'Verified',
      isPositive: true,
      citation: 'Line Item 1',
      confidence: 0.99,
    },
    {
      metric: '2. Dedicated Managed Database Cluster',
      period1: '1 mo @ $14,200.00',
      period2: '$14,200.00',
      variance: 'Verified',
      isPositive: true,
      citation: 'Line Item 2',
      confidence: 1.0,
    },
    {
      metric: '3. Data Transfer & Global Network Egress',
      period1: '45 TB @ $0.08/GB',
      period2: '$3,600.00',
      variance: 'Verified',
      isPositive: true,
      citation: 'Line Item 3',
      confidence: 0.98,
    },
    {
      metric: '4. Priority Enterprise Technical Support',
      period1: 'Monthly Tier',
      period2: '$2,500.00',
      variance: 'Verified',
      isPositive: true,
      citation: 'Line Item 4',
      confidence: 0.99,
    },
    {
      metric: '5. Expedited Onboarding Service Fee',
      period1: 'Unitemized',
      period2: '$550.00',
      variance: 'Discrepancy',
      isPositive: false,
      isFlagged: true,
      citation: 'Footer Note B',
      confidence: 0.78,
      notes: '⚠️ Surcharge not listed in Master Services Agreement contract',
    },
  ];

  const rows = type === 'invoice' ? invoiceRows : balanceSheetRows;

  return (
    <Paper
      elevation={0}
      className="p-5 my-3 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              {type === 'invoice' ? (
                <FactCheckIcon sx={{ fontSize: 18 }} />
              ) : (
                <AccountBalanceIcon sx={{ fontSize: 18 }} />
              )}
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {title}
            </h4>
            <Chip
              label="GenUI Table"
              size="small"
              className="h-5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
          Source: {sourceDoc}
        </span>
      </div>

      {/* Table Content */}
      <TableContainer className="mt-2">
        <Table size="small">
          <TableHead>
            <TableRow className="bg-slate-50">
              <TableCell className="font-bold text-xs text-slate-700 py-2.5">
                {type === 'invoice' ? 'Line Item Description' : 'Balance Sheet Line Item'}
              </TableCell>
              <TableCell className="font-bold text-xs text-slate-700 py-2.5">
                {type === 'invoice' ? 'Rate / Qty' : 'FY2024'}
              </TableCell>
              <TableCell className="font-bold text-xs text-slate-700 py-2.5">
                {type === 'invoice' ? 'Amount' : 'FY2025'}
              </TableCell>
              <TableCell className="font-bold text-xs text-slate-700 py-2.5">
                {type === 'invoice' ? 'Audit Status' : 'YoY Variance'}
              </TableCell>
              <TableCell className="font-bold text-xs text-slate-700 py-2.5">Citation</TableCell>
              <TableCell align="right" className="font-bold text-xs text-slate-700 py-2.5">
                Confidence
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={idx}
                hover
                className={`transition-colors ${
                  row.isFlagged ? 'bg-rose-50/50' : 'hover:bg-slate-50/60'
                }`}
              >
                <TableCell className="text-xs font-semibold text-slate-900">
                  <div className="flex flex-col">
                    <span>{row.metric}</span>
                    {row.notes && (
                      <span className={`text-[10px] ${row.isFlagged ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                        {row.notes}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-slate-600">{row.period1}</TableCell>
                <TableCell className="text-xs font-mono font-bold text-slate-900">
                  {row.period2}
                </TableCell>
                <TableCell className="text-xs">
                  {row.isFlagged ? (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                      <ErrorOutlinedIcon sx={{ fontSize: 12 }} />
                      <span>{row.variance}</span>
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[10px] ${
                        row.isPositive
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                          : 'text-slate-700 bg-slate-100'
                      }`}
                    >
                      <CheckCircleIcon sx={{ fontSize: 12 }} className="text-emerald-600" />
                      <span>{row.variance}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono text-slate-500">
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                    {row.citation}
                  </span>
                </TableCell>
                <TableCell align="right" className="text-xs font-mono font-semibold">
                  <span
                    className={`${
                      row.confidence >= 0.95
                        ? 'text-emerald-700'
                        : row.confidence >= 0.85
                        ? 'text-amber-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {Math.round(row.confidence * 100)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer Audit Summary */}
      <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Current Ratio: 1.65x (improved from 1.26x) • Retained Earnings retention: 84.2%</span>
        <span className="text-emerald-600 font-semibold font-mono">100% SEC Reconciled</span>
      </div>
    </Paper>
  );
}
