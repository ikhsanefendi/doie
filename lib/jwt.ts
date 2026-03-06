import { SignJWT, jwtVerify as verifyJWT } from 'jose';

const getSecret = (secret: string) => {
  return new TextEncoder().encode(secret);
};

export async function jwtSign(payload: any, secret: string): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret(secret));

  return token;
}

export async function jwtVerify(token: string, secret: string): Promise<any> {
  const verified = await verifyJWT(token, getSecret(secret));
  return verified.payload;
}
