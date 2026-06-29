import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSecureResponse } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return createSecureResponse(
        { 
          error: 'Unauthorized',
          message: 'No valid session found',
          authenticated: false
        }, 
        401
      );
    }

    return createSecureResponse({
      message: 'Authenticated successfully',
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return createSecureResponse(
      { 
        error: 'Internal server error',
        authenticated: false
      }, 
      500
    );
  }
}
