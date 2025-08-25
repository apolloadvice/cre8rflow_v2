import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { getTwelveLabsMetadata } from '@/lib/supabase';
import type { IndexingStatus } from '@/types/twelvelabs';

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const mediaIdsParam = searchParams.get('media_ids');

    if (!projectId || !mediaIdsParam) {
      return NextResponse.json(
        { error: 'project_id and media_ids parameters are required' },
        { status: 400 }
      );
    }

    const mediaIds = mediaIdsParam.split(',').filter(Boolean);

    try {
      const twelveLabsData = await getTwelveLabsMetadata(projectId, mediaIds);
      
      // Transform the data to match the frontend format
      const restoredStatus = twelveLabsData.reduce((acc, item) => {
        acc[item.media_id] = {
          twelveLabsVideoId: item.video_id,
          twelveLabsTaskId: item.task_id,
          indexingStatus: item.status as IndexingStatus,
          indexingError: item.error_message,
          // Include metadata for potential use
          metadata: {
            duration: item.duration ? parseInt(item.duration, 10) : undefined,
            filename: item.filename,
            width: item.width ? parseInt(item.width, 10) : undefined,
            height: item.height ? parseInt(item.height, 10) : undefined,
            videoUrl: item.video_url,
            thumbnailUrls: item.thumbnail_urls ? JSON.parse(item.thumbnail_urls) : undefined,
          },
        };
        return acc;
      }, {} as Record<string, any>);

      console.log(`✅ Restored TwelveLabs status for ${Object.keys(restoredStatus).length} media items`);
      
      return NextResponse.json({
        restoredStatus,
        count: Object.keys(restoredStatus).length,
      });
    } catch (error) {
      console.error('Failed to restore TwelveLabs status:', error);
      return NextResponse.json(
        { error: 'Failed to restore TwelveLabs status' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Restore status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}