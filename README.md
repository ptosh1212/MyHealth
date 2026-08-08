# My Health - Web Platform

A modern healthcare platform connecting patients and doctors with real-time notifications.

## Features

### For Patients
- 🔍 Search and find doctors by specialty
- 📅 Book appointments online
- 💊 Track medicines and prescriptions
- 📋 View medical records
- 🔔 Real-time notifications for appointments
- 💬 Video consultations (coming soon)

### For Doctors
- 📊 Dashboard with analytics
- 👥 Patient management
- 📅 Appointment scheduling
- 💰 Earnings tracking
- 📝 Create prescriptions
- 🔔 Appointment notifications

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Real-time**: Socket.io (optional)
- **Video**: SimplePeer (optional)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project set up
- VAPID key for push notifications

### Installation

1. Install dependencies:
```bash
cd web-platform
npm install
```

2. Configure Firebase:
   - Update `.env.local` with your Firebase credentials
   - Get VAPID key from Firebase Console > Project Settings > Cloud Messaging

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Firebase Setup

### 1. Create Collections

Create these collections in Firestore:

**users**
```json
{
  "name": "string",
  "email": "string",
  "role": "patient | doctor",
  "specialty": "string (for doctors)",
  "experience": "number (for doctors)",
  "location": "string",
  "createdAt": "timestamp"
}
```

**appointments**
```json
{
    "patientId": "string",
    "patientName": "string",
    "doctorId": "string",
    "doctorName": "string",
    "specialty": "string",
    "date": "string (YYYY-MM-DD)",
    "time": "string (HH:MM)",
    "status": "pending | confirmed | completed | cancelled",
    "reason": "string",
    "createdAt": "timestamp"
  }
```

### 2. Enable Authentication
- Go to Firebase Console > Authentication
- Enable Email/Password sign-in method

### 3. Enable Cloud Messaging
- Go to Firebase Console > Cloud Messaging
- Generate VAPID key
- Add to `.env.local`

### 4. Firestore Rules (Development)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Push Notifications

The app supports web push notifications for:
- Appointment confirmations
- Appointment reminders
- Medicine reminders
- New messages

Users will be prompted to allow notifications on first login.

## Project Structure

```
web-platform/
├── app/
│   ├── auth/          # Authentication pages
│   ├── patient/       # Patient dashboard & features
│   ├── doctor/        # Doctor dashboard & features
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Home/redirect page
│   └── globals.css    # Global styles
├── components/        # Reusable components
├── lib/              # Utilities & configs
│   ├── firebase.ts   # Firebase config
│   ├── store.ts      # Zustand store
│   └── notifications.ts # Push notifications
├── public/           # Static assets
└── package.json
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Build for production:
```bash
npm run build
npm start
```

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_VAPID_KEY=
```

## Features to Add

- [ ] Video consultations
- [ ] Payment integration
- [ ] Medicine ordering
- [ ] Chat system
- [ ] Prescription OCR
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Email notifications
- [ ] SMS notifications

## License

Private - All rights reserved

## Support

For issues or questions, contact: support@anant.health
