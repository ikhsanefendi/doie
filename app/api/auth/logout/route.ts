import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { createSecureResponse } from '@/lib/security';
import { revokeGoogleToken, getGoogleTokenType } from '@/lib/google-token-validation';
import { isGoogleToken } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    // Get current session token before clearing
    const sessionToken = request.cookies.get("session")?.value;
    
    // Revoke Google token if it's a Google OAuth token
    if (sessionToken && isGoogleToken(sessionToken)) {
      const tokenType = getGoogleTokenType(sessionToken);
      await revokeGoogleToken(sessionToken);
    }
    
    // Clear the session cookie using the proper function
    await clearSessionCookie();

    // Create secure response 
    const response = createSecureResponse(
      { success: true, message: 'Logged out successfully' },
      200
    );

    // AGGRESSIVELY destroy the session cookie with multiple deletion methods
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const epochDate = new Date(0); // Unix epoch - earliest possible date

    // Method 1: Set expired cookie with earliest possible date
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: epochDate, // Set to Unix epoch for maximum destruction
      maxAge: 0, // Immediately expire
      path: "/",
    });

    // Method 2: Delete with explicit attributes (for servers that support cookie deletion)
    response.cookies.delete("session");

    // Method 3: Set another expired cookie with different attributes for browsers that cache
    response.cookies.set("session", "destroyed", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: epochDate,
      path: "/",
    });

    // Clear any other auth-related cookies aggressively
    response.cookies.set("google_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: epochDate,
      maxAge: 0,
      path: "/",
    });

    response.cookies.delete("google_oauth_state");

    response.cookies.set("google_oauth_state", "destroyed", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: epochDate,
      maxAge: -1,
      path: "/",
    });

    // Clear Google OAuth cookies if they exist
    response.cookies.set("g_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: epochDate,
      maxAge: 0,
      path: "/",
    });

    response.cookies.delete("g_state");

    response.cookies.set("g_state", "destroyed", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: epochDate,
      maxAge: -1,
      path: "/",
    });

    // Add cache control headers to prevent caching
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    console.log("🔥 LOGOUT: Session cookie destroyed with maximum aggression");
    console.log("🔥 LOGOUT: All auth cookies invalidated and browser cache cleared");
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return createSecureResponse(
      { error: 'Internal server error' },
      500
    );
  }
}
