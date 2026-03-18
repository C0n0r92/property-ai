import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_URL = process.env.NEXT_PUBLIC_DATA_URL || 'https://irishpropertydata.com/data.json';

let cachedData: unknown = null;
let cacheTime = 0;
const CACHE_DURATION = 3600000; // 1 hour

export async function GET() {
  const now = Date.now();

  // Return cached data if still fresh
  if (cachedData && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  // Try local file first (in public folder)
  try {
    const filePath = path.join(process.cwd(), 'public', 'data.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    cachedData = JSON.parse(fileContent);
    cacheTime = now;
    return NextResponse.json(cachedData);
  } catch (localError) {
    console.warn('Local data.json not found, trying external URL');
  }

  // Fallback to external URL
  try {
    const response = await fetch(DATA_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    cachedData = await response.json();
    cacheTime = now;

    return NextResponse.json(cachedData);
  } catch (error) {
    console.error('Error loading data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}
