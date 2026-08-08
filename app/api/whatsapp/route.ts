import { NextRequest, NextResponse } from 'next/server';

const INTERAKT_API_KEY = 'cGVySWZtYXcwMUIzbl9HVEJ3WHFwMzUyVThJYXc3UjlfcXFDR0hkX19TSTo=';
const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(INTERAKT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${INTERAKT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Interakt API error:', data);
      return NextResponse.json({ error: 'Interakt API error', details: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('WhatsApp proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}