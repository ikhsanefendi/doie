import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.NEXT_API_SECRET_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const redirectUri = `${apiUrl}/api/auth/google/callback`;

  return NextResponse.json({
    status: "OAuth Configuration Debug",
    config: {
      clientId: clientId ? `${clientId.substring(0, 30)}...` : "MISSING",
      clientSecret: clientSecret ? "SET (hidden for security)" : "MISSING",
      redirectUri: redirectUri,
      apiUrl: apiUrl,
    },
    validation: {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasApiUrl: !!apiUrl,
      allConfigured: !!(clientId && clientSecret && apiUrl),
    },
    instructions: {
      step1: "Verify in Google Cloud Console that redirect URI is registered",
      step2: "Go to: APIs & Services > Credentials",
      step3: "Click your OAuth 2.0 Client ID (Web application)",
      step4: "Authorized redirect URIs should contain:",
      redirectUriExample: redirectUri,
      step5: "Verify Client ID and Client Secret match exactly",
      step6_clientId: `Your current Client ID (first 30 chars): ${clientId?.substring(0, 30)}...`,
      step7: "If redirect URI is missing, ADD IT and click SAVE",
    },
  });
}
