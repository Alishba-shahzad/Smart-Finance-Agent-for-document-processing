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
  seriesData: customSeriesData,
  kpis: customKpis,
}) {
  const [activeMetric, setActiveMetric] = useState('all');
  const [hoveredBar, setHoveredBar] = useState(null);

  const defaultSeriesData = [
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

  const seriesData =
    Array.isArray(customSeriesData) && customSeriesData.length > 0
      ? customSeriesData
      : defaultSeriesData;

  // Calculate dynamic scale
  const numericValues = seriesData.flatMap((item) =>
    [item.revenue, item.grossProfit, item.operatingIncome, item.ebitda, item.value]
      .filter((v) => typeof v === 'number' && !isNaN(v) && v > 0)
  );
  const maxVal = numericValues.length > 0 ? Math.max(...numericValues) * 1.15 : 550;

  // Has single generic value per period?
  const hasGenericValues = seriesData.some((item) => typeof item.value === 'number');

  const defaultKpis = [
    { label: 'Q3 2025 Revenue', value: '$482.5M', change: '+14.2% YoY', positive: true },
    { label: 'Gross Margin', value: '61.0%', change: '+12.8% YoY', positive: true },
    { label: 'Operating Income', value: '$96.4M', change: '+18.5% YoY', positive: true },
    { label: 'EBITDA (25.8% Margin)', value: '$124.8M', change: '+19.8% YoY', positive: true, highlight: true },
  ];

  const kpis = Array.isArray(customKpis) && customKpis.length > 0 ? customKpis : defaultKpis;

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
              label="GenUI Interactive Chart"
              size="small"
              className="h-5 text-[10px] font-semibold bg-blue-50 text-[#1a56db] border border-blue-200"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Action controls */}
        {!hasGenericValues && (
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
        )}
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b border-slate-100 text-xs">
        {kpis.slice(0, 4).map((kpi, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-xl border ${
              kpi.highlight
                ? 'bg-blue-50/70 border-blue-100 text-[#1a56db]'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <span
              className={`text-[10px] font-medium block truncate ${
                kpi.highlight ? 'text-[#1a56db]' : 'text-slate-400'
              }`}
            >
              {kpi.label}
            </span>
            <span
              className={`text-base font-bold block ${
                kpi.highlight ? 'text-[#1a56db]' : 'text-slate-900'
              }`}
            >
              {kpi.value}
            </span>
            {kpi.change && (
              <span
                className={`text-[10px] font-semibold block ${
                  kpi.positive !== false ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {kpi.change}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Interactive Bar Chart Canvas */}
      <div className="pt-4 pb-2">
        <div className="h-44 relative flex items-end justify-around px-4 border-b border-slate-200">
          {/* Horizontal guidelines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-dashed border-slate-400 w-full"></div>
            <div className="border-b border-dashed border-slate-400 w-full"></div>
            <div className="border-b border-dashed border-slate-400 w-full"></div>
          </div>

          {/* Bars */}
          {seriesData.map((item, idx) => {
            const periodLabel = item.period || item.label || `P${idx + 1}`;
            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end flex-1 max-w-[140px] px-1">
                <div className="flex items-end gap-1.5 sm:gap-2 h-full justify-center w-full">
                  {/* Generic single value bar */}
                  {typeof item.value === 'number' && (
                    <Tooltip
                      title={`${periodLabel} - ${item.metricLabel || 'Value'}: ${Number(item.value).toLocaleString()}`}
                      arrow
                    >
                      <div className="flex flex-col items-center group">
                        <div
                          className="w-7 sm:w-10 bg-[#1a56db] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                          style={{
                            height: `${Math.max(12, Math.min(140, (item.value / maxVal) * 140))}px`,
                          }}
                        />
                        <span className="text-[10px] font-mono text-slate-700 mt-1 font-semibold truncate max-w-[60px]">
                          {Number(item.value) >= 1000
                            ? `$${(item.value / 1000).toFixed(1)}k`
                            : item.value}
                        </span>
                      </div>
                    </Tooltip>
                  )}

                  {/* Revenue Bar */}
                  {typeof item.revenue === 'number' && (activeMetric === 'all' || activeMetric === 'revenue') && (
                    <Tooltip title={`${periodLabel} Revenue: $${item.revenue}M`} arrow>
                      <div className="flex flex-col items-center group">
                        <div
                          className="w-6 sm:w-10 bg-[#1a56db] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                          style={{ height: `${Math.max(10, Math.min(140, (item.revenue / maxVal) * 140))}px` }}
                        />
                        <span className="text-[10px] font-mono text-slate-600 mt-1 font-semibold">
                          ${item.revenue}M
                        </span>
                      </div>
                    </Tooltip>
                  )}

                  {/* Gross Profit Bar */}
                  {typeof item.grossProfit === 'number' && activeMetric === 'all' && (
                    <Tooltip title={`${periodLabel} Gross Profit: $${item.grossProfit}M`} arrow>
                      <div className="flex flex-col items-center group">
                        <div
                          className="w-6 sm:w-10 bg-[#3b82f6] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                          style={{ height: `${Math.max(10, Math.min(140, (item.grossProfit / maxVal) * 140))}px` }}
                        />
                        <span className="text-[10px] font-mono text-slate-500 mt-1">
                          ${item.grossProfit}M
                        </span>
                      </div>
                    </Tooltip>
                  )}

                  {/* Operating Income Bar */}
                  {typeof item.operatingIncome === 'number' && activeMetric === 'all' && (
                    <Tooltip title={`${periodLabel} Operating Income: $${item.operatingIncome}M`} arrow>
                      <div className="flex flex-col items-center group">
                        <div
                          className="w-6 sm:w-10 bg-[#60a5fa] rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                          style={{ height: `${Math.max(10, Math.min(140, (item.operatingIncome / maxVal) * 140))}px` }}
                        />
                        <span className="text-[10px] font-mono text-slate-500 mt-1">
                          ${item.operatingIncome}M
                        </span>
                      </div>
                    </Tooltip>
                  )}

                  {/* EBITDA Bar */}
                  {typeof item.ebitda === 'number' && (activeMetric === 'all' || activeMetric === 'ebitda') && (
                    <Tooltip title={`${periodLabel} EBITDA: $${item.ebitda}M (Non-GAAP)`} arrow>
                      <div className="flex flex-col items-center group">
                        <div
                          className="w-6 sm:w-10 bg-emerald-600 rounded-t-md transition-all duration-300 hover:brightness-110 shadow-2xs"
                          style={{ height: `${Math.max(10, Math.min(140, (item.ebitda / maxVal) * 140))}px` }}
                        />
                        <span className="text-[10px] font-mono text-emerald-700 mt-1 font-bold">
                          ${item.ebitda}M
                        </span>
                      </div>
                    </Tooltip>
                  )}
                </div>

                {/* Period Label */}
                <span className="text-[11px] font-bold text-slate-800 mt-2 truncate max-w-full text-center">
                  {periodLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Citation */}
      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {hasGenericValues ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#1a56db]"></span>
              <span>Financial Metric Value</span>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Source: {sourceFiling}
        </span>
      </div>
    </Paper>
  );
}
