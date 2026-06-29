import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (
      !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      !process.env.NEXT_API_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_API_URL
    ) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=missing_credentials`,
      );
    }
    // Create a fresh OAuth client for this request
    const client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.NEXT_API_SECRET_KEY,
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback`,
    );

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=${error}`,
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=no_code`,
      );
    }

    // Exchange code for tokens
    let tokens;
    try {
      const result = await client.getToken(code);
      tokens = result.tokens;
    } catch (tokenError: any) {
      console.error("Token exchange error details:", {
        message: tokenError.message,
        status: tokenError.status,
        clientId:
          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
        redirectUri: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback`,
        code: code?.substring(0, 20) + "...",
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=token_exchange_failed`,
      );
    }

    if (!tokens.id_token) {
      console.error("No id_token in token response");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=no_id_token`,
      );
    }

    // Get user info
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      });
    } catch (verifyError: any) {
      console.error("ID token verification error:", verifyError.message);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=token_verification_failed`,
      );
    }

    console.log("=== BACKEND GOOGLE OAUTH ID TOKEN ===");
    console.log("Original Google ID Token:", tokens.id_token);
    console.log("Token Preview:", tokens.id_token ? tokens.id_token.substring(0, 50) + "..." : "N/A");
    console.log("Google API Validation 123:", `https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`);
    console.log("==================================");

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=invalid_token`,
      );
    }

    const email = payload.email || "";
    const name = payload.name || "OAuth User";

    if (!email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=no_email`,
      );
    }

    // Check if user exists
    let user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        roleId: users.roleId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // If user doesn't exist, create one with a random password and user role
    if (user.length === 0) {
      // Get the user role (case-sensitive: "User" as defined in schema)
      const userRole = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, "User"))
        .limit(1);

      const userRoleId = userRole[0]?.id;

      if (!userRoleId) {
        console.error("User role not found in database. Available roles:", {
          email,
          name,
        });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_API_URL}/login?error=no_user_role`,
        );
      }

      // Create a random password for the OAuth user
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await hashPassword(randomPassword);

      const newUser = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash,
          roleId: userRoleId,
          amountBalance: 0,
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          roleId: users.roleId,
          amountBalance: users.amountBalance,
          isActive: users.isActive,
        });

      user = newUser;
    }

    const foundUser = user[0];

    if (!foundUser.isActive) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_API_URL}/login?error=inactive_user`,
      );
    }

    // Create session
    const token = await createSession({
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      roleId: foundUser.roleId || "",
    });

    // audit login activity
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: foundUser.id,
        action: "login",
        entityType: "user",
        entityId: foundUser.id,
      });
    } catch (e) {
      console.error("Failed to log user login", e);
    }

    // Create redirect response and set cookie directly on it
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}/dashboard`,
      { status: 302 },
    );

    const userSession = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      roleId: foundUser.roleId || "",
    }
    response.cookies.set("X-CLIENT", JSON.stringify(userSession));
    // INI UNTUK TOKEN SESSION Ikhsan Efendi
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, foundUser.id));

    console.log("OAuth callback completed, returning response with cookie");
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}/login?error=callback_error`,
    );
  }
}
