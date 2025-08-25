import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { getTaskStatus, TwelveLabsApiError } from '@/lib/twelvelabs';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'task_id parameter is required' },
        { status: 400 }
      );
    }

    try {
      const task = await getTaskStatus(taskId);
      
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