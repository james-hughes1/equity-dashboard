"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import ChartWrapper from "@/components/ChartWrapper";
import { loadAllData } from "@/lib/dataLoader";
import { MetricsCalculator } from "@/lib/metrics";
import type { DataRow, ModelInfo } from "@/lib/dataLoader";
import type { SignalMetrics } from "@/lib/metrics";

export default function OverviewPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [metrics, setMetrics] = useState<SignalMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const csvFile = process.env.NEXT_PUBLIC_CSV_FILE || "dashboard_output.csv";
    const jsonFile = process.env.NEXT_PUBLIC_JSON_FILE || "model.json";
    loadAllData(csvFile, jsonFile)
      .then(({ data: csvData, modelInfo: info }) => {
        setData(csvData);
        setModelInfo(info);
        const calculatedMetrics = MetricsCalculator.calculateSignalMetrics(
          csvData,
          info,
        );
        setMetrics(calculatedMetrics);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data.length || !modelInfo || !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-red-400">Error loading data</div>
      </div>
    );
  }

  const latestData = data[data.length - 1];
  const latestSignal = latestData.pred_alpha_fwd_1 > 0 ? "BUY 📈" : "SELL 📉";
  const signalColor = latestData.pred_alpha_fwd_1 > 0 ? "#00ff00" : "#ff0000";

  // Prepare chart data
  const oosDate = new Date(modelInfo.oos_cutoff_date);
  const trainData = data.filter((row) => new Date(row.Date) < oosDate);
  const testData = data.filter((row) => new Date(row.Date) >= oosDate);

  const buySignals = testData.filter((row) => row.pred_alpha_fwd_1 > 0);
  const sellSignals = testData.filter((row) => row.pred_alpha_fwd_1 < 0);

  const chartData = [
    {
      type: "scatter",
      mode: "lines",
      name: "Train",
      x: trainData.map((r) => r.Date),
      y: trainData.map((r) => r.SBUX),
      line: { color: "#636efa", width: 2 },
      opacity: 0.6,
    },
    {
      type: "scatter",
      mode: "lines",
      name: "OOS",
      x: testData.map((r) => r.Date),
      y: testData.map((r) => r.SBUX),
      line: { color: "#00cc96", width: 3 },
    },
    {
      type: "scatter",
      mode: "markers",
      name: "BUY",
      x: buySignals.map((r) => r.Date),
      y: buySignals.map((r) => r.SBUX),
      marker: {
        symbol: "triangle-up",
        size: 12,
        color: "#00ff00",
        line: { color: "white", width: 1 },
      },
    },
    {
      type: "scatter",
      mode: "markers",
      name: "SELL",
      x: sellSignals.map((r) => r.Date),
      y: sellSignals.map((r) => r.SBUX),
      marker: {
        symbol: "triangle-down",
        size: 12,
        color: "#ff0000",
        line: { color: "white", width: 1 },
      },
    },
  ];

  const chartLayout = {
    title: { text: "Stock Price with ML Signals" },
    xaxis: { title: "Date" },
    yaxis: { title: "Price ($)" },
    height: 600,
    hovermode: "x unified",
    shapes: [
      {
        type: "line",
        x0: oosDate.toISOString().split("T")[0],
        x1: oosDate.toISOString().split("T")[0],
        y0: 0,
        y1: 1,
        yref: "paper",
        line: { color: "rgba(255, 255, 255, 0.5)", width: 2, dash: "dash" },
      },
    ],
    annotations: [
      {
        x: oosDate.toISOString().split("T")[0],
        y: 1,
        yref: "paper",
        text: "OOS Start",
        showarrow: false,
        yshift: 10,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current Price"
          value={`$${latestData.SBUX.toFixed(2)}`}
          subtitle={`As of ${new Date(latestData.Date).toLocaleDateString()}`}
          icon="💰"
        />
        <MetricCard
          title="Signal"
          value={latestSignal}
          subtitle={`Alpha: ${latestData.pred_alpha_fwd_1.toFixed(4)}`}
          icon="🎯"
          valueColor={signalColor}
        />
        <MetricCard
          title="Hit Rate (OOS)"
          value={`${(metrics.hit_rate * 100).toFixed(1)}%`}
          subtitle="Direction accuracy"
          icon="🎯"
        />
        <MetricCard
          title="R² (OOS)"
          value={metrics.r2_oos.toFixed(4)}
          subtitle={`RMSE: ${metrics.rmse_oos.toFixed(4)}`}
          icon="📊"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg overflow-hidden">
        <ChartWrapper data={chartData} layout={chartLayout} />
      </div>

      {/* Alpha Predictions */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-1">
        <ChartWrapper
          data={[
            {
              type: "scatter",
              mode: "lines",
              name: "Predicted Alpha",
              x: testData.map((r) => r.Date),
              y: testData.map((r) => r.pred_alpha_fwd_1),
              fill: "tozeroy",
              fillcolor: "rgba(255, 165, 0, 0.2)",
              line: { color: "#ffa500", width: 2 },
            },
          ]}
          layout={{
            title: { text: "Predicted Alpha Signal" },
            xaxis: { title: "Date" },
            yaxis: { title: "Alpha" },
            height: 300,
          }}
        />
      </div>
    </div>
  );
}
