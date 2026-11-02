import { NextRequest, NextResponse } from 'next/server';

// Point this to your new local background server running on PM2
const LOCAL_WHATSAPP_API_URL =  'https://bonus-legroom-emblem.ngrok-free.dev/api/send';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(LOCAL_WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Forwarding the exact format your local server expects
      body: JSON.stringify({
        number: body.number, 
        message: body.message
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Local WhatsApp API error:', data);
      return NextResponse.json({ error: 'Local WhatsApp error', details: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('WhatsApp proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}