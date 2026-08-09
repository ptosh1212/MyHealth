'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { QrCode, Download, Edit, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

export default function QRBooking() {
  const { user } = useAuthStore();
  const [doctorData, setDoctorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toasts, showToast, removeToast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  // QR Customization
  const [qrColor, setQrColor] = useState('#dab76e');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(300);
  const [includeText, setIncludeText] = useState(true);

  const bookingUrl = `https://my-health-fawn.vercel.app/instabooking/${user?.uid}`;

  useEffect(() => {
    if (!user?.uid) return;

    const fetchDoctorData = async () => {
      const docSnap = await getDoc(doc(db, 'doctors', user.uid));
      if (docSnap.exists()) {
        setDoctorData({ uid: user.uid, ...docSnap.data() });
      }
      setLoading(false);
    };

    fetchDoctorData();
  }, [user?.uid]);

  const downloadQR = async (format: 'png' | 'svg') => {
    if (!qrRef.current) return;

    try {
      const svg = qrRef.current.querySelector('svg');
      if (!svg) return;

      if (format === 'svg') {
        // Download as SVG
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `anant-booking-qr-${doctorData?.name?.replace(/\s+/g, '-')}.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
      } else {
        // Download as PNG
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          canvas.width = qrSize;
          canvas.height = qrSize;
          ctx?.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);

          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const downloadLink = document.createElement('a');
              downloadLink.href = pngUrl;
              downloadLink.download = `anant-booking-qr-${doctorData?.name?.replace(/\s+/g, '-')}.png`;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(pngUrl);
            }
          });
        };

        img.src = url;
      }

      showToast(`QR Code downloaded as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download QR code', 'error');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    showToast('Booking link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pb-24 lg:pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 mb-2">
            <QrCode className="text-primary" size={36} />
            Instant Booking QR Code
          </h1>
          <p className="text-slate-500">
            Generate and customize your QR code for instant patient bookings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Preview */}
          <div className="glass rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6">QR Code Preview</h2>
            
            <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: bgColor }}>
              <div ref={qrRef} className="flex justify-center">
                {bookingUrl && (
                  <QRCodeSVG
                    value={bookingUrl}
                    size={qrSize}
                    level="H"
                    fgColor={qrColor}
                    bgColor={bgColor}
                    includeMargin={true}
                  />
                )}
              </div>
              
              {includeText && (
                <div className="mt-6 text-center">
                  <p className="font-bold text-lg mb-1" style={{ color: qrColor }}>
                    Dr. {doctorData?.name}
                  </p>
                  <p className="text-sm mb-2" style={{ color: qrColor, opacity: 0.8 }}>
                    {doctorData?.specialization || 'General Physician'}
                  </p>
                  <p className="text-xs" style={{ color: qrColor, opacity: 0.6 }}>
                    Scan to book instant appointment
                  </p>
                </div>
              )}
            </div>

            {/* Download Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => downloadQR('png')}
                className="w-full bg-primary text-slate-900 px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download as PNG
              </button>
              <button
                onClick={() => downloadQR('svg')}
                className="w-full bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download as SVG
              </button>
            </div>
          </div>

          {/* Customization & Info */}
          <div className="space-y-6">
            {/* Booking Link */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Booking Link</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bookingUrl}
                  readOnly
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-3 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink size={14} />
                Preview booking page
              </a>
            </div>

            {/* Customization */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Edit size={20} className="text-primary" />
                Customize QR Code
              </h3>

              <div className="space-y-4">
                {/* QR Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">QR Code Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="w-16 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={qrColor}
                      onChange={(e) => setQrColor(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium mb-2">Background Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-16 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Size: {qrSize}px
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="500"
                    step="50"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Include Text */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl">
                  <div>
                    <p className="font-medium">Include Doctor Info</p>
                    <p className="text-sm text-slate-500">Show name and specialty below QR</p>
                  </div>
                  <button
                    onClick={() => setIncludeText(!includeText)}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      includeText ? 'bg-primary' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      includeText ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {/* Preset Colors */}
                <div>
                  <label className="block text-sm font-medium mb-2">Quick Presets</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'Gold', qr: '#dab76e', bg: '#ffffff' },
                      { name: 'Blue', qr: '#3b82f6', bg: '#ffffff' },
                      { name: 'Green', qr: '#10b981', bg: '#ffffff' },
                      { name: 'Black', qr: '#000000', bg: '#ffffff' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setQrColor(preset.qr);
                          setBgColor(preset.bg);
                        }}
                        className="p-3 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                      >
                        <div className="flex gap-1 mb-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: preset.qr }}></div>
                          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: preset.bg }}></div>
                        </div>
                        <p className="text-xs">{preset.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Instructions */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">How to Use</h3>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex gap-3">
                  <span className="text-primary font-bold">1.</span>
                  <p>Download the QR code in your preferred format (PNG or SVG)</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-primary font-bold">2.</span>
                  <p>Print and place it at your clinic reception or waiting area</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-primary font-bold">3.</span>
                  <p>Patients scan the QR to instantly book appointments</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-primary font-bold">4.</span>
                  <p>No login required initially - they signup after booking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}