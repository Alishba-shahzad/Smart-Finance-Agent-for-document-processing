'use client';

import React from 'react';
import DynamicFinancialChart from './DynamicFinancialChart.jsx';

/**
 * Universal Financial Chart Component - Dynamic & Live Data Only.
 * Hardcoded dummy templates (e.g. Beta Tech Q3) have been completely removed.
 */
export default function FinancialBarChart(props) {
  // If props contain seriesData, map it directly into DynamicFinancialChart
  const dataset = props.dataset || props.seriesData;
  const xAxisKey = props.xAxisKey || 'period' || 'Sector' || 'category';
  const dataKey = props.dataKey || 'value' || 'revenue' || 'Market Cap';

  return (
    <DynamicFinancialChart
      chartType={props.chartType || 'bar'}
      xAxisKey={xAxisKey}
      dataKey={dataKey}
      secondaryDataKey={props.secondaryDataKey}
      dataset={dataset}
      title={props.title}
      subtitle={props.subtitle}
      sourceFiling={props.sourceFiling}
    />
  );
}
