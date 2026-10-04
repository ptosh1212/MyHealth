'use client';

import { useState } from 'react';

const APK_URL =
  'https://github.com/ptosh1212/MyHealth/releases/download/MyHealth/anant-health.apk';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);

    const link = document.createElement('a');
    link.href = APK_URL;
    link.download = 'anant-health.apk';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 2500);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7fbff] text-slate-900">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-3xl" />

        <div className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-cyan-200/30 blur-3xl" />

        <div className="absolute bottom-[-250px] left-1/2 h-[550px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-100/40 blur-3xl" />

        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        {/* floating circles */}
        <div className="absolute left-[12%] top-[25%] h-4 w-4 rounded-full bg-blue-400/20" />
        <div className="absolute right-[16%] top-[35%] h-6 w-6 rounded-full bg-cyan-400/20" />
        <div className="absolute left-[20%] bottom-[20%] h-7 w-7 rounded-full bg-indigo-400/10" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-blue-100 ring-1 ring-blue-100">
            <img
              src="https://media.median.co/..."
              alt="My Health"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#123c69]">
              My Health
            </h1>
            <p className="text-xs text-slate-500">Healthcare, simplified.</p>
          </div>
        </div>

        <div className="hidden rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-sm font-medium text-[#123c69] shadow-sm backdrop-blur sm:block">
          Your health. Your way.
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-96px)] items-center justify-center px-6 pb-16 pt-8">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* App badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-medium text-[#1557a6] shadow-sm backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            My Health Android App
          </div>

          {/* Heading */}
          <h2 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-[#123c69] sm:text-5xl md:text-6xl lg:text-7xl">
            Your healthcare,
            <br />
            <span className="bg-gradient-to-r from-[#1557a6] via-[#1677c8] to-[#0891b2] bg-clip-text text-transparent">
              right in your pocket.
            </span>
          </h2>

          {/* Description */}
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Access My Health wherever you go. Connect with doctors, manage
            appointments, and stay connected to your healthcare from one simple
            app.
          </p>

          {/* Download card */}
          <div className="mx-auto mt-10 max-w-md">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-3 shadow-2xl shadow-blue-100/70 backdrop-blur-xl">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#123c69] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#123c69]/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0e3156] hover:shadow-xl disabled:cursor-wait disabled:opacity-80"
              >
                <svg
                  className={`h-5 w-5 ${
                    downloading ? 'animate-bounce' : ''
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>

                {downloading ? 'Starting download...' : 'Download for Android'}
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              APK • Android • Free download
            </p>
          </div>

          {/* Features */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            <Feature
              icon="✓"
              title="Simple"
              description="Everything in one place"
            />

            <Feature
              icon="⌁"
              title="Connected"
              description="Stay connected with doctors"
            />

            <Feature
              icon="♡"
              title="For you"
              description="Healthcare from anywhere"
            />
          </div>

          {/* Install note */}
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-blue-100 bg-white/60 px-5 py-4 text-left shadow-sm backdrop-blur">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-[#1557a6]">
                i
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Installing the app
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Download the APK, open it on your Android device, and allow
                  installation when Android asks for permission.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-14 text-xs text-slate-400">
            © {new Date().getFullYear()} My Health. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/60 px-5 py-5 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/80">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-[#1557a6]">
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-bold text-slate-800">{title}</h3>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}