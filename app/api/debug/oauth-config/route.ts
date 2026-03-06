import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    secretKey: process.env.NEXT_API_SECRET_KEY ? "SET" : "NOT_SET",
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    redirectUri: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback`,
  });
}
