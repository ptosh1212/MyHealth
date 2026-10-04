'use client';

import { useState } from 'react';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      const response = await fetch('/download/apk');

      if (!response.ok) {
        throw new Error('Failed to download APK');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'MyHealth.apk';

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Unable to download the app. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
        <div className="absolute -right-32 top-20 h-[28rem] w-[28rem] rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-300/20 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <img
              src="/icon.png"
              alt="My Health"
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <div className="text-lg font-bold tracking-tight">My Health</div>
            <div className="text-xs text-slate-500">
              Healthcare, simplified.
            </div>
          </div>
        </a>

        <a
          href="/"
          className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
        >
          Home
        </a>
      </header>

      {/* Main */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-5xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Official My Health App
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl md:text-7xl">
            Your healthcare,
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
              right in your pocket.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Get the My Health Android app and connect with doctors, manage
            consultations, and access your healthcare from anywhere.
          </p>

          {/* Download Card */}
          <div className="mx-auto mt-10 max-w-xl rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-blue-900/10 backdrop-blur-xl sm:p-7">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                {/* Android icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.523 15.341a.999.999 0 1 1-1.998 0 .999.999 0 0 1 1.998 0Zm-9.048 0a.999.999 0 1 1-1.998 0 .999.999 0 0 1 1.998 0ZM17.826 6.03l1.486-2.576a.5.5 0 1 0-.866-.5l-1.505 2.608A9.47 9.47 0 0 0 12 4.25a9.47 9.47 0 0 0-4.941 1.312L5.554 2.954a.5.5 0 1 0-.866.5L6.174 6.03A8.65 8.65 0 0 0 3.5 12.5h17a8.65 8.65 0 0 0-2.674-6.47ZM6.75 17.5h1.5v2a1.25 1.25 0 0 1-2.5 0v-2h1Zm9 0h1.5v2a1.25 1.25 0 0 1-2.5 0v-2h1ZM4 13.5h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2Z" />
                </svg>
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-950">
                  My Health for Android
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Download the latest Android version.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                        opacity="0.3"
                      />
                      <path
                        d="M21 12a9 9 0 0 1-9 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    Download APK
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur">
              <div className="text-sm font-bold text-slate-900">
                Doctor Consultations
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Connect with doctors
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur">
              <div className="text-sm font-bold text-slate-900">
                Secure
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Your healthcare data
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/60 p-4 backdrop-blur">
              <div className="text-sm font-bold text-slate-900">
                Anywhere
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Healthcare on the go
              </div>
            </div>
          </div>

          {/* Install note */}
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-left">
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0 text-blue-600">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>

              <p className="text-sm leading-6 text-blue-900">
                <strong>Android installation:</strong> After downloading the
                APK, open it and allow your browser to install apps if Android
                asks for permission.
              </p>
            </div>
          </div>

          <p className="mt-8 text-xs text-slate-400">
            © {new Date().getFullYear()} My Health. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}