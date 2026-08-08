'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

/* ═══════════════════════════════════════════════
   CONTENT
   Kept separate from markup so copy can be edited
   without touching layout.
═══════════════════════════════════════════════ */
const PROBLEMS = [
  { title: 'Waiting room chaos', desc: 'Patients crowd the front desk because no one is sure whose turn it is.' },
  { title: 'No queue system', desc: 'Staff track order by memory. That breaks down the moment it gets busy.' },
  { title: 'One point of failure', desc: 'If the receptionist is out, the front desk stops working.' },
  { title: 'The same questions, all day', desc: '"Is the doctor free?" "How much longer?" — answered one call at a time.' },
];

const FEATURES = [
  {
    label: 'Booking',
    title: 'Walk-ins and online bookings, one list',
    desc: 'Patients can book ahead or walk in. Both land in the same queue automatically — no manual reconciling.',
  },
  {
    label: 'Queue',
    title: 'A token for every patient',
    desc: 'Each patient is issued a token on arrival. Order is unambiguous, and staff aren\u2019t refereeing it.',
  },
  {
    label: 'Updates',
    title: 'Status sent over WhatsApp',
    desc: 'Token number, position in line, and appointment confirmations go out automatically, without a phone call.',
  },
  {
    label: 'Overview',
    title: 'One dashboard for the day',
    desc: 'Today\u2019s walk-ins and bookings, at a glance, updated in real time as patients move through.',
  },
];

const STEPS = [
  { title: 'Patient arrives', desc: 'They scan a QR code at the entrance, or your staff add them in two clicks.' },
  { title: 'Token is issued', desc: 'A digital token appears on their phone. No names called across a waiting room.' },
  { title: 'Wait, without guessing', desc: 'WhatsApp updates tell them their position, so no one is asking staff for a status.' },
  { title: 'Doctor calls next', desc: 'One tap on the dashboard moves the queue forward.' },
  { title: 'Bookings stay in sync', desc: 'Online appointments merge into the same queue as walk-ins, automatically.' },
];

const BENEFITS = [
  { stat: '\u20B95,000+', label: 'Typically saved per month on front-desk overhead' },
  { stat: '2 hrs', label: 'Saved daily on phone calls about wait times' },
  { stat: '0', label: 'Front-desk disputes over queue order' },
];

const TESTIMONIALS = [
  { name: 'Dr. Ramesh M.', clinic: 'General Physician, Pune', text: 'My receptionist used to spend three hours a day just managing calls. Now that\u2019s automatic.' },
  { name: 'Dr. Priya S.', clinic: 'Paediatrician, Chennai', text: 'Walk-ins get a token, online bookings get a confirmation, and both show up in one queue.' },
  { name: 'Dr. Arjun K.', clinic: 'ENT Specialist, Hyderabad', text: 'Two weeks in, my receptionist has half the workload and patients stopped asking me directly.' },
];

/* ═══════════════════════════════════════════════
   IN-VIEW HOOK — used for a single, restrained
   fade-in on section entry. No per-card stagger.
═══════════════════════════════════════════════ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter();
  const { user, userRole } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user && userRole) {
      router.push(userRole === 'doctor' ? '/doctor/dashboard' : '/patient/home');
    }
  }, [user, userRole, router]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const goToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) {
      (window as any).gtag_report_conversion('/auth/login');
    } else {
      router.push('/auth/login');
    }
  };

  if (user) return null;

  return (
    <div className="page">
      {/* ═══ NAV ═══ */}
      <nav className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <div className="nav__inner">
          <div className="brand">
            <img src="/icon.png" alt="My Health" className="brand__mark" />
            <div>
              <div className="brand__name">My Health</div>
              <div className="brand__tag">:)</div>
            </div>
          </div>

          <div className="nav__links">
            {['Features', 'Pricing', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav__link">{item}</a>
            ))}
          </div>

          <div className="nav__actions">
            <Link href="/auth/login" onClick={goToLogin} className="btn btn--ghost nav__links">Log in</Link>
            
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="menu-toggle"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`menu-toggle__bar ${menuOpen ? 'is-open' : ''}`} />
              <span className={`menu-toggle__bar ${menuOpen ? 'is-open' : ''}`} />
              <span className={`menu-toggle__bar ${menuOpen ? 'is-open' : ''}`} />
            </button>
          </div>
        </div>

        <div className={`mobile-menu ${menuOpen ? 'is-open' : ''}`}>
          {['Features', 'Pricing', 'About'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="mobile-menu__link">{item}</a>
          ))}
          <div className="mobile-menu__divider" />
          <Link href="/auth/login" onClick={goToLogin} className="mobile-menu__link mobile-menu__link--accent">Log in</Link>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="btn btn--primary mobile-menu__cta">Start free trial</a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero section">
        <div className="hero__grid">
          <div className="hero__copy">
            <div className="eyebrow">MY HEALTH</div>
            <h1 className="hero__headline">
              Coonect With DOctors & Patients.
            </h1>
            <p className="hero__sub">
              My Health is a project that is used for conversation btween doctors n patients
            </p>
            <div className="hero__ctas">
              <a href="/auth/login" className="btn btn--primary btn--lg"> Diagnose the error in your Body?</a>
            </div>
            <p className="hero__meta">Made for Everyonee</p>
          </div>


              
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <ComparisonSection />

      {/* ═══ PROBLEM ═══ */}
      <ProblemSection />

      {/* ═══ FEATURES ═══ */}
      <FeaturesSection />

      {/* ═══ HOW IT WORKS ═══ */}
      <HowItWorksSection />

      {/* ═══ BENEFITS ═══ */}
      <BenefitsSection />

      {/* ═══ PRICING ═══ */}
      <PricingSection />

      {/* ═══ TESTIMONIALS ═══ */}
      <TestimonialsSection />

      {/* ═══ FINAL CTA ═══ */}
      <FinalCTA />

      {/* ═══ FOOTER ═══ */}
      <footer className="footer">
        <div className="footer__inner">
          <div className="brand">
            <img src="/icon.png" alt="My Health" className="brand__mark brand__mark--sm" />
            <span className="brand__name brand__name--sm">My Health</span>
          </div>
          <div className="footer__links">
            <Link href="/auth/login" onClick={goToLogin} className="footer__link">Log in</Link>
            <Link href="/auth/signup" className="footer__link">Sign up</Link>
            <Link href="/terms" className="footer__link">Terms</Link>
          </div>
          <p className="footer__copy">My Health {new Date().getFullYear()} My Health Systems Made in India</p>
        </div>
      </footer>

      <style>{`
        :root {
          --ink: #16191C;
          --ink-soft: #4A4F55;
          --muted: #767B82;
          --paper: #FAFAF8;
          --surface: #FFFFFF;
          --line: #E4E1D9;
          --line-strong: #D3CFC5;
          --accent: #1F7A5C;
          --accent-dark: #175E46;
          --accent-tint: #EDF4F0;
          --amber: #A8721F;
          --amber-tint: #FBF3E8;
          --brick: #A8402F;
          --brick-tint: #FBEEEB;
          --mono: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
          --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        * { box-sizing: border-box; }

        .page {
          min-height: 100vh;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
        }

        .section { padding: 96px 24px; }
        @media (max-width: 768px) { .section { padding: 56px 20px; } }

        .eyebrow {
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 16px;
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: var(--paper);
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }
        .nav--scrolled { border-bottom-color: var(--line); }
        .nav__inner {
          max-width: 1180px; margin: 0 auto; height: 68px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 4px;
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand__mark { width: 32px; height: 32px; border-radius: 8px; object-fit: contain; }
        .brand__mark--sm { width: 26px; height: 26px; }
        .brand__name { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; color: var(--ink); }
        .brand__name--sm { font-size: 14px; }
        .brand__tag { font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: 0.04em; margin-top: 1px; }

        .nav__links { display: flex; align-items: center; gap: 28px; }
        .nav__link { font-size: 14px; font-weight: 500; color: var(--ink-soft); }
        .nav__link:hover { color: var(--ink); }
        .nav__actions { display: flex; align-items: center; gap: 10px; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 14px; border-radius: 8px;
          padding: 9px 16px; border: 1px solid transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
          cursor: pointer;
        }
        .btn--primary { background: var(--accent); color: #fff; }
        .btn--primary:hover { background: var(--accent-dark); }
        .btn--secondary { background: transparent; color: var(--ink); border-color: var(--line-strong); }
        .btn--secondary:hover { border-color: var(--ink); }
        .btn--ghost { background: transparent; color: var(--ink-soft); }
        .btn--ghost:hover { color: var(--ink); }
        .btn--lg { padding: 13px 26px; font-size: 15px; border-radius: 10px; }

        .menu-toggle {
          display: none; width: 38px; height: 38px; border-radius: 8px;
          border: 1px solid var(--line-strong); background: transparent;
          flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          cursor: pointer;
        }
        .menu-toggle__bar { width: 16px; height: 1.5px; background: var(--ink); transition: transform 0.2s ease, opacity 0.2s ease; }
        .menu-toggle__bar.is-open:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
        .menu-toggle__bar.is-open:nth-child(2) { opacity: 0; }
        .menu-toggle__bar.is-open:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }

        .mobile-menu {
          display: none;
        }

        /* ── HERO ── */
        .hero { padding-top: 140px; }
        .hero__grid {
          max-width: 720px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
        }
        .hero__copy {
          display: flex; flex-direction: column; align-items: center;
        }
        .hero__headline {
          font-size: clamp(34px, 4.4vw, 52px); font-weight: 800;
          line-height: 1.1; letter-spacing: -1.2px; margin: 0 0 20px;
          max-width: 560px;
        }
        .hero__sub { font-size: 17px; line-height: 1.65; color: var(--ink-soft); max-width: 480px; margin: 0 auto 32px; }
        .hero__ctas { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px; }
        .hero__meta { font-family: var(--mono); font-size: 12px; color: var(--muted); }

        .hero__visual { position: relative; }
        .mock {
          background: var(--ink);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 24px 48px -20px rgba(22, 25, 28, 0.35);
        }
        .mock__bar {
          background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.08);
          padding: 10px 16px; display: flex; align-items: center; gap: 6px;
        }
        .mock__dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.15); }
        .mock__url { margin-left: 10px; font-family: var(--mono); font-size: 11px; color: rgba(255,255,255,0.3); }
        .mock__body { padding: 24px; color: #fff; }
        .mock__header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .mock__greeting { font-size: 16px; font-weight: 700; }
        .mock__date { font-family: var(--mono); font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }
        .mock__status { font-family: var(--mono); font-size: 11px; color: #6FCF9E; border: 1px solid rgba(111,207,158,0.3); border-radius: 6px; padding: 4px 10px; }

        .mock__stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .mock__stat { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; }
        .mock__stat--accent { border-color: rgba(111,207,158,0.35); }
        .mock__stat-value { font-family: var(--mono); font-size: 22px; font-weight: 600; }
        .mock__stat-label { font-size: 10.5px; color: rgba(255,255,255,0.4); margin-top: 4px; }

        .mock__list { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
        .mock__row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .mock__row:last-child { border-bottom: none; }
        .mock__token { font-family: var(--mono); font-size: 11px; color: #6FCF9E; }
        .mock__row-main { flex: 1; }
        .mock__row-name { font-size: 12.5px; font-weight: 600; }
        .mock__row-type { font-size: 10.5px; color: rgba(255,255,255,0.35); }
        .mock__row-status { font-family: var(--mono); font-size: 10px; color: rgba(255,255,255,0.4); }
        .mock__row-status.is-next { color: #6FCF9E; }

        /* ── COMPARISON ── */
        .compare { max-width: 900px; margin: 0 auto; }
        .compare__head { text-align: center; margin-bottom: 48px; }
        .compare__title { font-size: clamp(26px, 3.6vw, 38px); font-weight: 800; letter-spacing: -0.8px; margin: 0 0 12px; }
        .compare__sub { font-size: 16px; color: var(--ink-soft); max-width: 520px; margin: 0 auto; line-height: 1.6; }
        .compare__grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
        .compare__col { padding: 28px 26px; }
        .compare__col + .compare__col { border-left: 1px solid var(--line); }
        .compare__col-label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 14px; }
        .compare__col--no .compare__col-label { color: var(--brick); }
        .compare__col--yes .compare__col-label { color: var(--accent); }
        .compare__col--yes { background: var(--accent-tint); }
        .compare__col-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
        .compare__item { display: flex; gap: 10px; font-size: 14px; color: var(--ink-soft); line-height: 1.55; padding: 6px 0; }
        .compare__item-mark { font-family: var(--mono); flex-shrink: 0; }
        .compare__col--no .compare__item-mark { color: var(--brick); }
        .compare__col--yes .compare__item-mark { color: var(--accent); }

        /* ── PROBLEM ── */
        .problem { background: var(--surface); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .problem__inner { max-width: 1000px; margin: 0 auto; }
        .problem__head { max-width: 560px; margin-bottom: 48px; }
        .problem__title { font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.15; margin: 0; }
        .problem__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
        .problem__card { background: var(--surface); padding: 28px; }
        .problem__index { font-family: var(--mono); font-size: 12px; color: var(--muted); margin-bottom: 10px; }
        .problem__card-title { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
        .problem__card-desc { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

        /* ── FEATURES ── */
        .features__inner { max-width: 1000px; margin: 0 auto; }
        .features__head { max-width: 560px; margin-bottom: 48px; }
        .features__title { font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.15; margin: 0; }
        .features__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .feature-card { border: 1px solid var(--line); border-radius: 12px; padding: 26px; background: var(--surface); }
        .feature-card__label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
        .feature-card__title { font-size: 17px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.2px; }
        .feature-card__desc { font-size: 14px; color: var(--ink-soft); line-height: 1.65; margin: 0; }

        /* ── HOW IT WORKS ── */
        .how { background: var(--surface); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .how__inner { max-width: 760px; margin: 0 auto; }
        .how__head { margin-bottom: 48px; max-width: 520px; }
        .how__title { font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.15; margin: 0; }
        .how__list { display: flex; flex-direction: column; }
        .how__step { display: grid; grid-template-columns: 40px 1fr; gap: 20px; padding: 22px 0; border-top: 1px solid var(--line); }
        .how__step:first-child { border-top: none; }
        .how__step-index { font-family: var(--mono); font-size: 13px; color: var(--accent); padding-top: 2px; }
        .how__step-title { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
        .how__step-desc { font-size: 14px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

        /* ── BENEFITS ── */
        .benefits__inner { max-width: 1000px; margin: 0 auto; }
        .benefits__grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
        .benefit { padding: 32px 24px; text-align: center; }
        .benefit + .benefit { border-left: 1px solid var(--line); }
        .benefit__stat { font-family: var(--mono); font-size: 32px; font-weight: 600; color: var(--accent); }
        .benefit__label { font-size: 13.5px; color: var(--ink-soft); line-height: 1.55; margin-top: 8px; }

        /* ── PRICING ── */
        .pricing { background: var(--surface); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .pricing__inner { max-width: 900px; margin: 0 auto; }
        .pricing__head { text-align: center; max-width: 520px; margin: 0 auto 48px; }
        .pricing__title { font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.8px; margin: 0 0 12px; }
        .pricing__sub { font-size: 15px; color: var(--ink-soft); }
        .pricing__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; align-items: stretch; }
        .plan { border: 1px solid var(--line); border-radius: 12px; padding: 30px 28px; display: flex; flex-direction: column; }
        .plan--highlight { border-color: var(--accent); position: relative; }
        .plan__badge { position: absolute; top: -11px; left: 28px; background: var(--accent); color: #fff; font-family: var(--mono); font-size: 10px; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.03em; }
        .plan__eyebrow { font-family: var(--mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-bottom: 14px; }
        .plan__price { font-family: var(--mono); font-size: 40px; font-weight: 600; line-height: 1; }
        .plan__price-note { font-size: 13.5px; color: var(--ink-soft); margin-top: 10px; margin-bottom: 22px; }
        .plan__callout { background: var(--amber-tint); border: 1px solid #E8D6B4; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: var(--amber); margin-bottom: 22px; }
        .plan__divider { height: 1px; background: var(--line); margin-bottom: 20px; }
        .plan__feature { display: flex; gap: 10px; font-size: 13.5px; color: var(--ink-soft); padding: 6px 0; }
        .plan__feature-mark { font-family: var(--mono); color: var(--accent); flex-shrink: 0; }
        .plan__cta { margin-top: 24px; }
        .plan__note { font-family: var(--mono); font-size: 11px; color: var(--muted); text-align: center; margin-top: 12px; }

        /* ── TESTIMONIALS ── */
        .testimonials__inner { max-width: 1000px; margin: 0 auto; }
        .testimonials__head { max-width: 560px; margin-bottom: 48px; }
        .testimonials__title { font-size: clamp(26px, 3.6vw, 40px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.15; margin: 0; }
        .testimonials__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .testimonial { border: 1px solid var(--line); border-radius: 12px; padding: 26px; background: var(--surface); display: flex; flex-direction: column; }
        .testimonial__quote { font-size: 14.5px; line-height: 1.7; color: var(--ink); margin: 0 0 20px; font-style: italic; flex: 1; }
        .testimonial__name { font-size: 13.5px; font-weight: 700; }
        .testimonial__clinic { font-family: var(--mono); font-size: 11.5px; color: var(--muted); margin-top: 2px; }

        /* ── FINAL CTA ── */
        .final-cta { text-align: center; }
        .final-cta__inner { max-width: 620px; margin: 0 auto; }
        .final-cta__title { font-size: clamp(28px, 4vw, 46px); font-weight: 800; letter-spacing: -1px; line-height: 1.15; margin: 0 0 16px; }
        .final-cta__sub { font-size: 16px; color: var(--ink-soft); line-height: 1.6; margin: 0 0 32px; }
        .final-cta__meta { font-family: var(--mono); font-size: 12px; color: var(--muted); margin-top: 20px; }

        /* ── FOOTER ── */
        .footer { border-top: 1px solid var(--line); padding: 40px 24px; }
        .footer__inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .footer__links { display: flex; gap: 22px; }
        .footer__link { font-size: 13px; color: var(--ink-soft); }
        .footer__link:hover { color: var(--ink); }
        .footer__copy { font-family: var(--mono); font-size: 11.5px; color: var(--muted); width: 100%; text-align: center; margin-top: 12px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .compare__grid { grid-template-columns: 1fr; }
          .compare__col + .compare__col { border-left: none; border-top: 1px solid var(--line); }
          .problem__grid { grid-template-columns: 1fr; }
          .features__grid { grid-template-columns: 1fr; }
          .benefits__grid { grid-template-columns: 1fr; }
          .benefit + .benefit { border-left: none; border-top: 1px solid var(--line); }
          .pricing__grid { grid-template-columns: 1fr; }
          .testimonials__grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .nav__links, .nav__actions .btn--ghost { display: none; }
          .nav__actions .btn--primary { display: none; }
          .menu-toggle { display: flex; }
          .mobile-menu {
            display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
            position: fixed; inset: 68px 0 0 0; background: var(--paper); z-index: 99;
            padding: 24px; transform: translateY(-8px); opacity: 0; pointer-events: none;
            transition: opacity 0.2s ease, transform 0.2s ease;
          }
          .mobile-menu.is-open { opacity: 1; transform: translateY(0); pointer-events: auto; }
          .mobile-menu__link { font-size: 17px; font-weight: 600; padding: 12px 0; color: var(--ink); width: 100%; }
          .mobile-menu__link--accent { color: var(--accent); }
          .mobile-menu__divider { height: 1px; width: 100%; background: var(--line); margin: 8px 0; }
          .mobile-menu__cta { width: 100%; margin-top: 12px; padding: 14px; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────
   COMPARISON
───────────────────────────────────── */
function ComparisonSection() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} className="section compare" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="compare__head">
        <div className="eyebrow" style={{ display: 'inline-block' }}>Not a marketplace</div>
        <h2 className="compare__title">We dont bring you patients. We run the ones you already have.</h2>
        <p className="compare__sub">My Health isnt a directory you compete on. Its the system your existing clinic runs on, day to day.</p>
      </div>
      <div className="compare__grid">
        <div className="compare__col compare__col--no">
          <div className="compare__col-label">Patient marketplaces</div>
          <div className="compare__col-title">Standard listing platforms</div>
          {['Compete with hundreds of other listings', 'Pay per lead or per listing', 'Patients discover you through their app', 'You are a profile on someone elses platform'].map((t, i) => (
            <div key={i} className="compare__item"><span className="compare__item-mark">-</span><span>{t}</span></div>
          ))}
        </div>
        <div className="compare__col compare__col--yes">
          <div className="compare__col-label">W Health</div>
          <div className="compare__col-title">Your clinic operating system</div>
          {['Manages your clinic and your existing patients', 'Flat monthly fee, predictable cost', 'Patients book through your own system', 'You own the experience end to end'].map((t, i) => (
            <div key={i} className="compare__item"><span className="compare__item-mark">+</span><span>{t}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   PROBLEM
───────────────────────────────────── */
function ProblemSection() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} className="section problem" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="problem__inner">
        <div className="problem__head">
          <div className="eyebrow">Sound familiar</div>
          <h2 className="problem__title">The same front-desk problems, most days of the week.</h2>
        </div>
        <div className="problem__grid">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="problem__card">
              <div className="problem__index">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="problem__card-title">{p.title}</h3>
              <p className="problem__card-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   FEATURES
───────────────────────────────────── */
function FeaturesSection() {
  const { ref, inView } = useInView();
  return (
    <section id="features" ref={ref} className="section features" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="features__inner">
        <div className="features__head">
          <div className="eyebrow">What it does</div>
        
        </div>
        <div className="features__grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-card__label">{f.label}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────── */
function HowItWorksSection() {
  const { ref, inView } = useInView();
  return (
    <section id="how-it-works" ref={ref} className="section how" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="how__inner">
        <div className="how__head">
          <div className="eyebrow">How it works</div>
          <h2 className="how__title">One patient, from arrival to the doctor calling them in.</h2>
        </div>
        <div className="how__list">
          {STEPS.map((s, i) => (
            <div key={i} className="how__step">
              <div className="how__step-index">{String(i + 1).padStart(2, '0')}</div>
              <div>
                <h3 className="how__step-title">{s.title}</h3>
                <p className="how__step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   BENEFITS
───────────────────────────────────── */
function BenefitsSection() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} className="section" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="benefits__inner">
        <div className="eyebrow">What changes</div>
        <div className="benefits__grid">
          {BENEFITS.map((b, i) => (
            <div key={i} className="benefit">
              <div className="benefit__stat">{b.stat}</div>
              <div className="benefit__label">{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   PRICING
───────────────────────────────────── */
function PricingSection() {
  const { ref, inView } = useInView();
  return (
    <section id="pricing" ref={ref} className="section pricing" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="pricing__inner">
        <div className="pricing__head">
          <div className="eyebrow" style={{ display: 'inline-block' }}>Pricing</div>
          
        </div>

        <div className="pricing__grid">

          <div className="plan plan--highlight">
            <span className="plan__badge"></span>
            <div className="plan__eyebrow"></div>
            <div className="plan__price">Free<span style={{ fontSize: 15, color: 'var(--ink-soft)', fontFamily: 'var(--sans)' }}> Forever</span></div>
            <div className="plan__price-note"></div>
            <div className="plan__callout"></div>
            <div className="plan__divider" />
            {['Everything in the trial', 'Unlimited patients monthly', 'WhatsApp automation, up to 1,000 messages', 'Doctor and staff dashboard access', 'Priority support over WhatsApp'].map((f, i) => (
              <div key={i} className="plan__feature"><span className="plan__feature-mark">+</span><span>{f}</span></div>
            ))}
            <a href="/auth/signup" className="btn btn--primary plan__cta">Join Nowww!!</a>
            <p className="plan__note">Be Healthy and Sigma</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   TESTIMONIALS
───────────────────────────────────── */
function TestimonialsSection() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} className="section testimonials" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="testimonials__inner">
        <div className="testimonials__head">
          <div className="eyebrow">Early users</div>
          <h2 className="testimonials__title">What doctors noticed in the first couple of weeks.</h2>
        </div>
        <div className="testimonials__grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="testimonial">
              <p className="testimonial__quote">\u201C{t.text}\u201D</p>
              <div>
                <div className="testimonial__name">{t.name}</div>
                <div className="testimonial__clinic">{t.clinic}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────
   FINAL CTA
───────────────────────────────────── */
function FinalCTA() {
  const { ref, inView } = useInView();
  return (
    <section ref={ref} className="section final-cta" style={{ opacity: inView ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="final-cta__inner">
        <h2 className="final-cta__title">Your clinic can run without the daily chaos.</h2>
        <p className="final-cta__sub">.</p>
        <Link href="/auth/login" className="btn btn--primary btn--lg">Join Now</Link>
        <p className="final-cta__meta"></p>
      </div>
    </section>
  );
}