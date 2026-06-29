import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const type = request.nextUrl.searchParams.get('type'); // 'access_token' or 'id_token'
  
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }
  
  try {
    let validationUrl: string;
    
    if (type === 'access_token') {
      validationUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`;
    } else {
      validationUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
    }
    
    console.log(`Validating ${type} with Google API: ${validationUrl.substring(0, 100)}...`);
    
    const response = await fetch(validationUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Google API Error (${response.status}): ${errorText}`);
      return NextResponse.json({ 
        error: 'Token validation failed', 
        status: response.status,
        details: errorText
      }, { status: 400 });
    }
    
    const data = await response.json();
    console.log(`Google API Validation Success:`, data);
    
    return NextResponse.json({
      valid: true,
      data: data,
      validation_url: validationUrl
    });
    
  } catch (error) {
    console.error('Google API validation error:', error);
    return NextResponse.json({ 
      error: 'Validation request failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
