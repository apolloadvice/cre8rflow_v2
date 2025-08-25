import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { getTaskStatus } from '@/lib/twelvelabs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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