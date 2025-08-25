import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { analyzeVideo, searchVideos, TwelveLabsApiError } from '@/lib/twelvelabs';

export async function POST(request: NextRequest) {
  try {
    // Temporary bypass for testing - remove when ready for production
    const bypassAuth = process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    
    if (!bypassAuth) {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { action, videoId, indexId, query, prompt } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action field is required' },
        { status: 400 }
      );
    }

    try {
      if (action === 'analyze' && videoId) {
        const analysis = await analyzeVideo(videoId, prompt);
        return NextResponse.json({ analysis });
      }

      if (action === 'search' && indexId && query) {
        const results = await searchVideos(indexId, query);
        return NextResponse.json({ results });
      }

      return NextResponse.json(
        { error: 'Invalid action or missing required parameters' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Failed to perform analysis:', error);
      if (error instanceof TwelveLabsApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      return NextResponse.json(
        { error: 'Failed to analyze video' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Analyze API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}