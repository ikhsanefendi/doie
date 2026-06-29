import { SignJWT, jwtVerify as verifyJWT } from 'jose';
import { randomUUID } from "crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";

const getSecret = (secret: string) => {
  return new TextEncoder().encode(secret);
};

// export async function jwtSign(payload: any, secret: string): Promise<string> {
//   const token = await new SignJWT(payload)
//     .setProtectedHeader({ alg: 'HS256' })
//     .setIssuedAt()
//     .setExpirationTime('7d')
//     // .setExpirationTime('5m')
//     .sign(getSecret(secret));
//   return token;
// }

export async function jwtSign(payload: any, secret: string): Promise<string> {
  const jti = randomUUID();
  const token = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60m') // IKHSAN EFENDI COOKIE UNTUK LOG LOGIN JWT IKHSAN
    .sign(getSecret(secret));

  try {
    await db.execute(
      sql`INSERT INTO one_time_tokens (jti, expired_at) VALUES (${jti}, NOW() + INTERVAL '1 minutes')`
    );

  } catch (error) {
    console.error("Failed to insert one_time_token:", error);
    // Continue even if DB insert fails
  }
  return token;
}


export async function jwtVerify(token: string, secret: string): Promise<any> {
  const verified = await verifyJWT(token, getSecret(secret));
  return { payload: verified.payload };
}
