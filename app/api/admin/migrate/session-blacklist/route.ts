import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    console.log('Running session blacklist migration...');
    
    // Create session_blacklist table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS session_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invalidated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reason VARCHAR(100) DEFAULT 'logout',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_session_blacklist_token_hash 
      ON session_blacklist(token_hash)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_session_blacklist_user_id 
      ON session_blacklist(user_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_session_blacklist_invalidated_at 
      ON session_blacklist(invalidated_at)
    `);
    
    // Create cleanup function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION cleanup_old_sessions()
      RETURNS void AS $$
      BEGIN
          DELETE FROM session_blacklist 
          WHERE invalidated_at < NOW() - INTERVAL '30 days';
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Session blacklist migration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Session blacklist migration completed successfully',
      details: {
        table: 'session_blacklist',
        indexes: ['token_hash', 'user_id', 'invalidated_at'],
        function: 'cleanup_old_sessions()'
      }
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
