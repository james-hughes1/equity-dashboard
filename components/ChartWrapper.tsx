'use client';

import { useEffect, useState, useRef } from 'react';
import type Plotly from 'plotly.js';

interface ChartWrapperProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
}

export default function ChartWrapper({ data, layout, config, className }: ChartWrapperProps) {
  const [PlotlyModule, setPlotlyModule] = useState<typeof Plotly | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('plotly.js').then((module) => {
      setPlotlyModule(module);
    });
  }, []);

  useEffect(() => {
    if (!PlotlyModule || !plotRef.current || !data) return;

    const defaultLayout = {
      paper_bgcolor: '#161b22',
      plot_bgcolor: '#161b22',
      font: { family: 'Inter, sans-serif', color: '#c9d1d9', size: 12 },
      xaxis: { showgrid: true, gridcolor: 'rgba(255,255,255,0.05)', automargin: true },
      yaxis: { showgrid: true, gridcolor: 'rgba(255,255,255,0.05)', automargin: true },
      margin: { l: 50, r: 20, t: 30, b: 50 },
      legend: {
        orientation: 'h',
        x: 0.02,
        y: 1.05,
        xanchor: 'left',
        yanchor: 'bottom',
        bgcolor: 'rgba(22, 27, 34, 0.6)',
        font: { size: 11, color: '#c9d1d9' },
      },
      autosize: true,
      ...layout,
    };

    const defaultConfig = {
      displayModeBar: false,
      responsive: true,
      scrollZoom: true,
      doubleClick: 'reset',
      ...config,
    };

    PlotlyModule.newPlot(plotRef.current, data, defaultLayout, defaultConfig);

    const handleResize = () => {
      if (plotRef.current) PlotlyModule.Plots.resize(plotRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [PlotlyModule, data, layout, config]);

  if (!PlotlyModule) {
    return (
      <div className={`${className} bg-dark-card border border-dark-border rounded-lg flex items-center justify-center h-96`}>
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return <div ref={plotRef} className={`${className} w-full`} style={{ minHeight: '400px' }} />;
}
