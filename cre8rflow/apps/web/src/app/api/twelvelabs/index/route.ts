import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@opencut/auth';
import { createUserIndex, findExistingIndex } from '@/lib/twelvelabs';
import { supabaseInsert, supabaseSelectOne, type UserIndexRow } from '@/lib/supabase';

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
  console.log('🚀 API ROUTE HIT: /api/twelvelabs/index');
  console.log('📊 Environment variables:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - BYPASS_AUTH_FOR_TESTING:', process.env.BYPASS_AUTH_FOR_TESTING);
  console.log('  - TWELVELABS_API_KEY:', process.env.TWELVELABS_API_KEY ? 'SET' : 'NOT SET');
  
  try {
    // Temporary bypass for testing - remove when ready for production
    // HARDCODED TO TRUE FOR DEBUGGING - REMOVE LATER
    const bypassAuth = true; // process.env.BYPASS_AUTH_FOR_TESTING === 'true';
    console.log('🔍 bypassAuth HARDCODED to:', bypassAuth);
    let userId: string;
    
    if (bypassAuth) {
      console.log('🔓 BYPASS: Auth bypassed for testing');
      userId = 'test-user-123';
    } else {
      // Production auth flow
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      userId = session.user.id;
    }

    // Common logic for both bypass and production modes
    const expectedIndexName = `opencut_user_${userId}`;
    
    try {
      // Step 1: Try to find existing mapping in Supabase (skip in bypass mode)
      let existing: UserIndexRow | null = null;
      
      if (!bypassAuth) {
        try {
          existing = await supabaseSelectOne<UserIndexRow>('user_indexes', {
            user_id: userId,
          });
          console.log('📊 Supabase lookup result:', existing ? 'Found mapping' : 'No mapping found');
        } catch (error) {
          console.error('Failed to query Supabase for existing index:', error);
          // Continue without existing mapping
          existing = null;
        }
      } else {
        console.log('🔓 BYPASS: Skipping Supabase lookup');
      }

      if (existing) {
        console.log('✅ Found existing mapping in Supabase:', existing);
        return NextResponse.json({
          indexId: existing.index_id,
          indexName: existing.index_name,
        });
      }

      // Step 2: Check if index exists in TwelveLabs directly
      console.log('🔍 No Supabase mapping found, checking TwelveLabs for existing index:', expectedIndexName);
      const existingTLIndex = await findExistingIndex(expectedIndexName);

      if (existingTLIndex) {
        console.log('✅ Found existing index in TwelveLabs, reusing:', existingTLIndex);
        
        // Step 3: Create Supabase mapping for the existing index (if not in bypass mode)
        if (!bypassAuth) {
          try {
            const insert = await supabaseInsert<UserIndexRow>('user_indexes', {
              user_id: userId,
              index_id: existingTLIndex.id,
              index_name: existingTLIndex.name,
            });

            if (insert.error) {
              console.error('Failed to persist existing index mapping:', insert.error);
              // Don't fail the request, just log the error
            } else {
              console.log('✅ Created Supabase mapping for existing TwelveLabs index');
            }
          } catch (error) {
            console.error('Failed to persist existing index mapping:', error);
            // Don't fail the request, just continue
          }
        }

        return NextResponse.json({
          indexId: existingTLIndex.id,
          indexName: existingTLIndex.name,
        });
      }

      // Step 4: Only create new index if it doesn't exist anywhere
      console.log('🆕 No existing index found, creating new TwelveLabs index');
      const index = await createUserIndex(userId);
      console.log(`✅ Created new TwelveLabs index: ${index.id} (${index.name})`);

      // Persist the new index mapping to Supabase (if not in bypass mode)
      if (!bypassAuth) {
        try {
          const insert = await supabaseInsert<UserIndexRow>('user_indexes', {
            user_id: userId,
            index_id: index.id,
            index_name: index.name,
          });

          if (insert.error) {
            console.error('Failed to persist new index mapping:', insert.error);
            return NextResponse.json(
              { error: 'Failed to persist user index mapping' },
              { status: 500 }
            );
          }
          console.log('✅ Persisted new index mapping to Supabase');
        } catch (error) {
          console.error('Failed to persist new index mapping:', error);
          return NextResponse.json(
            { error: 'Failed to persist user index mapping' },
            { status: 500 }
          );
        }
      } else {
        console.log('🔓 BYPASS: Skipping Supabase persistence for new index');
      }

      return NextResponse.json({
        indexId: index.id,
        indexName: index.name,
      });
    } catch (error) {
      console.error('Failed to create Twelve Labs index:', error);
      return NextResponse.json(
        { 
          error: 'Failed to create index', 
          details: (error as any)?.message || 'Unknown error',
          stack: (error as any)?.stack?.split('\n')[0] 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Index API error:', error);
    console.error('Error details:', {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    });
    return NextResponse.json(
      { error: 'Internal server error', details: (error as any)?.message },
      { status: 500 }
    );
  }
}