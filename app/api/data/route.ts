/**
 * Server-side API route to fetch data from private S3 bucket
 * This keeps AWS credentials secure on the server
 */
import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Server-side only environment variables (no NEXT_PUBLIC_)
const USE_S3 = process.env.USE_S3 === 'true';
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

let s3Client: S3Client | null = null;

if (USE_S3) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID || '',
      secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  if (!file) {
    return NextResponse.json({ error: 'File parameter required' }, { status: 400 });
  }

  try {
    if (USE_S3 && s3Client && S3_BUCKET) {
      // Fetch from private S3 bucket
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: file,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();

      if (!content) {
        return NextResponse.json({ error: 'No content' }, { status: 404 });
      }

      // Determine content type
      const contentType = file.endsWith('.json') 
        ? 'application/json' 
        : 'text/csv';

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } else {
      // Fetch from local public folder
      const localPath = `/data/${file}`;
      const response = await fetch(`${request.headers.get('host')}${localPath}`);
      
      if (!response.ok) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const content = await response.text();
      const contentType = file.endsWith('.json') 
        ? 'application/json' 
        : 'text/csv';

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}