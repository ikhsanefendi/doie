import { SignJWT } from 'jose';

// Client-side jwtSign without database
async function jwtSignClient(payload: any, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30s') // IKHSAN EFENDI KETIKA UPDATE JWT IKHSAN
    .sign(secretKey);
}

export async function GetNetwork(url: string, options?: RequestInit): Promise<Response> {
  const payload = {
    userId: "network-json-user",
    email: "network-json@example.com",
    name: "Network JSON User",
    roleId: "network-json-role",
  };

  const token = await jwtSignClient(payload, process.env.JWT_SECRET || "your-secret-key");
  // console.log(token)
  const headers = {
    ...options?.headers,
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response
} catch (error) {
    throw error;
  }
}

export async function GetNetworkJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await GetNetwork(url, options);
  return response.json();
}

export async function PostNetwork(url: string, data?: any, options?: RequestInit): Promise<Response> {
  return GetNetwork(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

export async function PostNetworkJSON<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
  const response = await PostNetwork(url, data, options);
  return response.json();
}

export async function PutNetwork(url: string, data?: any, options?: RequestInit): Promise<Response> {
  return GetNetwork(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });
}

export async function PutNetworkJSON<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
  const response = await PutNetwork(url, data, options);
  return response.json();
}

export async function DeleteNetwork(url: string, options?: RequestInit): Promise<Response> {
  return GetNetwork(url, {
    method: "DELETE",
    ...options,
  });
}

export async function DeleteNetworkJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await DeleteNetwork(url, options);
  return response.json();
}
