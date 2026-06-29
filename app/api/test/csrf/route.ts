import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// Test endpoint untuk verifikasi CSRF protection
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    return NextResponse.json({
      message: 'CSRF Test Endpoint',
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      csrf_info: {
        token_available: !!request.cookies.get('csrf_token')?.value,
        token_length: request.cookies.get('csrf_token')?.value?.length || 0,
        method: 'GET - No CSRF required'
      },
      instructions: {
        get_request: 'Should work from any tool',
        post_request: 'Should require CSRF token from browser',
        postman_test: 'Should return 403 Forbidden'
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CSRF validation untuk POST
    const csrfToken = request.headers.get('X-CSRF-Token');
    
    if (!csrfToken || csrfToken.length !== 64) {
      return NextResponse.json({
        error: 'Forbidden - Invalid CSRF token 123'+csrfToken,
        message: 'This action requires a valid CSRF token from the browser',
        debug: {
          csrf_received: csrfToken || 'null',
          csrf_length: csrfToken?.length || 0,
          expected_length: 64,
          source: 'CSRF validation failed'
        }
      }, { status: 403 });
    }

    return NextResponse.json({
      message: 'CSRF validation passed!',
      success: true,
      user: { id: user.id, email: user.email },
      csrf_info: {
        token_valid: true,
        token_length: csrfToken.length,
        source: 'Browser with valid CSRF token'
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}
