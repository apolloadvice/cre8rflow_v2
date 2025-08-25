import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking RLS status and policies for media_twelvelabs table');
    
    // Check if RLS is enabled
    const rlsStatusQuery = `
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename = 'media_twelvelabs';
    `;
    
    const rlsResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: rlsStatusQuery }),
    });
    
    let rlsInfo = 'Could not determine RLS status';
    if (rlsResponse.ok) {
      const rlsData = await rlsResponse.json();
      rlsInfo = JSON.stringify(rlsData, null, 2);
    } else {
      console.log('RLS status query failed, checking with direct table query instead');
    }
    
    // Check current policies
    const policiesQuery = `
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'media_twelvelabs';
    `;
    
    const policiesResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: policiesQuery }),
    });
    
    let policiesInfo = 'Could not determine policies';
    if (policiesResponse.ok) {
      const policiesData = await policiesResponse.json();
      policiesInfo = JSON.stringify(policiesData, null, 2);
    }
    
    // Test a simple count query to see if RLS affects it
    const countResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/media_twelvelabs?select=count`, {
      method: 'HEAD',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    });
    
    const countInfo = {
      status: countResponse.status,
      statusText: countResponse.statusText,
      accessible: countResponse.ok,
    };
    
    console.log('RLS Status:', rlsInfo);
    console.log('Policies:', policiesInfo);
    console.log('Table Access:', countInfo);
    
    return NextResponse.json({
      rlsStatus: rlsInfo,
      policies: policiesInfo,
      tableAccess: countInfo,
      message: 'RLS and policy information retrieved',
    });
    
  } catch (error) {
    console.error('Failed to check RLS status:', error);
    return NextResponse.json({
      error: 'Failed to check RLS status',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}