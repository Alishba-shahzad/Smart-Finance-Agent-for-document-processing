'use client';

import React, { useState } from 'react';
import { Paper, Chip, Tooltip, IconButton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function FinancialBarChart({
  title = 'Beta Tech Q3 Financial Metrics: 2024 vs 2025',
  subtitle = 'Operating Leverage & EBITDA Reconciliation (Item 1, Form 10-Q)',
  sourceFiling = 'Beta_Tech_Q3_Financial_Statement.pdf (p. 14)',
}) {
  const [activeMetric, setActiveMetric] = useState('all');
  const [hoveredBar, setHoveredBar] = useState(null);

  const seriesData = [
    {
      period: 'Q3 2024',
      revenue: 422.5,
      grossProfit: 260.8,
      operatingIncome: 81.3,
      ebitda: 104.2,
    },
    {
      period: 'Q3 2025',
      revenue: 482.5,
      grossProfit: 294.3,
      operatingIncome: 96.4,
      ebitda: 124.8,
    },
  ];

  const maxVal = 550; // Max scale in Millions

  return (
    <Paper
      elevation={0}
      className="p-5 my-3 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1a56db] flex items-center justify-center">
              <TrendingUpIcon sx={{ fontSize: 18 }} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {title}
            </h4>
            <Chip
              label="GenUI Interactive"
              size="small"
              className="h-5 text-[10px] font-semibold bg-blue-50 text-[#1a56db] border border-blue-200"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveMetric('all')}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeMetric === 'all' ? 'bg-white text-[#1a56db] shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setActiveMetric('revenue')}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeMetric === 'revenue' ? 'bg-white text-[#1a56db] shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveMetric('ebitda')}
              className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeMetric === 'ebitda' ? 'bg-white text-[#1a56db] shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              EBITDA
            </button>
          </div>

          <Tooltip title="Source filing citation">
            <IconButton size="small" className="text-slate-400 hover:text-slate-700 p-1">
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b border-slate-100 text-xs">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 font-medium block">Q3 2025 Revenue</span>
          <span className="text-base font-bold text-slate-900">$482.5M</span>
          <span className="text-[10px] text-emerald-600 font-semibold block">+14.2% YoY</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 font-medium block">Gross Margin</span>
          <span className="text-base font-bold text-slate-900">61.0%</span>
          <span className="text-[10px] text-emerald-600 font-semibold block">+12.8% YoY</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] text-slate-400 font-medium block">Operating Income</span>
          <span className="text-base font-bold text-slate-900">$96.4M</span>
          <span className="text-[10px] text-emerald-600 font-semibold block">+18.5% YoY</span>
        </div>
        <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
          <span className="text-[10px] text-[#1a56db] font-semibold block">EBITDA (25.8% Margin)</span>
          <span className="text-base font-bold text-[#1a56db]">$124.8M</span>
          <span className="text-[10px] text-emerald-700 font-semibold block">+19.8% YoY</span>
        </div>
      </div>

      {/* Interactive Bar Chart Canvas */}
      <div className="pt-4 pb-2">
        <div className="h-44 relative flex items-end justify-around px-4 border-b border-slate-200">
          {/* Horizontal guideline */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-dashed border-slate-400 w-full"></div>
            <div className="border-b border-dashed border-slate-400 w-full"></div>
            <div className="border-b border-dashed border-slate-400 w-full"></div>
          </div>

          {/* Bars */}
          {seriesData.map((item) => (
            <div key={item.period} className="flex flex-col items-center h-full justify-end w-1/3">
              <div className="flex items-end gap-2 h-full justify-center w-full">
                {/* Revenue Bar */}
                {(activeMetric === 'all' || activeMetric === 'revenue') && (
                  <Tooltip title={`${item.period} Revenue: $${item.revenue}M`} arrow>
                    <div className="flex flex-col items-center group">
                      <div
                        className="w-8 sm:w-12 bg-[#1a56db] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                        style={{ height: `${(item.revenue / maxVal) * 140}px` }}
                      />
                      <span className="text-[10px] font-mono text-slate-600 mt-1 font-semibold">
                        ${item.revenue}M
                      </span>
                    </div>
                  </Tooltip>
                )}

                {/* Gross Profit Bar */}
                {activeMetric === 'all' && (
                  <Tooltip title={`${item.period} Gross Profit: $${item.grossProfit}M`} arrow>
                    <div className="flex flex-col items-center group">
                      <div
                        className="w-8 sm:w-12 bg-[#3b82f6] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                        style={{ height: `${(item.grossProfit / maxVal) * 140}px` }}
                      />
                      <span className="text-[10px] font-mono text-slate-500 mt-1">
                        ${item.grossProfit}M
                      </span>
                    </div>
                  </Tooltip>
                )}

                {/* Operating Income Bar */}
                {activeMetric === 'all' && (
                  <Tooltip title={`${item.period} Operating Income: $${item.operatingIncome}M`} arrow>
                    <div className="flex flex-col items-center group">
                      <div
                        className="w-8 sm:w-12 bg-[#60a5fa] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                        style={{ height: `${(item.operatingIncome / maxVal) * 140}px` }}
                      />
                      <span className="text-[10px] font-mono text-slate-500 mt-1">
                        ${item.operatingIncome}M
                      </span>
                    </div>
                  </Tooltip>
                )}

                {/* EBITDA Bar */}
                {(activeMetric === 'all' || activeMetric === 'ebitda') && (
                  <Tooltip title={`${item.period} EBITDA: $${item.ebitda}M (Non-GAAP)`} arrow>
                    <div className="flex flex-col items-center group">
                      <div
                        className="w-8 sm:w-12 bg-emerald-600 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                        style={{ height: `${(item.ebitda / maxVal) * 140}px` }}
                      />
                      <span className="text-[10px] font-mono text-emerald-700 mt-1 font-bold">
                        ${item.ebitda}M
                      </span>
                    </div>
                  </Tooltip>
                )}
              </div>

              {/* Period Label */}
              <span className="text-xs font-bold text-slate-800 mt-2">
                {item.period}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Citation */}
      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#1a56db]"></span>
            <span>Total Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#3b82f6]"></span>
            <span>Gross Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#60a5fa]"></span>
            <span>Operating Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
            <span>EBITDA (Non-GAAP)</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Source: {sourceFiling}
        </span>
      </div>
    </Paper>
  );
}
