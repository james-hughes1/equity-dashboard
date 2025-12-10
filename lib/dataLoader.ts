import Papa from 'papaparse';

export interface ModelInfo {
  walk_forward: {
    r2_oos: number;
    rmse_oos: number;
    n_oos: number;
  };
  model_type: string;
  model_params: {
    type: string;
    alpha: number;
    fit_intercept: boolean;
  };
  n_rows: number;
  train_window: number;
  horizon: number;
  features_used: string[];
  target_col: string;
  predicted_col: string;
  oos_cutoff_date: string;
}

export interface DataRow {
  Date: string;
  alpha_fwd_1: number;
  pred_alpha_fwd_1: number;
  SBUX: number;
  SPY: number;
  [key: string]: any;
}

class DataLoader {
  private useApi: boolean;
  private csvPath: string;
  private jsonPath: string;

  constructor() {
    // Use API route for S3 if NEXT_PUBLIC_USE_API=true
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

    // Local paths for public files, configurable via env vars
    this.csvPath = process.env.NEXT_PUBLIC_CSV_PATH || '/data/dashboard_output.csv';
    this.jsonPath = process.env.NEXT_PUBLIC_JSON_PATH || '/data/model.json';
  }

  private async loadFromApi(filename: string): Promise<string> {
    const response = await fetch(`/api/data?file=${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }
    return await response.text();
  }

  private async loadFromPublic(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.text();
  }

  async loadCSV(): Promise<DataRow[]> {
    const csvContent = this.useApi
      ? await this.loadFromApi(this.csvPath.replace(/^\/data\//, '')) // Strip /data/ for API filename
      : await this.loadFromPublic(this.csvPath);

    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as DataRow[];
          data.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
          resolve(data);
        },
        error: (error: unknown) => reject(error),
      });
    });
  }

  async loadModelInfo(): Promise<ModelInfo> {
    const jsonContent = this.useApi
      ? await this.loadFromApi(this.jsonPath.replace(/^\/data\//, '')) // Strip /data/ for API filename
      : await this.loadFromPublic(this.jsonPath);

    return JSON.parse(jsonContent);
  }

  async loadAll(): Promise<{ data: DataRow[]; modelInfo: ModelInfo }> {
    const [data, modelInfo] = await Promise.all([this.loadCSV(), this.loadModelInfo()]);
    return { data, modelInfo };
  }
}

// Singleton instance
let dataLoader: DataLoader | null = null;

export function getDataLoader(): DataLoader {
  if (!dataLoader) {
    dataLoader = new DataLoader();
  }
  return dataLoader;
}

export async function loadAllData() {
  const loader = getDataLoader();
  return await loader.loadAll();
}
