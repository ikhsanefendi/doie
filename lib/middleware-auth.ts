import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function validateSessionMiddleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session")?.value;

  if (!sessionToken) {
    return { valid: false, reason: "No session token" };
  }

  try {
    // Full JWT verification
    const session = await verifySession(sessionToken);
    if (!session) {
      return { valid: false, reason: "Invalid token" };
    }

    // JWT verification already checks expiration, so we don't need to check exp here
    // The jose library will throw an error for expired tokens

    return { valid: true, session };
  } catch (error) {
    // This will catch expired tokens and other JWT errors
    return { valid: false, reason: "Token validation failed" };
  }
}

export function createAuthMiddleware() {
  return async function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get("session")?.value;

    // Public routes that don't require authentication
    const publicRoutes = [
      "/login",
      "/register", 
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/google",
      "/api/auth/logout",
      "/api/auth/me/check", // Allow this endpoint for testing
    ];

    const isPublicRoute = publicRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route),
    );

    if (isPublicRoute) {
      return NextResponse.next();
    }

    if (!sessionToken) {
      if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized - No session token" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Validate session
    const validation = await validateSessionMiddleware(request);
    
    if (!validation.valid) {
      // Clear the invalid cookie
      const response = request.nextUrl.pathname.startsWith("/api")
        ? NextResponse.json(
            { error: `Unauthorized - ${validation.reason}` },
            { status: 401 }
          )
        : NextResponse.redirect(new URL("/login", request.url));

      response.cookies.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      return response;
    }

    return NextResponse.next();
  };
}
