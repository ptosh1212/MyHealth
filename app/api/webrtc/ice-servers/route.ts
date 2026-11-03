import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const iceServers = [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
        ],
      },
    ];

    return NextResponse.json(iceServers, { status: 200 });
  } catch (error) {
    console.error('Error fetching ICE servers:', error);
    return NextResponse.json({ error: 'Failed to fetch ICE servers' }, { status: 500 });
  }
}