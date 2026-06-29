import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    console.log('Updating session_blacklist table...');
    
    // Add reason column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE session_blacklist 
      ADD COLUMN IF NOT EXISTS reason VARCHAR(100) DEFAULT 'logout';
    `);
    
    // Update existing records to have default reason
    await db.execute(sql`
      UPDATE session_blacklist 
      SET reason = 'logout' 
      WHERE reason IS NULL;
    `);
    
    console.log('Session blacklist table updated successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Session blacklist table updated successfully'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
