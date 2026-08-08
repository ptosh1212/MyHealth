import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Runs server-side with the Admin SDK, which bypasses Firestore security
// rules. Needed because this check happens before the user is signed in,
// so request.auth is null and the client SDK gets rejected by the rules.
export async function POST(req: Request) {
  const { phone } = await req.json();

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  }

  try {
    const [doctorsSnap, usersSnap] = await Promise.all([
      adminDb.collection('doctors').where('phone', '==', phone).limit(1).get(),
      adminDb.collection('users').where('phone', '==', phone).limit(1).get(),
    ]);

    const exists = !doctorsSnap.empty || !usersSnap.empty;
    return NextResponse.json({ exists });
  } catch (error) {
    console.error('check-phone error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}