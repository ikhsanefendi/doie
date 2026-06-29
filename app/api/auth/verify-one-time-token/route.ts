import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "@/lib/jwt";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ 
        error: "Token required" 
      }, { status: 400 });
    }

    console.log("=== VERIFY ONE-TIME TOKEN ===");
    console.log("Token:", token.substring(0, 50) + "...");

    // Verify JWT dan dapatkan JTI
    const { payload } = await jwtVerify(token, process.env.JWT_SECRET || "your-secret-key");
    
    console.log("JTI:", payload.jti);
    console.log("User ID:", payload.userId);
    console.log("Email:", payload.email);

    if (!payload.jti) {
      return NextResponse.json({ 
        error: "Not a one-time token" 
      }, { status: 400 });
    }

    // Check token di database
    const result = await db.execute(
      sql`SELECT * FROM one_time_tokens WHERE jti = ${payload.jti}`
    );

    if (result.length === 0) {
      console.log("Token tidak valid / tidak ditemukan");
      return NextResponse.json({ 
        error: "Token tidak valid / sudah dipakai" 
      }, { status: 401 });
    }

    const tokenData = result[0];

    if (tokenData.used) {
      console.log("Token sudah dipakai");
      return NextResponse.json({ 
        error: "Token sudah dipakai" 
      }, { status: 401 });
    }

    // Tandai token sudah dipakai
    await db.execute(
      sql`UPDATE one_time_tokens SET used = TRUE WHERE jti = ${payload.jti}`
    );

    console.log("Token berhasil diverifikasi dan ditandai dipakai");
    console.log("=============================");

    return NextResponse.json({ 
      success: true,
      message: "Token berhasil diverifikasi",
      payload: {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        roleId: payload.roleId
      }
    });

  } catch (error: any) {
    console.error("One-time token verification failed:", error);
    return NextResponse.json({ 
      error: "Token verification failed",
      message: error.message || "Unknown error"
    }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ 
      error: "Token required" 
    }, { status: 400 });
  }

  try {
    console.log("=== AUTO VERIFY ONE-TIME TOKEN (GET) ===");
    console.log("Token:", token.substring(0, 50) + "...");

    // Verify JWT dan dapatkan JTI
    const { payload } = await jwtVerify(token, process.env.JWT_SECRET || "your-secret-key");
    
    console.log("JTI:", payload.jti);
    console.log("User ID:", payload.userId);
    console.log("Email:", payload.email);

    if (!payload.jti) {
      return NextResponse.json({ 
        error: "Not a one-time token" 
      }, { status: 400 });
    }

    // Check token di database
    const result = await db.execute(
      sql`SELECT * FROM one_time_tokens WHERE jti = ${payload.jti}`
    );

    if (result.length === 0) {
      console.log("Token tidak valid / tidak ditemukan");
      return NextResponse.redirect(new URL("/login?error=token_not_found", request.url));
    }

    const tokenData = result[0];

    if (tokenData.used) {
      console.log("Token sudah dipakai");
      return NextResponse.redirect(new URL("/login?error=token_already_used", request.url));
    }

    // Tandai token sudah dipakai
    await db.execute(
      sql`UPDATE one_time_tokens SET used = TRUE WHERE jti = ${payload.jti}`
    );

    console.log("Token berhasil diverifikasi dan ditandai dipakai");
    console.log("REDIRECTING TO DASHBOARD...");
    console.log("=============================");

    // Set session cookie untuk user
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return response;

  } catch (error: any) {
    console.error("Auto verification failed:", error);
    return NextResponse.redirect(new URL(`/login?error=verification_failed&message=${encodeURIComponent(error.message)}`, request.url));
  }
}
