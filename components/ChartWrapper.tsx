'use client';

import { useEffect, useState, useRef } from 'react';

interface ChartWrapperProps {
  data: any[];
  layout: any;
  config?: any;
  className?: string;
}

export default function ChartWrapper({ data, layout, config, className }: ChartWrapperProps) {
  const [Plotly, setPlotly] = useState<any>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import Plotly only on client-side
    import('plotly.js-basic-dist-min').then((module) => {
      setPlotly(module.default);
    });
  }, []);

  useEffect(() => {
    if (Plotly && plotRef.current && data && layout) {
      const defaultLayout = {
        template: 'plotly_dark',
        paper_bgcolor: '#161b22',
        plot_bgcolor: '#0d1117',
        font: { color: '#c9d1d9' },
        xaxis: { gridcolor: '#30363d' },
        yaxis: { gridcolor: '#30363d' },
        autosize: true,
        ...layout,
      };

      const defaultConfig = {
        displayModeBar: false,
        responsive: true,
        ...config,
      };

      Plotly.newPlot(plotRef.current, data, defaultLayout, defaultConfig);

      // Handle window resize
      const handleResize = () => {
        if (plotRef.current) {
          Plotly.Plots.resize(plotRef.current);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [Plotly, data, layout, config]);

  if (!Plotly) {
    return (
      <div className={`${className} bg-dark-card border border-dark-border rounded-lg flex items-center justify-center h-96`}>
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return <div ref={plotRef} className={`${className} w-full`} style={{ minHeight: '400px' }} />;
}