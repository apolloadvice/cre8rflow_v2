import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { uploadVideoToIndex, TwelveLabsApiError } from '@/lib/twelvelabs';
import { saveTwelveLabsMetadata } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Environment check at startup:');
    console.log('  - SUPABASE_URL available:', !!process.env.SUPABASE_URL);
    console.log('  - SUPABASE_SERVICE_KEY available:', !!process.env.SUPABASE_SERVICE_KEY);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    
    // Temporary bypass for testing - remove when ready for production
    // HARDCODED TO TRUE FOR DEBUGGING - REMOVE LATER
    const bypassAuth = true; // process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    let userId: string;
    
    if (bypassAuth) {
      userId = 'test-user-123';
    } else {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      userId = session.user.id;
    }

    const formData = await request.formData();
    const videoFile = formData.get('video_file') as File;
    const indexId = formData.get('index_id') as string;
    const projectId = formData.get('project_id') as string;
    const mediaId = formData.get('media_id') as string;

    if (!videoFile || !indexId || !projectId || !mediaId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('📁 Upload debug info:');
    console.log('  - videoFile.name:', videoFile.name);
    console.log('  - videoFile.type:', videoFile.type);
    console.log('  - videoFile.size:', videoFile.size);

    // Validate file type - be more lenient for testing
    if (!videoFile.type.startsWith('video/') && !videoFile.name?.endsWith('.mp4')) {
      return NextResponse.json(
        { error: `Only video files are supported. Got type: ${videoFile.type}, name: ${videoFile.name}` },
        { status: 400 }
      );
    }

    // Check file size (max 2GB as per Twelve Labs requirements)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 2GB limit' },
        { status: 400 }
      );
    }

    const metadata = {
      projectId,
      mediaId,
      uploadedAt: new Date().toISOString(),
    };

    try {
      const result = await uploadVideoToIndex(indexId, videoFile, metadata);
      
      // Save TwelveLabs metadata to Supabase for persistence (even when bypassing auth)
      console.log('🔍 DEBUG: About to save TwelveLabs metadata to Supabase');
      console.log('  - userId:', userId);
      console.log('  - projectId:', projectId);
      console.log('  - mediaId:', mediaId);
      console.log('  - indexId:', indexId);
      console.log('  - result.videoId:', result.videoId);
      console.log('  - result.taskId:', result.taskId);
      console.log('  - filename:', videoFile.name);
      
      try {
        const supabaseResult = await saveTwelveLabsMetadata(userId, projectId, mediaId, {
          indexId,
          videoId: result.videoId,
          taskId: result.taskId,
          status: 'uploading',
          filename: videoFile.name,
        });
        
        console.log('✅ Supabase save result:', {
          data: supabaseResult.data,
          error: supabaseResult.error,
          hasData: !!supabaseResult.data,
          hasError: !!supabaseResult.error
        });
        
        if (supabaseResult.error) {
          console.error('❌ Supabase returned an error:', supabaseResult.error);
          // For debugging: Make Supabase errors more visible
          console.error('❌ CRITICAL: Failed to save TwelveLabs metadata to Supabase');
          console.error('  - This means the media_twelvelabs table will not be updated');
          console.error('  - Check RLS policies and environment variables');
          console.error('  - Error details:', JSON.stringify(supabaseResult.error, null, 2));
        } else {
          console.log('✅ Successfully saved TwelveLabs metadata to Supabase');
        }
      } catch (supabaseError) {
        console.error('❌ Exception while saving TwelveLabs metadata to Supabase:');
        console.error('  - Error type:', typeof supabaseError);
        console.error('  - Error message:', supabaseError instanceof Error ? supabaseError.message : String(supabaseError));
        console.error('  - Full error:', supabaseError);
        console.error('❌ CRITICAL: Supabase save operation failed with exception');
        console.error('  - This means the media_twelvelabs table will not be updated');
        console.error('  - Check database connectivity and RLS policies');
        // Don't fail the upload if Supabase save fails - continue with response
      }
      
      return NextResponse.json({
        taskId: result.taskId,
        videoId: result.videoId,
        status: 'uploading',
      });
    } catch (error) {
      console.error('Failed to upload video to Twelve Labs:', error);
      
      if (error instanceof TwelveLabsApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }

      // Handle specific Twelve Labs errors
      if (error instanceof Error) {
        if (error.message.includes('video_resolution_too_low')) {
          return NextResponse.json(
            { error: 'Video resolution is too low. Minimum 360x360 required.' },
            { status: 400 }
          );
        }
        if (error.message.includes('video_duration_too_short')) {
          return NextResponse.json(
            { error: 'Video is too short. Minimum 10 seconds required.' },
            { status: 400 }
          );
        }
        if (error.message.includes('usage_limit_exceeded')) {
          return NextResponse.json(
            { error: 'Twelve Labs usage limit exceeded.' },
            { status: 429 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to upload video for indexing' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}