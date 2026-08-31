'use client';

import { Linkedin, ArrowUpRight, HeartPulse, Code2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
            <HeartPulse size={16} />
            Anant Health
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Meet the founder
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Hi, I&apos;m Anant — the founder and developer behind My Health.
            I&apos;m building My Health with the goal of making communication
            between patients and doctors simpler and more accessible.
          </p>
        </div>
      </section>

      {/* Founder Card */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50">
          <div className="p-8 sm:p-12">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
              
              {/* Avatar */}
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-black text-4xl font-bold text-white">
                A
              </div>

              {/* Info */}
              <div>
                <h2 className="text-3xl font-bold">
                  Anant
                </h2>

                <p className="mt-2 text-lg text-gray-600">
                  Founder & Developer of My Health
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm">
                    <Code2 size={16} />
                    Developer
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm">
                    <HeartPulse size={16} />
                    My Health
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-10 border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold">
                About My Health
              </h3>

              <p className="mt-4 max-w-3xl leading-7 text-gray-600">
                My Health is a healthcare platform focused on connecting
                patients and doctors through modern digital tools. The project
                is designed to make healthcare communication easier while
                keeping the experience simple and accessible.
              </p>
            </div>

            {/* LinkedIn */}
            <div className="mt-8">
              <a
                href="https://www.linkedin.com/in/zivanteai/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-xl bg-[#0A66C2] px-6 py-3 font-medium text-white transition hover:opacity-90"
              >
                <Linkedin size={20} />
                Connect with me on LinkedIn
                <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-gray-500">
          © {new Date().getFullYear()} My Health. Built by Anant Prakash.
        </div>
      </footer>
    </main>
  );
}