import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { getTaskStatus, TwelveLabsApiError } from '@/lib/twelvelabs';
import { updateTwelveLabsStatus } from '@/lib/supabase';

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
    const taskId = searchParams.get('task_id');
    const projectId = searchParams.get('project_id');
    const mediaId = searchParams.get('media_id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'task_id parameter is required' },
        { status: 400 }
      );
    }

    try {
      const task = await getTaskStatus(taskId);
      
      // Update Supabase with latest status (if project_id and media_id are provided)
      if (projectId && mediaId) {
        try {
          const updateResult = await updateTwelveLabsStatus(mediaId, projectId, {
            status: task.status,
            videoId: task.video_id,
            duration: task.system_metadata?.duration,
            filename: task.system_metadata?.filename,
            width: task.system_metadata?.width,
            height: task.system_metadata?.height,
            videoUrl: task.hls?.video_url,
            thumbnailUrls: task.hls?.thumbnail_urls,
          });
          
          if (updateResult.error) {
            console.error('❌ CRITICAL: Failed to update TwelveLabs status in Supabase');
            console.error('  - This means status changes are not being persisted');
            console.error('  - Check if initial record exists and RLS policies allow updates');
            console.error('  - Error details:', JSON.stringify(updateResult.error, null, 2));
          } else {
            console.log('✅ Updated TwelveLabs status in Supabase');
          }
        } catch (supabaseError) {
          console.error('❌ Exception while updating TwelveLabs status in Supabase:', supabaseError);
          console.error('❌ CRITICAL: Supabase update operation failed with exception');
          console.error('  - This means status changes are not being persisted');
          console.error('  - Check database connectivity and RLS policies');
          // Don't fail the status request if Supabase update fails
        }
      }
      
      return NextResponse.json({
        taskId: task.id,
        videoId: task.video_id,
        status: task.status,
        systemMetadata: task.system_metadata,
        hls: task.hls,
        updatedAt: task.updated_at,
      });
    } catch (error) {
      console.error('Failed to get task status:', error);
      if (error instanceof TwelveLabsApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      return NextResponse.json(
        { error: 'Failed to retrieve task status' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}