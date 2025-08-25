import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { db } from '@opencut/db';
import { eq } from 'drizzle-orm';
import { createUserIndex } from '@/lib/twelvelabs';

// Mock user index table - you'll need to create this in your database schema
// const userIndexes = pgTable('user_indexes', {
//   id: text('id').primaryKey().notNull(),
//   userId: text('user_id').notNull(),
//   indexId: text('index_id').notNull(),
//   indexName: text('index_name').notNull(),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   updatedAt: timestamp('updated_at').defaultNow().notNull(),
// });

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // For now, we'll store the index mapping in a simple way
    // In production, you should create a proper database table
    
    // Check if user already has an index
    const existingIndexKey = `twelvelabs:index:${userId}`;
    
    // This is a placeholder - you'll need to implement proper database storage
    // For now, create a new index each time (not recommended for production)
    
    try {
      const index = await createUserIndex(userId);
      
      return NextResponse.json({
        indexId: index.id,
        indexName: index.name,
      });
    } catch (error) {
      console.error('Failed to create Twelve Labs index:', error);
      return NextResponse.json(
        { error: 'Failed to create index' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Index API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}