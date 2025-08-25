import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { saveTwelveLabsMetadata, updateTwelveLabsStatus, getTwelveLabsMetadata } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [Supabase Test] Starting database connectivity test');
    
    // Test 1: Environment Variables
    console.log('📋 Environment Check:');
    console.log('  - SUPABASE_URL:', env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('  - SUPABASE_SERVICE_KEY:', env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
    
    // Test 2: Basic connectivity with a simple query
    console.log('🔌 Testing basic connectivity...');
    try {
      const testUrl = `${env.SUPABASE_URL}/rest/v1/media_twelvelabs?limit=1`;
      const testResponse = await fetch(testUrl, {
        headers: {
          apikey: env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          Accept: 'application/json',
        },
      });
      
      console.log('  - Response status:', testResponse.status, testResponse.statusText);
      const responseText = await testResponse.text();
      console.log('  - Response body length:', responseText.length);
      
      if (!testResponse.ok) {
        console.error('  - ❌ Basic connectivity failed:', responseText);
        return NextResponse.json({
          error: 'Basic connectivity failed',
          details: responseText,
          status: testResponse.status,
        }, { status: 500 });
      } else {
        console.log('  - ✅ Basic connectivity successful');
      }
    } catch (connectivityError) {
      console.error('  - ❌ Connectivity exception:', connectivityError);
      return NextResponse.json({
        error: 'Connectivity exception',
        details: connectivityError instanceof Error ? connectivityError.message : String(connectivityError),
      }, { status: 500 });
    }
    
    // Test 3: Test INSERT operation
    console.log('💾 Testing INSERT operation...');
    const testUserId = 'test-user-123';
    const testProjectId = 'test-project-' + Date.now();
    const testMediaId = 'test-media-' + Date.now();
    
    try {
      const saveResult = await saveTwelveLabsMetadata(testUserId, testProjectId, testMediaId, {
        indexId: 'test-index-123',
        videoId: 'test-video-123',
        taskId: 'test-task-123',
        status: 'testing',
        filename: 'test-video.mp4',
      });
      
      if (saveResult.error) {
        console.error('  - ❌ INSERT failed:', saveResult.error);
        return NextResponse.json({
          error: 'INSERT operation failed',
          details: saveResult.error,
        }, { status: 500 });
      } else {
        console.log('  - ✅ INSERT successful');
      }
    } catch (insertError) {
      console.error('  - ❌ INSERT exception:', insertError);
      return NextResponse.json({
        error: 'INSERT operation exception',
        details: insertError instanceof Error ? insertError.message : String(insertError),
      }, { status: 500 });
    }
    
    // Test 4: Test UPDATE operation
    console.log('🔄 Testing UPDATE operation...');
    try {
      const updateResult = await updateTwelveLabsStatus(testMediaId, testProjectId, {
        status: 'ready',
        duration: 120,
        width: 1920,
        height: 1080,
      });
      
      if (updateResult.error) {
        console.error('  - ❌ UPDATE failed:', updateResult.error);
        return NextResponse.json({
          error: 'UPDATE operation failed',
          details: updateResult.error,
        }, { status: 500 });
      } else {
        console.log('  - ✅ UPDATE successful');
      }
    } catch (updateError) {
      console.error('  - ❌ UPDATE exception:', updateError);
      return NextResponse.json({
        error: 'UPDATE operation exception',
        details: updateError instanceof Error ? updateError.message : String(updateError),
      }, { status: 500 });
    }
    
    // Test 5: Test SELECT operation
    console.log('🔍 Testing SELECT operation...');
    try {
      const selectResult = await getTwelveLabsMetadata(testProjectId, [testMediaId]);
      console.log('  - ✅ SELECT successful, records found:', selectResult.length);
    } catch (selectError) {
      console.error('  - ❌ SELECT exception:', selectError);
      return NextResponse.json({
        error: 'SELECT operation exception',
        details: selectError instanceof Error ? selectError.message : String(selectError),
      }, { status: 500 });
    }
    
    console.log('🎉 All database tests passed!');
    return NextResponse.json({
      success: true,
      message: 'All database operations successful',
      testData: {
        userId: testUserId,
        projectId: testProjectId,
        mediaId: testMediaId,
      },
    });
    
  } catch (error) {
    console.error('🚨 Database test failed:', error);
    return NextResponse.json({
      error: 'Database test failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}