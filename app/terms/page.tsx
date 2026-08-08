import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, CreditCard, XCircle, Scale, Mail, Phone, MapPin, Check, ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | MyHealth Health',
  description: 'MyHealth Health Terms of Service and Privacy Policy.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] font-sans selection:bg-[#1D9E75]/10 selection:text-[#1D9E75]">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center text-white font-bold">Z</div>
            <span className="font-bold text-lg tracking-tight">Anant <span className="text-[#1D9E75]">Health</span></span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-gray-400 hover:text-[#1D9E75] transition-colors">
            Back
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <header className="mb-24">
            <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Terms of Service.</h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed max-w-xl">
              Transparent, fair, and simple. We believe in software that benefits both clinics and patients.
            </p>
            <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <Shield size={12} className="text-[#1D9E75]" />
              Updated April 17, 2026
            </div>
          </header>

          {/* Sections */}
          <div className="space-y-32">
            
            {/* Payment & Subscription Section */}
            <section id="payment" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-1.5 h-6 bg-[#1D9E75] rounded-full"></div>
                <h2 className="text-2xl font-bold">Payments & Subscription</h2>
              </div>

              <div className="grid gap-12 text-gray-600">
                {/* Subscription Card */}
                <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-black mb-1">Subscription Model</h3>
                      <p className="text-sm">Revenue model for clinics</p>
                    </div>
                    <div className="bg-[#1D9E75]/5 text-[#1D9E75] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-[#1D9E75]/10">
                      B2B
                    </div>
                  </div>
                  <p className="leading-relaxed mb-6">
                    My Health operates on a <strong>Subscription by Clinics</strong> basis. Clinics pay a recurring fee to access our management software. 
                    Because of this, <strong>patients are charged ₹0 platform fees</strong> for their bookings.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Patient Fee</div>
                      <div className="text-lg font-black text-[#1D9E75]">₹0.00</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Consultation</div>
                      <div className="text-lg font-black text-black">Set by Doctor</div>
                    </div>
                  </div>
                </div>

                {/* Methods and Policies */}
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <h4 className="font-bold text-black mb-4">Payment Methods</h4>
                    <ul className="space-y-3 p-0 list-none text-sm">
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#1D9E75]" /> Cash at clinic counter</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#1D9E75]" /> UPI (GPay, PhonePe, Paytm)</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#1D9E75]" /> Credit / Debit Cards</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-[#1D9E75]" /> Net Banking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-4">Refund Policy</h4>
                    <ul className="space-y-3 p-0 list-none text-sm italic">
                      <li>Cancel within 10 mins: Full refund</li>
                      <li>Doctor cancellation: Full refund</li>
                      <li>Processing: 5-7 business days</li>
                      <li>Return to original payment method</li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 bg-gray-900 rounded-3xl text-white flex items-start gap-5">
                   <div className="w-10 h-10 bg-[#1D9E75]/20 rounded-xl flex items-center justify-center shrink-0">
                      <Shield size={20} className="text-[#1D9E75]" />
                   </div>
                   <div>
                      <h5 className="font-bold text-sm mb-1">Payment Security</h5>
                      <p className="text-xs text-white/50 leading-relaxed">
                        All online payments are processed through secure, PCI-DSS compliant payment gateways. We do not store your complete card details on our servers.
                      </p>
                   </div>
                </div>
              </div>
            </section>

            {/* Privacy Section */}
            <section id="privacy" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-[#1D9E75] rounded-full"></div>
                <h2 className="text-2xl font-bold">Privacy Promise</h2>
              </div>
              <p className="text-gray-500 leading-relaxed lg:text-lg">
                Your medical data is yours alone. My Health protects your information with industry-standard encryption. 
                We never sell patient data to third parties or ad networks. We only facilitate the connection between you and your healthcare provider.
              </p>
            </section>

            {/* Support / Contact */}
            <section className="pt-10">
              <div className="p-10 bg-white border border-gray-100 rounded-[2.5rem] text-center shadow-sm">
                <h2 className="text-2xl font-black mb-4">Contact Support</h2>
                <div className="flex flex-col md:flex-row justify-center items-center gap-8 mt-10">
                  <a href="mailto:anantprakash1029@gmail.com" className="flex flex-col items-center gap-1 group">
                    <Mail size={24} className="text-gray-300 group-hover:text-[#1D9E75] transition-colors mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Electronic</span>
                    <span className="font-bold text-sm text-black underline decoration-gray-200 underline-offset-4">anantprakash1029@gmail.com</span>
                  </a>
                  <a href="tel:8538900011" className="flex flex-col items-center gap-1 group">
                    <Phone size={24} className="text-gray-300 group-hover:text-[#1D9E75] transition-colors mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Direct</span>
                    <span className="font-bold text-sm text-black underline decoration-gray-200 underline-offset-4">7903191345</span>
                  </a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            © 2026 AP Technologies Private Limited
          </div>
          <div className="flex items-center gap-8">
            <Link href="/terms" className="text-[10px] font-black text-[#1D9E75] uppercase tracking-widest">Terms</Link>
            <Link href="/" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Privacy</Link>
            <div className="flex items-center gap-1 text-[10px] font-black text-gray-300 uppercase tracking-widest">
              <MapPin size={12} /> India
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}