import { NextRequest, NextResponse } from "next/server";

// Create a simple middleware that can handle async operations
export function createSecureMiddleware() {
  return async function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get("session")?.value;

    // Public routes
    const publicRoutes = [
      "/login",
      "/register",
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/google",
      "/api/auth/google/callback",
      "/api/auth/logout",
    ];

    const isPublicRoute = publicRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route),
    );

    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Origin validation for API (except auth)
    if (request.nextUrl.pathname.startsWith("/api") && 
        !request.nextUrl.pathname.startsWith("/api/auth")) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const effectiveOrigin = origin || referer;

      if (effectiveOrigin) {
        const allowedOrigins = [
          process.env.NEXT_PUBLIC_API_URL,
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.NGROK_URL,
          "http://localhost:3000",
          "https://localhost:3000",
          "http://127.0.0.1:3000",
          "https://127.0.0.1:3000",
        ].filter(Boolean);

        const isNgrokUrl = effectiveOrigin.includes('.ngrok-free.dev') || 
                          effectiveOrigin.includes('.ngrok.io') ||
                          effectiveOrigin.includes('ngrok');

        if (!isNgrokUrl && !allowedOrigins.some((allowed) => effectiveOrigin.startsWith(allowed))) {
          return NextResponse.json(
            { error: "Unauthorized origin" },
            { status: 403 },
          );
        }
      }
    }

    // Session validation
    if (!sessionToken) {
      if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized - No session token" },
          { status: 401 },
        );
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // For API requests, do full validation including blacklist
    if (request.nextUrl.pathname.startsWith("/api")) {
      try {
        // Import and use getCurrentUser for full validation
        const { getCurrentUser } = await import("@/lib/auth");
        const user = await getCurrentUser();
        
        if (!user) {
          const response = NextResponse.json(
            { error: "Unauthorized - Session invalid or blacklisted" },
            { status: 401 },
          );
          
          // Clear cookie
          response.cookies.set("session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
          });
          
          return response;
        }
      } catch (error) {
        console.error("Session validation error:", error);
        return NextResponse.json(
          { error: "Unauthorized - Session validation failed" },
          { status: 401 },
        );
      }
    }

    // For page requests, do basic JWT validation
    try {
      const parts = sessionToken.split('.');
      if (parts.length !== 3) {
        throw new Error("Invalid token format");
      }
      
      const payload = JSON.parse(atob(parts[1]));
      
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Token expired");
      }
      
      return NextResponse.next();
      
    } catch (error) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
      return response;
    }
  };
}
