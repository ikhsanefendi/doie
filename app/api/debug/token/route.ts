import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value;
    
    console.log("=== TOKEN DEBUG ANALYSIS ===");
    console.log("Request URL:", request.url);
    console.log("Session Token exists:", !!sessionToken);
    
    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: "No session token found",
        debug: {
          hasToken: false,
          cookies: request.cookies.getAll().map((c: any) => ({ name: c.name, value: c.value?.slice(0, 20) + "..." })),
        }
      });
    }
    
    console.log("Token length:", sessionToken.length);
    console.log("Token preview:", sessionToken.slice(0, 50) + "...");
    
    // Parse JWT token
    try {
      const parts = sessionToken.split('.');
      console.log("Token parts count:", parts.length);
      
      if (parts.length !== 3) {
        return NextResponse.json({
          success: false,
          error: "Invalid JWT format",
          debug: {
            hasToken: true,
            tokenLength: sessionToken.length,
            partsCount: parts.length,
            expectedParts: 3,
            tokenPreview: sessionToken.slice(0, 50) + "..."
          }
        });
      }
      
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      console.log("JWT Header:", header);
      console.log("JWT Payload:", payload);
      
      // Check token validity
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp ? payload.exp < now : false;
      const hasUserId = payload.userId || payload.sub;
      
      console.log("Current time:", new Date(now * 1000).toISOString());
      console.log("Token expires:", payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A');
      console.log("Is expired:", isExpired);
      console.log("Has userId/sub:", !!hasUserId);
      console.log("UserId:", payload.userId || payload.sub);
      console.log("Email:", payload.email);
      
      const debugInfo = {
        hasToken: true,
        tokenLength: sessionToken.length,
        tokenPreview: sessionToken.slice(0, 50) + "...",
        partsCount: parts.length,
        header: {
          alg: header.alg,
          typ: header.typ,
          kid: header.kid
        },
        payload: {
          userId: payload.userId || payload.sub,
          email: payload.email,
          name: payload.name,
          roleId: payload.roleId,
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
          expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
          isExpired,
          hasUserId: !!hasUserId,
          currentTime: new Date(now * 1000).toISOString()
        },
        validation: {
          formatValid: parts.length === 3,
          notExpired: !isExpired,
          hasUserId: !!hasUserId,
          valid: parts.length === 3 && !isExpired && !!hasUserId
        }
      };
      
      if (debugInfo.validation.valid) {
        console.log("✅ Token is VALID");
        return NextResponse.json({
          success: true,
          message: "Token is valid",
          debug: debugInfo
        });
      } else {
        console.log("❌ Token is INVALID");
        return NextResponse.json({
          success: false,
          error: "Token validation failed",
          debug: debugInfo
        });
      }
      
    } catch (parseError: any) {
      console.error("Failed to parse JWT:", parseError?.message || parseError);
      return NextResponse.json({
        success: false,
        error: "Failed to parse JWT token",
        debug: {
          hasToken: true,
          tokenLength: sessionToken.length,
          tokenPreview: sessionToken.slice(0, 50) + "...",
          parseError: parseError?.message || "Unknown parse error"
        }
      });
    }
    
  } catch (error: any) {
    console.error("Token debug error:", error);
    return NextResponse.json({
      success: false,
      error: "Debug analysis failed",
      debug: {
        error: error?.message || "Unknown error"
      }
    });
  }
}
