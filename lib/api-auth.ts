import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSecureResponse } from '@/lib/security';

// Higher-order function to wrap API handlers with authentication
export function withAuth(handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
  return async function (request: NextRequest) {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        return createSecureResponse(
          { 
            error: 'Unauthorized',
            message: 'Session invalid or expired'
          }, 
          401
        );
      }

      // Call the original handler with the user
      return await handler(request, user);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return createSecureResponse(
        { 
          error: 'Internal server error',
          message: 'Authentication failed'
        }, 
        500
      );
    }
  };
}

// Function to check if user has specific permission
export function withPermission(permission: string) {
  return function (handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
    return withAuth(async (request, user) => {
      const { hasPermission } = await import('@/lib/permissions');
      const hasAccess = await hasPermission(user.id, permission);
      
      if (!hasAccess) {
        return createSecureResponse(
          { 
            error: 'Forbidden',
            message: 'Insufficient permissions'
          }, 
          403
        );
      }

      return await handler(request, user);
    });
  };
}

// Example usage:
// export const GET = withAuth(async (request, user) => {
//   return NextResponse.json({ user });
// });

// export const POST = withPermission('manage_users')(async (request, user) => {
//   // Admin only logic
// });
