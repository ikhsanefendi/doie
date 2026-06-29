import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// Global CSRF validation for API endpoints that don't use requireCSRF wrapper
export function validateCSRFOrBlock(request: NextRequest) {
  // Only validate for write operations
  if (request.method === 'GET' || request.method === 'HEAD') {
    return null; // Allow GET requests
  }

  // Get CSRF token from headers
  const csrfToken = request.headers.get('X-CSRF-Token');
  
  // Block if no CSRF token or invalid format
  if (!csrfToken || csrfToken.length !== 64) {
    return NextResponse.json({
      error: 'Forbidden - Invalid CSRF token 789',
      message: 'This action requires a valid CSRF token from the browser. Use requireCSRF wrapper or include X-CSRF-Token header.',
      debug: {
        csrf_received: csrfToken || 'null',
        csrf_length: csrfToken?.length || 0,
        expected_length: 64,
        method: request.method,
        endpoint: request.url,
        fix: 'Add requireCSRF wrapper to your API endpoint'
      }
    }, { status: 403 });
  }

  return null; // CSRF token is valid format
}

// Higher-order function to enforce CSRF for all API endpoints
export function enforceCSRF(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async function (request: NextRequest) {
    // First validate CSRF
    const csrfError = validateCSRFOrBlock(request);
    if (csrfError) {
      return csrfError;
    }

    // Then execute the handler
    return await handler(request);
  };
}
