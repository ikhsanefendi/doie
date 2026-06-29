import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, roles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { comparePassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("=== LOGIN API CALLED ===");
    console.log("Login Method: Email/Password (NOT Google OAuth)");
    console.log("Email:", email);
    console.log("This will create Regular JWT, not Google OAuth token");
    console.log("========================");

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        name: users.name,
        roleId: users.roleId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const foundUser = user[0];

    if (!foundUser.isActive) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await comparePassword(password, foundUser.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const token = await createSession({
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      roleId: foundUser.roleId || '',
    });

    console.log("=== JWT TOKEN CREATED ===");
    console.log("INI ADALAH TOKEN JWT SAYA:", token);
    console.log("Token Preview:", token.substring(0, 50) + "...");
    console.log("========================");

    // Set session cookie
    await setSessionCookie(token);

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, foundUser.id));

    return NextResponse.json(
      {
        success: true,
        user: {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          roleId: foundUser.roleId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
