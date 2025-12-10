import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const USE_S3 = process.env.USE_S3 === 'true';
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

let s3Client: S3Client | null = null;
if (USE_S3 && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  });
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file) return NextResponse.json({ error: 'File parameter required' }, { status: 400 });

  try {
    let content = '';
    let contentType = file.endsWith('.json') ? 'application/json' : 'text/csv';

    if (USE_S3 && s3Client && S3_BUCKET) {
      // Fetch from S3
      const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: file });
      const response = await s3Client.send(command);

      if (!response.Body) throw new Error('S3 returned empty body');
      content = await streamToString(response.Body as Readable);
    } else {
      // Fetch from local public folder
      const filePath = path.join(process.cwd(), 'public', 'data', file);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      content = fs.readFileSync(filePath, 'utf-8');
    }

    return new NextResponse(content, {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('Error fetching data:', err);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
