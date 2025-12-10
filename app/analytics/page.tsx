'use client';

import { useEffect, useState } from 'react';
import ChartWrapper from '@/components/ChartWrapper';
import { loadAllData } from '@/lib/dataLoader';
import type { DataRow, ModelInfo } from '@/lib/dataLoader';

export default function AnalyticsPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const csvFile = process.env.NEXT_PUBLIC_CSV_FILE || 'dashboard_output.csv';
    const jsonFile = process.env.NEXT_PUBLIC_JSON_FILE || 'model.json';
    loadAllData(csvFile, jsonFile)
      .then(({ data: csvData, modelInfo: info }) => {
        setData(csvData);
        setModelInfo(info);
        setSelectedFeatures(info.features_used.slice(0, 5));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
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

  const oosDate = new Date(modelInfo.oos_cutoff_date);
  const oosData = data.filter((row) => new Date(row.Date) >= oosDate);

  // Pred vs Actual scatter
  const scatterData = [
    {
      type: 'scatter',
      mode: 'markers',
      name: 'Predictions',
      x: oosData.map((r) => r.alpha_fwd_1),
      y: oosData.map((r) => r.pred_alpha_fwd_1),
      marker: {
        size: 8,
        color: oosData.map((_, i) => i),
        colorscale: 'Viridis',
        showscale: true,
        colorbar: { title: 'Time' },
      },
      text: oosData.map((r) => new Date(r.Date).toLocaleDateString()),
      hovertemplate: '<b>Date:</b> %{text}<br><b>Actual:</b> %{x:.4f}<br><b>Predicted:</b> %{y:.4f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Perfect Prediction',
      x: [Math.min(...oosData.map((r) => r.alpha_fwd_1)), Math.max(...oosData.map((r) => r.alpha_fwd_1))],
      y: [Math.min(...oosData.map((r) => r.alpha_fwd_1)), Math.max(...oosData.map((r) => r.alpha_fwd_1))],
      line: { color: 'red', dash: 'dash' },
    },
  ];

  // Correlation heatmap
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const corrMatrix: number[][] = [];
  selectedFeatures.forEach((feature1) => {
    const row: number[] = [];
    selectedFeatures.forEach((feature2) => {
      const values1 = data.map((r) => r[feature1]).filter((v) => typeof v === 'number') as number[];
      const values2 = data.map((r) => r[feature2]).filter((v) => typeof v === 'number') as number[];
      row.push(calculateCorrelation(values1, values2));
    });
    corrMatrix.push(row);
  });

  const heatmapData = [
    {
      type: 'heatmap',
      z: corrMatrix,
      x: selectedFeatures,
      y: selectedFeatures,
      colorscale: 'RdBu',
      zmid: 0,
      text: corrMatrix.map((row) => row.map((val) => val.toFixed(2))),
      texttemplate: '%{text}',
      textfont: { size: 8 },
      colorbar: { title: 'Corr' },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Model Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-primary">📊 Model Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Model Type:</strong> {modelInfo.model_type.toUpperCase()}</p>
            <p><strong>Training Window:</strong> {modelInfo.train_window} weeks</p>
            <p><strong>Horizon:</strong> {modelInfo.horizon} weeks</p>
            <p><strong>Features:</strong> {modelInfo.features_used.length}</p>
            <p><strong>Alpha:</strong> {modelInfo.model_params.alpha}</p>
            <p><strong>OOS Cutoff:</strong> {new Date(modelInfo.oos_cutoff_date).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="md:col-span-2 bg-dark-card border border-dark-border rounded-lg p-4">
          <ChartWrapper
            data={scatterData}
            layout={{
              title: 'Predicted vs Actual Alpha (OOS)',
              xaxis: { title: 'Actual Alpha' },
              yaxis: { title: 'Predicted Alpha' },
              height: 400,
            }}
          />
        </div>
      </div>

      {/* Feature Correlation */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-primary">🔗 Feature Correlations</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Features:</label>
          <select
            multiple
            value={selectedFeatures}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) => option.value);
              setSelectedFeatures(selected);
            }}
            className="w-full bg-dark-bg border border-dark-border rounded p-2 text-sm max-h-32"
          >
            {modelInfo.features_used.map((feature) => (
              <option key={feature} value={feature}>
                {feature}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
        </div>

        <ChartWrapper
          data={heatmapData}
          layout={{
            title: 'Feature Correlation Matrix',
            height: 500,
          }}
        />
      </div>
    </div>
  );
}