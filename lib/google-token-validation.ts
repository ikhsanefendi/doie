// Google OAuth Token Validation Functions

/**
 * Validate Google Access Token with Google API
 */
export async function validateGoogleAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
    );
    
    if (!response.ok) {
      console.log("Google Access Token validation failed:", response.status);
      return false;
    }
    
    const data = await response.json();
    console.log("Google Access Token valid:", {
      audience: data.audience,
      scope: data.scope,
      expires_in: data.expires_in
    });
    
    return true;
  } catch (error) {
    console.error("Error validating Google Access Token:", error);
    return false;
  }
}

/**
 * Validate Google ID Token with Google API
 */
export async function validateGoogleIdToken(idToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    
    if (!response.ok) {
      console.log("Google ID Token validation failed:", response.status);
      return false;
    }
    
    const data = await response.json();
    console.log("Google ID Token valid:", {
      email: data.email,
      audience: data.audience,
      issuer: data.iss,
      expires_in: data.expires_in
    });
    
    return true;
  } catch (error) {
    console.error("Error validating Google ID Token:", error);
    return false;
  }
}

/**
 * Revoke Google Token (Force Logout)
 */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${token}`,
      { method: 'POST' }
    );
    
    if (!response.ok) {
      console.log("Google Token revocation failed:", response.status);
      return false;
    }
    
    console.log("Google Token revoked successfully");
    return true;
  } catch (error) {
    console.error("Error revoking Google Token:", error);
    return false;
  }
}

/**
 * Check if token is Google Access Token or ID Token
 */
export function getGoogleTokenType(token: string): 'access_token' | 'id_token' | 'unknown' {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      // JWT format - could be ID token
      const payload = JSON.parse(atob(parts[1]));
      if (payload.iss && (payload.iss.includes('accounts.google.com') || payload.iss.includes('https://accounts.google.com'))) {
        return 'id_token';
      }
    } else if (parts.length === 1 && token.length > 100) {
      // Long single string - likely access token
      return 'access_token';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
