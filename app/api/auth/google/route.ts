import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

export async function GET(request: NextRequest) {
  // Validate environment variables
  if (
    !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    !process.env.NEXT_API_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_API_URL
  ) {
    console.error("Missing OAuth environment variables");
    return NextResponse.json(
      { error: "OAuth not configured" },
      { status: 500 },
    );
  }

  const googleClient = new OAuth2Client(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.NEXT_API_SECRET_KEY,
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback`,
  );

  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const authorizeUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  console.log("=== OAUTH2CLIENT RESULTS ===");
  console.log("Authorization URL:", authorizeUrl);
  console.log("Scopes:", scopes.join(" "));
  console.log("Access Type: offline");
  console.log("Prompt: consent");
  console.log("Redirecting to Google OAuth...");
  console.log("============================");

  return NextResponse.redirect(authorizeUrl);
}
