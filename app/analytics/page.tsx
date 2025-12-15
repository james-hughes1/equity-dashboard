"use client";

import { useEffect, useState } from "react";
import ChartWrapper from "@/components/ChartWrapper";
import { loadAllData } from "@/lib/dataLoader";
import type { DataRow, ModelInfo } from "@/lib/dataLoader";

export default function AnalyticsPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [feature1, setFeature1] = useState<string>("");
  const [feature2, setFeature2] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const csvFile = process.env.NEXT_PUBLIC_CSV_FILE || "dashboard_output.csv";
    const jsonFile = process.env.NEXT_PUBLIC_JSON_FILE || "model.json";
    loadAllData(csvFile, jsonFile)
      .then(({ data: csvData, modelInfo: info }) => {
        setData(csvData);
        setModelInfo(info);
        setSelectedFeatures(info.features_used.slice(0, 5));
        // Set default features for time series comparison
        if (info.features_used.length >= 2) {
          setFeature1(info.features_used[0]);
          setFeature2(info.features_used[1]);
        }
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

  // === Time series comparison chart ===
  const timeSeriesData = [];

  if (feature1) {
    // Normalize feature1 data to 0-100 scale for comparison
    const f1Values = data.map((r) => r[feature1]) as number[];
    const f1Min = Math.min(...f1Values);
    const f1Max = Math.max(...f1Values);
    const f1Normalized = f1Values.map((v) => ((v - f1Min) / (f1Max - f1Min)) * 100);

    timeSeriesData.push({
      type: "scatter",
      mode: "lines",
      name: feature1,
      x: data.map((r) => r.Date),
      y: f1Normalized,
      line: { color: "#636efa", width: 2 },
      yaxis: "y",
    });
  }

  if (feature2) {
    // Normalize feature2 data to 0-100 scale for comparison
    const f2Values = data.map((r) => r[feature2]) as number[];
    const f2Min = Math.min(...f2Values);
    const f2Max = Math.max(...f2Values);
    const f2Normalized = f2Values.map((v) => ((v - f2Min) / (f2Max - f2Min)) * 100);

    timeSeriesData.push({
      type: "scatter",
      mode: "lines",
      name: feature2,
      x: data.map((r) => r.Date),
      y: f2Normalized,
      line: { color: "#00cc96", width: 2 },
      yaxis: "y",
    });
  }

  return (
    <div className="space-y-6">
      {/* Model Info */}
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
            <strong>OOS Cutoff:</strong> {new Date(modelInfo.oos_cutoff_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Time Series Comparison */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-primary">📈 Feature Time Series Comparison</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Feature 1:</label>
            <select
              value={feature1}
              onChange={(e) => setFeature1(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm"
            >
              <option value="">Select a feature</option>
              {modelInfo.features_used.map((feature) => (
                <option key={feature} value={feature}>
                  {feature}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Feature 2:</label>
            <select
              value={feature2}
              onChange={(e) => setFeature2(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm"
            >
              <option value="">Select a feature</option>
              {modelInfo.features_used.map((feature) => (
                <option key={feature} value={feature}>
                  {feature}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Note: Both features are normalized to 0-100 scale for visual comparison
        </p>

        {timeSeriesData.length > 0 && (
          <ChartWrapper
            data={timeSeriesData}
            dynamicYAxis={true}
            layout={{
              title: { text: "Feature Comparison Over Time" },
              xaxis: {
                title: { text: "Date" },
                fixedrange: false,
                rangeslider: { visible: false },
                rangeselector: {
                  buttons: [
                    { count: 3, label: "3M", step: "month", stepmode: "backward" },
                    { count: 6, label: "6M", step: "month", stepmode: "backward" },
                    { count: 1, label: "1Y", step: "year", stepmode: "backward" },
                    { count: 2, label: "2Y", step: "year", stepmode: "backward" },
                    { count: 5, label: "5Y", step: "year", stepmode: "backward" },
                    { step: "all", label: "All" },
                  ],
                  bgcolor: "rgba(255,255,255,0)",
                  font: { color: "#c9d1d9" },
                  activecolor: "rgba(255,255,255,0.2)",
                  bordercolor: "rgba(255,255,255,0.3)",
                },
              },
              yaxis: {
                title: { text: "Normalized Value (0-100)" },
                fixedrange: true,
              },
              dragmode: "pan",
              height: 500,
              hovermode: "x unified",
            }}
          />
        )}
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
            Select multiple features to include them in the correlation matrix
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
