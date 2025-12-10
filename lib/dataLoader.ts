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

  constructor() {
    this.useApi = process.env.NEXT_PUBLIC_USE_API === 'true';
  }

  private async fetchFile(filename: string): Promise<string> {
    if (this.useApi) {
      // S3 via server API
      const response = await fetch(`/api/data?file=${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.statusText}`);
      }
      return await response.text();
    } else {
      // Local public folder
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.statusText}`);
      }
      return await response.text();
    }
  }

  async loadCSV(filename: string): Promise<DataRow[]> {
    const csvContent = await this.fetchFile(filename);

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

  async loadModelInfo(filename: string): Promise<ModelInfo> {
    const jsonContent = await this.fetchFile(filename);
    return JSON.parse(jsonContent);
  }

  async loadAll(csvFilename: string, jsonFilename: string): Promise<{ data: DataRow[]; modelInfo: ModelInfo }> {
    const [data, modelInfo] = await Promise.all([
      this.loadCSV(csvFilename),
      this.loadModelInfo(jsonFilename),
    ]);
    return { data, modelInfo };
  }
}

// Singleton
let dataLoader: DataLoader | null = null;

export function getDataLoader(): DataLoader {
  if (!dataLoader) {
    dataLoader = new DataLoader();
  }
  return dataLoader;
}

export async function loadAllData(csvFilename: string, jsonFilename: string) {
  const loader = getDataLoader();
  return await loader.loadAll(csvFilename, jsonFilename);
}
