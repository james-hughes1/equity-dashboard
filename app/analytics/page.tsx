"use client";

import { useEffect, useState } from "react";
import ChartWrapper from "@/components/ChartWrapper";
import { loadAllData } from "@/lib/dataLoader";
import type { DataRow, ModelInfo } from "@/lib/dataLoader";

export default function AnalyticsPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const csvFile = process.env.NEXT_PUBLIC_CSV_FILE || "dashboard_output.csv";
    const jsonFile = process.env.NEXT_PUBLIC_JSON_FILE || "model.json";
    loadAllData(csvFile, jsonFile)
      .then(({ data: csvData, modelInfo: info }) => {
        setData(csvData);
        setModelInfo(info);
        setSelectedFeatures(info.features_used.slice(0, 5));
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      });
  }, []);

  if (loading || !data.length || !modelInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  // === Predicted vs Actual scatter plot ===
  const oosDate = new Date(modelInfo.oos_cutoff_date);
  const oosData = data.filter((row) => new Date(row.Date) >= oosDate);

  const scatterData = [
    {
      type: "scatter",
      mode: "markers",
      name: "Predictions",
      x: oosData.map((r) => r.alpha_fwd_1),
      y: oosData.map((r) => r.pred_alpha_fwd_1),
      marker: {
        size: 8,
        color: oosData.map((_, i) => i),
        colorscale: "Viridis",
        showscale: true,
        colorbar: { title: "Time" },
      },
      text: oosData.map((r) => new Date(r.Date).toLocaleDateString()),
      hovertemplate:
        "<b>Date:</b> %{text}<br><b>Actual:</b> %{x:.4f}<br><b>Predicted:</b> %{y:.4f}<extra></extra>",
    },
  ];

  // === Feature correlation heatmap ===
  const numericFeatures = selectedFeatures.filter((f) =>
    data.every((r) => typeof r[f] === "number"),
  );

  const corrMatrix = numericFeatures.map((f1) =>
    numericFeatures.map((f2) => {
      const x = data.map((r) => r[f1]) as number[];
      const y = data.map((r) => r[f2]) as number[];
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      return denominator === 0 ? 0 : numerator / denominator;
    }),
  );

  const heatmapData = [
    {
      type: "heatmap",
      z: corrMatrix,
      x: selectedFeatures,
      y: selectedFeatures,
      colorscale: "RdBu",
      zmid: 0,
      text: corrMatrix.map((row) => row.map((val) => val.toFixed(2))),
      texttemplate: "%{text}",
      textfont: { size: 10 },
      showscale: true,
      colorbar: { title: "Corr" },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Model Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-primary">📊 Model Information</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Model Type:</strong> {modelInfo.model_type.toUpperCase()}
            </p>
            <p>
              <strong>Training Window:</strong> {modelInfo.train_window} weeks
            </p>
            <p>
              <strong>Horizon:</strong> {modelInfo.horizon} weeks
            </p>
            <p>
              <strong>Features:</strong> {modelInfo.features_used.length}
            </p>
            <p>
              <strong>Alpha:</strong> {modelInfo.model_params.alpha}
            </p>
            <p>
              <strong>OOS Cutoff:</strong>{" "}
              {new Date(modelInfo.oos_cutoff_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Predicted vs Actual Scatter */}
        <div className="md:col-span-2 bg-dark-card border border-dark-border rounded-lg p-4">
          <ChartWrapper
            data={scatterData}
            layout={{
              title: { text: "Predicted vs Actual Alpha (OOS)" },
              xaxis: { title: { text: "Actual Alpha" } },
              yaxis: { title: { text: "Predicted Alpha" } },
              autosize: true,
              dragmode: false,
              margin: { t: 30, l: 50, r: 20, b: 40 },
            }}
          />
        </div>
      </div>

      {/* Feature Correlation */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-primary">🔗 Feature Correlations</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Features:</label>

          <div className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm max-h-32 overflow-y-auto space-y-1">
            {modelInfo.features_used.map((feature) => {
              const checked = selectedFeatures.includes(feature);
              return (
                <label key={feature} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setSelectedFeatures(selectedFeatures.filter((f) => f !== feature));
                      } else {
                        setSelectedFeatures([...selectedFeatures, feature]);
                      }
                    }}
                    className="accent-primary"
                  />
                  <span>{feature}</span>
                </label>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-1">
            Select multiple features to include them in the model
          </p>
        </div>

        <ChartWrapper
          data={heatmapData}
          layout={{
            title: "Feature Correlation Matrix",
            autosize: true,
            margin: { t: 40, l: 50, r: 50, b: 50 },
            dragmode: false,
          }}
        />
      </div>
    </div>
  );
}
