"use client";

import { useEffect, useState, useRef } from "react";

interface ChartWrapperProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
}

export default function ChartWrapper({
  data,
  layout = {},
  config = {},
  className,
}: ChartWrapperProps) {
  const [Plotly, setPlotly] = useState<any>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  // Load Plotly dynamically on client
  useEffect(() => {
    import("plotly.js").then((module) => setPlotly(module.default));
  }, []);

  useEffect(() => {
    if (!Plotly || !plotRef.current || !data) return;

    // Default layout
    const defaultLayout = {
      paper_bgcolor: "#161b22",
      plot_bgcolor: "#161b22",
      font: { family: "Inter, sans-serif", color: "#c9d1d9", size: 12 },
      margin: { l: 50, r: 20, t: 50, b: 50 },
      xaxis: {
        showgrid: true,
        gridcolor: "rgba(255,255,255,0.05)",
        zeroline: false,
        automargin: true,
      },
      yaxis: {
        showgrid: true,
        gridcolor: "rgba(255,255,255,0.05)",
        zeroline: false,
        automargin: true,
      },
      legend: {
        orientation: "h",
        x: 0,
        y: 0.1,
        bgcolor: "rgba(22,27,34,0.6)",
        borderwidth: 0,
        font: { size: 11, color: "#c9d1d9" },
      },
      autosize: true,
      ...layout, // merge user layout (page-provided)
    };

    // Default config
    const defaultConfig = {
      displayModeBar: false,
      responsive: true,
      scrollZoom: true,
      ...config,
    };

    Plotly.newPlot(plotRef.current, data, defaultLayout, defaultConfig);

    const handleResize = () => Plotly.Plots.resize(plotRef.current!);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [Plotly, data, layout, config]);

  if (!Plotly) {
    return (
      <div
        className={`${className} bg-dark-card border border-dark-border rounded-lg flex items-center justify-center`}
        style={{ minHeight: 400 }}
      >
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div
      ref={plotRef}
      className={`${className} w-full`}
      style={{ minHeight: 400 }}
    />
  );
}
