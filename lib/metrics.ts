/**
 * Performance metrics calculations
 */
import { DataRow, ModelInfo } from "./dataLoader";

export interface SignalMetrics {
  hit_rate: number;
  correlation: number;
  ic: number;
  r2_oos: number;
  rmse_oos: number;
  n_oos: number;
}

export interface StrategyMetrics {
  total_return: number;
  benchmark_return: number;
  excess_return: number;
  sharpe_ratio: number;
  volatility: number;
  max_drawdown: number;
  win_rate: number;
}

export interface StrategyRow extends DataRow {
  signal: number;
  position_change: number;
  stock_return: number;
  strategy_return: number;
  cum_strategy: number;
  cum_benchmark: number;
}

export class MetricsCalculator {
  static calculateSignalMetrics(
    data: DataRow[],
    modelInfo: ModelInfo,
  ): SignalMetrics {
    const oosDate = new Date(modelInfo.oos_cutoff_date);
    const oosData = data.filter((row) => new Date(row.Date) >= oosDate);

    // Hit rate (direction accuracy)
    let correctDirections = 0;
    oosData.forEach((row) => {
      const actualDir = Math.sign(row.alpha_fwd_1);
      const predDir = Math.sign(row.pred_alpha_fwd_1);
      if (actualDir === predDir) correctDirections++;
    });
    const hit_rate = correctDirections / oosData.length;

    // Correlation
    const correlation = this.pearsonCorrelation(
      oosData.map((r) => r.alpha_fwd_1),
      oosData.map((r) => r.pred_alpha_fwd_1),
    );

    return {
      hit_rate,
      correlation,
      ic: correlation, // Information Coefficient
      r2_oos: modelInfo.walk_forward.r2_oos,
      rmse_oos: modelInfo.walk_forward.rmse_oos,
      n_oos: oosData.length,
    };
  }

  static calculateStrategyReturns(
    data: DataRow[],
    modelInfo: ModelInfo,
    buyThreshold: number = 0.03,
    sellThreshold: number = -0.03,
    transactionCost: number = 0.001,
  ): StrategyRow[] {
    const oosDate = new Date(modelInfo.oos_cutoff_date);
    const oosData = data.filter((row) => new Date(row.Date) >= oosDate);

    const strategyData: StrategyRow[] = [];
    let prevSignal = 0;
    let cumStrategy = 1;
    let cumBenchmark = 1;

    for (let i = 0; i < oosData.length; i++) {
      const row = oosData[i];

      // Dual thresholds
      let signal = 0;
      if (row.pred_alpha_fwd_1 > buyThreshold) {
        signal = 1;
      } else if (row.pred_alpha_fwd_1 < sellThreshold) {
        signal = -1;
      }

      // Position change (for transaction costs)
      const position_change = Math.abs(signal - prevSignal);

      // Stock return
      const stock_return =
        i > 0 ? (row.SBUX - oosData[i - 1].SBUX) / oosData[i - 1].SBUX : 0;

      // Strategy return
      let strategy_return = i > 0 ? prevSignal * stock_return : 0;
      strategy_return -= position_change * transactionCost;

      // Update cumulative returns
      cumStrategy *= 1 + strategy_return;
      cumBenchmark *= 1 + stock_return;

      strategyData.push({
        ...row,
        signal,
        position_change,
        stock_return,
        strategy_return,
        cum_strategy: cumStrategy,
        cum_benchmark: cumBenchmark,
      });

      prevSignal = signal;
    }

    return strategyData;
  }

  static calculateStrategyMetrics(
    strategyData: StrategyRow[],
  ): StrategyMetrics {
    if (strategyData.length === 0) {
      return {
        total_return: 0,
        benchmark_return: 0,
        excess_return: 0,
        sharpe_ratio: 0,
        volatility: 0,
        max_drawdown: 0,
        win_rate: 0,
      };
    }

    const lastRow = strategyData[strategyData.length - 1];

    // Total returns
    const total_return = (lastRow.cum_strategy - 1) * 100;
    const benchmark_return = (lastRow.cum_benchmark - 1) * 100;
    const excess_return = total_return - benchmark_return;

    // Risk metrics
    const returns = strategyData.map((r) => r.strategy_return);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(52) * 100; // Annualized
    const sharpe_ratio = (mean / Math.sqrt(variance)) * Math.sqrt(52);

    // Max drawdown
    let maxDrawdown = 0;
    let peak = strategyData[0].cum_strategy;
    strategyData.forEach((row) => {
      if (row.cum_strategy > peak) peak = row.cum_strategy;
      const drawdown = (row.cum_strategy - peak) / peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    });

    // Win rate
    const wins = returns.filter((r) => r > 0).length;
    const win_rate = (wins / returns.length) * 100;

    return {
      total_return,
      benchmark_return,
      excess_return,
      sharpe_ratio,
      volatility,
      max_drawdown: maxDrawdown * 100,
      win_rate,
    };
  }

  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
