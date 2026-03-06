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

export async function createSession(payload: SessionPayload): Promise<string> {
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
    const payload = await jwtVerify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  cookieStore.set("session", token, {
    httpOnly: true,
    // Set secure to true in production, false in development for localhost
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.NODE_ENV === "staging",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    expires: sevenDaysFromNow, // Also set expires for better browser compatibility
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value;
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
          voucherBalance: users.voucherBalance,
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
    // rethrow other errors so they surface
    throw err;
  }
}
