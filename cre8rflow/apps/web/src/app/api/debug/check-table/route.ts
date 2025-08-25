import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking recent entries in media_twelvelabs table');
    
    // Get recent records from media_twelvelabs table
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/media_twelvelabs?order=created_at.desc&limit=10`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        Accept: 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to fetch table data:', error);
      return NextResponse.json({
        error: 'Failed to fetch table data',
        details: error,
        status: response.status,
      }, { status: 500 });
    }
    
    const data = await response.json();
    console.log(`Found ${data.length} records in media_twelvelabs table`);
    
    return NextResponse.json({
      success: true,
      recordCount: data.length,
      records: data,
      message: `Found ${data.length} records in the media_twelvelabs table`,
    });
    
  } catch (error) {
    console.error('Failed to check table:', error);
    return NextResponse.json({
      error: 'Failed to check table',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}