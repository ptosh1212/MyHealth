# My Health

![Hackatime Stats](https://github-readme-stats.hackclub.dev/api/wakatime?username=55530\&api_domain=hackatime.hackclub.com\&theme=darcula\&custom_title=Hackatime+Stats\&layout=compact\&cache_seconds=0\&langs_count=8)

This is a health website which I made for patients and doctors as i suffer frm Seizure Attacks. The main idea is to make it easier for patients to find doctors, book appointments and manage their medicines.

This project is still not fully complete and some things may not work properly.

## Features

### For Patients

* Search doctors by their specialty
* Book appointments
* Track medicines and prescriptions
* View medical records
* Get appointment notifications
* Chat with doctors after appointment is approved

### For Doctors

* Doctor dashboard
* Manage patients
* Manage appointments
* Track earnings
* Make prescriptions
* Appointment notifications
* Chat with patients

## Tech Stack Lol

* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Backend:** Firebase
* **Authentication:** Firebase Auth
* **Database:** Firestore
* **Storage:** Firebase Storage
* **Notifications:** Firebase Cloud Messaging
* **State Management:** Zustand
* **Icons:** Lucide React

## Getting Started

### Requirements

You need:

* Node.js 18 or higher
* Firebase project
* VAPID key for push notifications

### Installation

First install the dependencies:

```bash
npm i
```

Then create a `.env.local` file and add your Firebase details.

After that run:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Firebase Setup

### 1. Users Collection

Create a `users` collection in Firestore.

Example:

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

### 2. Authentication

Go to:

Firebase Console > Authentication > Sign-in method

Enable Email/Password login.

### 3. Cloud Messaging

Go to:

Firebase Console > Project Settings > Cloud Messaging

Get the VAPID key and add it to `.env.local`.

## Push Notifications

The website has push notifications for:

* Appointment confirmation
* Appointment reminders
* Medicine reminders
* New messages

The user will be asked for notification permission when required.

## Project Structure

```text
my-health/
├── app/
│   ├── auth/          # Authentication pages
│   ├── patient/       # Patient pages
│   ├── doctor/        # Doctor pages
│   ├── layout.tsx     # Main layout
│   ├── page.tsx       # Home / redirect
│   └── globals.css    # Global CSS
│
├── components/        # Reusable components
│
├── lib/
│   ├── firebase.ts    # Firebase config
│   ├── store.ts       # Zustand store
│   └── notifications.ts
│
├── public/            # Static files
└── package.json
```

## Deployment

### Vercel Recommended Byy MEe

1. Push the code to GitHub
2. Import the project in Vercel
3. Add all the environment variables
4. Deploy it

For production you can also run:

```bash
npm run build
npm start
```

## Environment Variables

Add these in `.env.local`:

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

## Important

This project is still in development, so there can be bugs and some features may not work.

The doctors shown in the doctor list are not real doctors. They are only test accounts made for testing the website.

If you want to test both doctor and patient accounts at the same time, I recommend using two browsers.

For example:

**Microsoft Edge:** Doctor account

**Google Chrome:** Patient account

This makes testing both roles easier.

---

I made this project for Hack Club and I am still working on improving it.

Thanks for checking my project.

**Anant**
