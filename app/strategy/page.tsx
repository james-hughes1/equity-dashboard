'use client';

import { useEffect, useState } from 'react';
import MetricCard from '@/components/MetricCard';
import ChartWrapper from '@/components/ChartWrapper';
import { loadAllData } from '@/lib/dataLoader';
import { MetricsCalculator } from '@/lib/metrics';
import type { DataRow, ModelInfo } from '@/lib/dataLoader';
import type { StrategyMetrics } from '@/lib/metrics';

export default function StrategyPage() {
  const [data, setData] = useState<DataRow[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [threshold, setThreshold] = useState(0);
  const [transactionCost, setTransactionCost] = useState(0.1);
  const [metrics, setMetrics] = useState<StrategyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const csvFile = process.env.NEXT_PUBLIC_CSV_FILE || 'dashboard_output.csv';
    const jsonFile = process.env.NEXT_PUBLIC_JSON_FILE || 'model.json';
    loadAllData(csvFile, jsonFile)
      .then(({ data: csvData, modelInfo: info }) => {
        setData(csvData);
        setModelInfo(info);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (data.length && modelInfo) {
      const strategyData = MetricsCalculator.calculateStrategyReturns(
        data,
        modelInfo,
        threshold,
        transactionCost / 100
      );
      const calculatedMetrics = MetricsCalculator.calculateStrategyMetrics(strategyData);
      setMetrics(calculatedMetrics);
    }
  }, [data, modelInfo, threshold, transactionCost]);

  if (loading || !data.length || !modelInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-400">Loading strategy...</div>
      </div>
    );
  }

  const strategyData = MetricsCalculator.calculateStrategyReturns(
    data,
    modelInfo,
    threshold,
    transactionCost / 100
  );

  const chartData = [
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Strategy',
      x: strategyData.map((r) => r.Date),
      y: strategyData.map((r) => r.cum_strategy),
      line: { color: '#00cc96', width: 3 },
    },
    {
      type: 'scatter',
      mode: 'lines',
      name: 'Buy & Hold',
      x: strategyData.map((r) => r.Date),
      y: strategyData.map((r) => r.cum_benchmark),
      line: { color: '#636efa', width: 2, dash: 'dash' },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Parameters */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6 text-primary">⚙️ Strategy Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Threshold Slider */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Signal Threshold: {threshold.toFixed(3)}
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Only enter positions when |predicted alpha| exceeds threshold
            </p>
            <input
              type="range"
              min="-0.05"
              max="0.05"
              step="0.001"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-0.05</span>
              <span>0</span>
              <span>0.05</span>
            </div>
          </div>

          {/* Transaction Cost Slider */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Transaction Cost: {transactionCost.toFixed(2)}%
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Cost incurred on each position change (buy/sell)
            </p>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={transactionCost}
              onChange={(e) => setTransactionCost(parseFloat(e.target.value))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>0.25%</span>
              <span>0.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Strategy Return"
            value={`${metrics.total_return.toFixed(2)}%`}
            subtitle="Out-of-sample"
            icon="📈"
            valueColor={metrics.total_return > 0 ? '#00ff00' : '#ff0000'}
          />
          <MetricCard
            title="Benchmark Return"
            value={`${metrics.benchmark_return.toFixed(2)}%`}
            subtitle="Buy & Hold"
            icon="📊"
          />
          <MetricCard
            title="Excess Return"
            value={`${metrics.excess_return.toFixed(2)}%`}
            subtitle="Alpha generated"
            icon="⭐"
            valueColor={metrics.excess_return > 0 ? '#00ff00' : '#ff0000'}
          />
          <MetricCard
            title="Sharpe Ratio"
            value={metrics.sharpe_ratio.toFixed(2)}
            subtitle="Risk-adjusted"
            icon="📉"
          />
        </div>
      )}

      {/* Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4">
        <ChartWrapper
          data={chartData}
          layout={{
            title: 'Cumulative Returns: Strategy vs Buy & Hold',
            xaxis: { title: 'Date' },
            yaxis: { title: 'Cumulative Return' },
            height: 500,
            hovermode: 'x unified',
          }}
        />
      </div>

      {/* Additional Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Volatility</div>
            <div className="text-2xl font-bold">{metrics.volatility.toFixed(2)}%</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Max Drawdown</div>
            <div className="text-2xl font-bold text-red-400">{metrics.max_drawdown.toFixed(2)}%</div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Win Rate</div>
            <div className="text-2xl font-bold">{metrics.win_rate.toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}