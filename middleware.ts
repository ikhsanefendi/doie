import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Check Authorization header first

  // Public routes - no authentication needed
  const publicRoutes = [
    "/login",
    "/register", 
    "/api/auth",
    "/api/admin/activity-logs",
    "/api/migrate/session-blacklist",
    "/api/migrate/update-session-blacklist",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isPublicRoute) {
    console.log("proses 1");
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  let authorization: string | undefined = undefined;
  
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Priority 1: Use Authorization header
    authorization = authHeader.substring(7);
  } else {
    // Priority 2: Use session cookie
    authorization = request.cookies.get("session")?.value;
  }
  
  if (request.nextUrl.pathname.startsWith("/api")) {
    if (!authHeader) {
        return NextResponse.json({ error: "Unauthorized - No Authorization header or session cookie" }, { status: 401 });
    }
  }
  
  // If no auth available, return Unauthorized
  if (!authorization) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized - No Authorization header or session cookie" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Basic JWT validation only
  try {
    // Decode and show token details
    if (authorization) {
      const parts = authorization.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        
        const iatWIB = payload.iat ? new Date(payload.iat * 1000).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : "N/A";
        
        const expWIB = payload.exp ? new Date(payload.exp * 1000).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : "N/A";
        
        const nowWIB = new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        console.log("=== BEARER TOKEN INFO ===");
        console.log("Token Created At (WIB):", iatWIB);
        console.log("Token Expires At (WIB):", expWIB);
        console.log("Current Time (WIB):", nowWIB);
        console.log("=======================");
        
        // Check if token is expired
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          console.log("TOKEN EXPIRED - Returning Unauthorized");
          if (request.nextUrl.pathname.startsWith("/api")) {
            return NextResponse.json({ 
              error: "Unauthorized - Token expired" 
            }, { status: 401 });
          }
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }
    }
    console.log("proses 2");
    return NextResponse.next();
  } catch (error: any) {
    console.log("proses 3");
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|uploads).*)",
  ],
};
