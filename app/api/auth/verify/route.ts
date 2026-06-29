import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSecureResponse } from '@/lib/security';
import { withAuth } from '@/lib/api-auth';

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    return createSecureResponse({
      message: 'Authenticated successfully',
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId
      },
      timestamp: new Date().toISOString(),
      note: 'This endpoint requires valid, non-blacklisted session'
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
});
