import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log("Debug endpoint: Checking authentication");
    
    const user = await getCurrentUser();
    
    if (!user) {
      console.log("Debug endpoint: No user found - returning 401");
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'No valid session found',
          authenticated: false,
          debug: 'getCurrentUser() returned null'
        }, 
        { status: 401 }
      );
    }

    console.log(`Debug endpoint: User authenticated - ${user.email}`);
    
    return NextResponse.json({
      message: 'Authenticated successfully',
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId
      },
      timestamp: new Date().toISOString(),
      debug: 'getCurrentUser() returned user object'
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        authenticated: false,
        debug: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
