import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { uploadVideoToIndex } from '@/lib/twelvelabs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Validate file type
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only video files are supported' },
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