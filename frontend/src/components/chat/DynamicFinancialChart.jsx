'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Paper, Chip, Tooltip, IconButton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const PALETTE = [
  '#1a56db', // Enterprise Blue
  '#0ea5e9', // Sky Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

function formatCompactValue(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Number(val);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}k`;
  return `${sign}${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatFullNumber(num, isCurrency = true) {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  const prefix = isCurrency ? '$' : '';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1e12) {
    return `${sign}${prefix}${Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 })} (~${sign}${prefix}${(abs / 1e12).toFixed(2)} Trillion)`;
  }
  if (abs >= 1e9) {
    return `${sign}${prefix}${Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 })} (~${sign}${prefix}${(abs / 1e9).toFixed(2)} Billion)`;
  }
  return `${sign}${prefix}${Number(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DynamicFinancialChart({
  chartType = 'bar',
  xAxisKey,
  dataKey,
  secondaryDataKey,
  dataset = [],
  title,
  subtitle,
  sourceFiling,
}) {
  const [currentType, setCurrentType] = useState(chartType || 'bar');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Strictly sync currentType with chartType prop
  useEffect(() => {
    if (chartType && ['bar', 'line', 'pie'].includes(chartType.toLowerCase())) {
      setCurrentType(chartType.toLowerCase());
    }
  }, [chartType]);

  // Normalize dataset and auto-detect keys if missing
  const { normalizedData, detectedXKey, detectedDataKey, detectedSecKey } = useMemo(() => {
    let raw = Array.isArray(dataset) ? dataset : [];

    // Fallback if seriesData format was passed
    if (raw.length === 0 && Array.isArray(dataset?.seriesData)) {
      raw = dataset.seriesData;
    }

    if (raw.length === 0) {
      return { normalizedData: [], detectedXKey: 'category', detectedDataKey: 'value' };
    }

    const firstItem = raw[0] || {};
    const keys = Object.keys(firstItem);

    // Resolve X key (case-insensitive and alias aware)
    let xKey = xAxisKey;
    if (!xKey || !keys.includes(xKey)) {
      xKey =
        keys.find((k) => k.toLowerCase() === (xAxisKey || '').toLowerCase()) ||
        keys.find((k) =>
          ['sector', 'symbol', 'name', 'period', 'category', 'ticker', 'label', 'date'].includes(
            k.toLowerCase()
          )
        ) || keys[0];
    }

    // Resolve Data Key (case-insensitive and financial alias aware, never falling back to 'age')
    let dKey = dataKey;
    if (!dKey || !keys.includes(dKey)) {
      dKey =
        keys.find((k) => k.toLowerCase() === (dataKey || '').toLowerCase()) ||
        keys.find((k) => /market.*cap|mkt.*cap/i.test(k)) ||
        keys.find((k) => /price[\s/_]*earnings|p\/e|pe/i.test(k)) ||
        keys.find((k) => /ebitda/i.test(k)) ||
        keys.find((k) =>
          k !== xKey && (typeof firstItem[k] === 'number' || (!isNaN(parseFloat(firstItem[k])) && isFinite(firstItem[k])))
        ) || keys[1] || 'value';
    }

    const secKey = secondaryDataKey && keys.includes(secondaryDataKey) ? secondaryDataKey : null;

    // Clean and cast numeric values
    const cleaned = raw.map((item) => {
      const xVal = String(item[xKey] ?? 'Item').trim();
      const numVal =
        typeof item[dKey] === 'number'
          ? item[dKey]
          : parseFloat(String(item[dKey] || '').replace(/[$,\s]/g, '')) || 0;

      const secVal = secKey
        ? typeof item[secKey] === 'number'
          ? item[secKey]
          : parseFloat(String(item[secKey] || '').replace(/[$,\s]/g, '')) || 0
        : undefined;

      return {
        ...item,
        [xKey]: xVal,
        [dKey]: numVal,
        ...(secKey ? { [secKey]: secVal } : {}),
      };
    });

    return {
      normalizedData: cleaned,
      detectedXKey: xKey,
      detectedDataKey: dKey,
      detectedSecKey: secKey,
    };
  }, [dataset, xAxisKey, dataKey, secondaryDataKey]);

  // Aggregate metrics for summary KPI pill header
  const { totalVal, averageVal, maxItem, isCurrency } = useMemo(() => {
    if (normalizedData.length === 0) {
      return { totalVal: 0, averageVal: 0, maxItem: null, isCurrency: true };
    }

    let sum = 0;
    let max = -Infinity;
    let topObj = null;

    for (const d of normalizedData) {
      const v = d[detectedDataKey] || 0;
      sum += v;
      if (v > max) {
        max = v;
        topObj = d;
      }
    }

    const lowerKey = detectedDataKey.toLowerCase();
    const isRatio =
      lowerKey.includes('p/e') ||
      lowerKey.includes('ratio') ||
      lowerKey.includes('yield') ||
      lowerKey.includes('rate') ||
      lowerKey.includes('count') ||
      lowerKey.includes('share');

    return {
      totalVal: sum,
      averageVal: normalizedData.length > 0 ? sum / normalizedData.length : 0,
      maxItem: topObj,
      isCurrency: !isRatio,
    };
  }, [normalizedData, detectedDataKey]);

  if (normalizedData.length === 0) {
    return null;
  }

  const chartTitle = title || `${detectedDataKey} Distribution by ${detectedXKey}`;
  const chartSubtitle =
    subtitle || `Live deterministic financial schedule (${normalizedData.length} data points)`;

  // Custom Recharts Tooltip
  const CustomTooltipContent = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const primaryVal = dataPoint[detectedDataKey];
      const secVal = detectedSecKey ? dataPoint[detectedSecKey] : null;
      const pctOfTotal = totalVal > 0 ? ((primaryVal / totalVal) * 100).toFixed(1) : 0;

      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-md">
          <p className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 mb-1.5 flex items-center justify-between gap-3">
            <span>{dataPoint[detectedXKey]}</span>
            {totalVal > 0 && <span className="text-[10px] text-blue-400 font-mono">{pctOfTotal}%</span>}
          </p>
          <div className="space-y-1">
            <p className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{detectedDataKey}:</span>
              <span className="font-mono font-bold text-emerald-400">
                {isCurrency ? '$' : ''}
                {Number(primaryVal).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </p>
            {secVal !== null && secVal !== undefined && (
              <p className="flex items-center justify-between gap-4">
                <span className="text-slate-400">{detectedSecKey}:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {isCurrency ? '$' : ''}
                  {Number(secVal).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Paper
      elevation={0}
      className="p-4 sm:p-5 my-3 rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1a56db] flex items-center justify-center">
              <TrendingUpIcon sx={{ fontSize: 18 }} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">{chartTitle}</h4>
            <Chip
              label={`${currentType.toUpperCase()} CHART • LIVE DATA`}
              size="small"
              className="h-5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{chartSubtitle}</p>
        </div>

        {/* Universal Chart Type Switcher */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setCurrentType('bar')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center gap-1 transition-all cursor-pointer ${
                currentType === 'bar'
                  ? 'bg-white text-[#1a56db] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChartIcon sx={{ fontSize: 14 }} />
              <span>Bar</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentType('line')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center gap-1 transition-all cursor-pointer ${
                currentType === 'line'
                  ? 'bg-white text-[#1a56db] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShowChartIcon sx={{ fontSize: 14 }} />
              <span>Line</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentType('pie')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center gap-1 transition-all cursor-pointer ${
                currentType === 'pie'
                  ? 'bg-white text-[#1a56db] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChartIcon sx={{ fontSize: 14 }} />
              <span>Pie</span>
            </button>
          </div>

          {sourceFiling && (
            <Tooltip title={`Source filing: ${sourceFiling}`}>
              <IconButton size="small" className="text-slate-400 hover:text-slate-700 p-1">
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 border-b border-slate-100 text-xs">
        <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
          <span className="text-[10px] font-semibold text-[#1a56db] block truncate">
            Total {detectedDataKey}
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5 truncate">
            {formatFullNumber(totalVal, isCurrency)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-semibold text-slate-500 block truncate">
            Statistical Mean
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5 truncate">
            {formatFullNumber(averageVal, isCurrency)}
          </span>
        </div>

        {maxItem && (
          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-emerald-800 block truncate">
              Top: {maxItem[detectedXKey]}
            </span>
            <span className="text-sm font-bold font-mono text-emerald-950 block mt-0.5 truncate">
              {formatFullNumber(maxItem[detectedDataKey], isCurrency)}
            </span>
          </div>
        )}
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {currentType === 'bar' ? (
            <BarChart data={normalizedData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey={detectedXKey}
                tickLine={false}
                stroke="#64748b"
                fontSize={11}
                interval={0}
                tick={({ x, y, payload }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={14}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize={10}
                      transform="rotate(-25)"
                      className="font-mono font-medium"
                    >
                      {String(payload.value).length > 14
                        ? `${String(payload.value).slice(0, 13)}…`
                        : payload.value}
                    </text>
                  </g>
                )}
              />
              <YAxis
                tickLine={false}
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => (isCurrency ? `$${formatCompactValue(v)}` : formatCompactValue(v))}
                width={55}
              />
              <RechartsTooltip content={<CustomTooltipContent />} />
              <Bar
                dataKey={detectedDataKey}
                name={detectedDataKey}
                radius={[6, 6, 0, 0]}
                fill="#1a56db"
              >
                {normalizedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                    fillOpacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.4}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </Bar>
              {detectedSecKey && (
                <Bar
                  dataKey={detectedSecKey}
                  name={detectedSecKey}
                  radius={[6, 6, 0, 0]}
                  fill="#0ea5e9"
                />
              )}
            </BarChart>
          ) : currentType === 'line' ? (
            <LineChart data={normalizedData} margin={{ top: 10, right: 15, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey={detectedXKey}
                tickLine={false}
                stroke="#64748b"
                fontSize={11}
                interval={0}
                tick={({ x, y, payload }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={14}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize={10}
                      transform="rotate(-25)"
                      className="font-mono font-medium"
                    >
                      {String(payload.value).length > 14
                        ? `${String(payload.value).slice(0, 13)}…`
                        : payload.value}
                    </text>
                  </g>
                )}
              />
              <YAxis
                tickLine={false}
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => (isCurrency ? `$${formatCompactValue(v)}` : formatCompactValue(v))}
                width={55}
              />
              <RechartsTooltip content={<CustomTooltipContent />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line
                type="monotone"
                dataKey={detectedDataKey}
                name={detectedDataKey}
                stroke="#1a56db"
                strokeWidth={3}
                dot={{ r: 4, fill: '#1a56db', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#1a56db' }}
              />
              {detectedSecKey && (
                <Line
                  type="monotone"
                  dataKey={detectedSecKey}
                  name={detectedSecKey}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#10b981' }}
                />
              )}
            </LineChart>
          ) : (
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <RechartsTooltip content={<CustomTooltipContent />} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                formatter={(val) => (String(val).length > 16 ? `${String(val).slice(0, 15)}…` : val)}
              />
              <Pie
                data={normalizedData}
                dataKey={detectedDataKey}
                nameKey={detectedXKey}
                cx="50%"
                cy="46%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {normalizedData.map((_, index) => (
                  <Cell
                    key={`pie-cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                    fillOpacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.5}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}

