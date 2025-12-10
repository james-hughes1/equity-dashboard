/**
 * Data loading utilities for CSV and JSON
 */
import Papa from 'papaparse';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
  private useS3: boolean;
  private s3Client?: S3Client;
  private bucket?: string;
  private csvPath: string;
  private jsonPath: string;

  constructor() {
    this.useS3 = process.env.NEXT_PUBLIC_USE_S3 === 'true';
    this.csvPath = process.env.NEXT_PUBLIC_CSV_PATH || '/data/dashboard_output.csv';
    this.jsonPath = process.env.NEXT_PUBLIC_JSON_PATH || '/data/model.json';

    if (this.useS3) {
      this.bucket = process.env.NEXT_PUBLIC_S3_BUCKET;
      this.s3Client = new S3Client({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
  }

  private async loadFromS3(key: string): Promise<string> {
    if (!this.s3Client || !this.bucket) {
      throw new Error('S3 not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    const str = await response.Body?.transformToString();
    return str || '';
  }

  private async loadFromLocal(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return await response.text();
  }

  async loadCSV(): Promise<DataRow[]> {
    const csvContent = this.useS3
      ? await this.loadFromS3(this.csvPath)
      : await this.loadFromLocal(this.csvPath);

    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as DataRow[];
          // Sort by date
          data.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
          resolve(data);
        },
        error: (error) => reject(error),
      });
    });
  }

  async loadModelInfo(): Promise<ModelInfo> {
    const jsonContent = this.useS3
      ? await this.loadFromS3(this.jsonPath)
      : await this.loadFromLocal(this.jsonPath);

    return JSON.parse(jsonContent);
  }

  async loadAll(): Promise<{ data: DataRow[]; modelInfo: ModelInfo }> {
    const [data, modelInfo] = await Promise.all([
      this.loadCSV(),
      this.loadModelInfo(),
    ]);

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