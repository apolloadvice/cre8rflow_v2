import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { uploadVideoToIndex, TwelveLabsApiError } from '@/lib/twelvelabs';

export async function POST(request: NextRequest) {
  try {
    // Temporary bypass for testing - remove when ready for production
    // HARDCODED TO TRUE FOR DEBUGGING - REMOVE LATER
    const bypassAuth = true; // process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    
    if (!bypassAuth) {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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