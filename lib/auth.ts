import { hash, compare } from "bcrypt";
import { cookies } from "next/headers";
import { jwtVerify, jwtSign } from "./jwt";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return compare(password, hash);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  roleId: string;
}

export async function createSession(user: any): Promise<string> {
  console.log("=== CREATE SESSION DEBUG ===");
  console.log("User object:", user);
  console.log("User ID:", user.id);
  console.log("User email:", user.email);
  console.log("User name:", user.name);
  console.log("User roleId:", user.roleId);
  
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
  };
  
  console.log("JWT Payload:", payload);
  console.log("=========================");

  const token = await jwtSign(
    payload,
    process.env.JWT_SECRET || "your-secret-key",
  );
  return token;
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      throw new Error("Token expired");
    }

    return payload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    // maxAge: 60 * 60 * 24 * 1, // 1 day
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getCurrentUser() {
  const token = await getSessionCookie();
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  // Try to select full user row; fall back if column missing
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    return user[0] || null;
  } catch (err: any) {
    // if pending column not found, query minimal set
    if (err?.code === "42703") {
      const partial = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          roleId: users.roleId,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      return partial[0] || null;
    }
    console.error("Failed to fetch user:", err);
    return null;
  }
}
