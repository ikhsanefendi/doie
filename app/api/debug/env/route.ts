import { NextResponse } from "next/server";

export async function GET() {
  try {
    const envVars = {
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "SET" : "MISSING",
      NEXT_API_SECRET_KEY: process.env.NEXT_API_SECRET_KEY ? "SET" : "MISSING",
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING",
      JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || "MISSING",
    };

    console.log("Environment Variables Status:", envVars);

    return NextResponse.json({
      message: "Environment variables check",
      envVars,
      googleOAuthConfig: {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
        redirectUri: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback` : "MISSING",
        scopes: [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Debug failed", details: error },
      { status: 500 }
    );
  }
}
