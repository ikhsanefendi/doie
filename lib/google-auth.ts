import { jwtVerify, importSPKI } from "jose";

// Google OAuth 2.0 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com"
];

// Google's public keys for JWT verification
const GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

let cachedKeys: any = null;
let keysCacheTime = 0;
// const KEYS_CACHE_DURATION = 3600000; // 1 hour satuan MS
const KEYS_CACHE_DURATION = 1; // 1 hour satuan MS

// Fetch Google's public keys
async function getGooglePublicKeys() {
  const now = Date.now();
  
  // Use cached keys if still valid
  if (cachedKeys && (now - keysCacheTime) < KEYS_CACHE_DURATION) {
    return cachedKeys;
  }

  try {
    const response = await fetch(GOOGLE_KEYS_URL);
    const data = await response.json();
    
    // Cache the keys
    cachedKeys = data;
    keysCacheTime = now;
    
    console.log("Google public keys fetched and cached");
    return data;
  } catch (error) {
    console.error("Failed to fetch Google public keys:", error);
    throw error;
  }
}

// Find the correct key for the JWT
function findKey(keys: any, keyId: string) {
  return keys.keys.find((key: any) => key.kid === keyId);
}

// Verify Google ID Token
export async function verifyGoogleIdToken(idToken: string) {
  console.log("=== GOOGLE ID TOKEN VERIFICATION ===");
  console.log("Client ID:", GOOGLE_CLIENT_ID);
  
  try {
    // Decode JWT header to get key ID
    const [headerB64, payloadB64, signature] = idToken.split('.');
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    
    console.log("JWT Header:", header);
    console.log("JWT Payload:", payload);
    
    // Check issuer
    const validIssuer = GOOGLE_ISSUERS.includes(payload.iss);
    console.log("Issuer (iss):", payload.iss);
    console.log("Valid issuer:", validIssuer);
    
    if (!validIssuer) {
      throw new Error(`Invalid issuer: ${payload.iss}`);
    }
    
    // Check audience
    const validAudience = payload.aud === GOOGLE_CLIENT_ID;
    console.log("Audience (aud):", payload.aud);
    console.log("Expected audience:", GOOGLE_CLIENT_ID);
    console.log("Valid audience:", validAudience);
    
    if (!validAudience) {
      throw new Error(`Invalid audience: ${payload.aud}`);
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const notExpired = payload.exp > now;
    console.log("Expires (exp):", new Date(payload.exp * 1000).toISOString());
    console.log("Current time:", new Date(now * 1000).toISOString());
    console.log("Not expired:", notExpired);
    
    if (!notExpired) {
      throw new Error(`Token expired: ${payload.exp}`);
    }
    
    // Get Google's public keys
    const keys = await getGooglePublicKeys();
    const key = findKey(keys, header.kid);
    
    if (!key) {
      throw new Error(`Key not found: ${header.kid}`);
    }
    
    console.log("Key ID:", header.kid);
    console.log("Key algorithm:", key.alg);
    
    // Create SPKI from JWK
    const spki = await importSPKI(key.n + key.e, key.alg);
    
    // Verify JWT signature
    const { payload: verifiedPayload } = await jwtVerify(idToken, spki, {
      issuer: GOOGLE_ISSUERS,
      audience: GOOGLE_CLIENT_ID,
    });
    
    console.log("✅ Token verified successfully!");
    console.log("Verified payload:", verifiedPayload);
    console.log("===============================");
    
    return verifiedPayload;
    
  } catch (error: any) {
    console.error("❌ Token verification failed:", error?.message || error);
    console.log("===============================");
    throw error;
  }
}

// Check if token is from Google
export function isGoogleToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    return GOOGLE_ISSUERS.includes(payload.iss);
  } catch (error) {
    return false;
  }
}

// Get token info without verification (for debugging)
export function getTokenInfo(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    return {
      header,
      payload,
      isGoogle: GOOGLE_ISSUERS.includes(payload.iss),
      issuer: payload.iss,
      audience: payload.aud,
      expires: payload.exp,
      expired: payload.exp ? payload.exp < Math.floor(Date.now() / 1000) : null,
    };
  } catch (error) {
    return null;
  }
}
