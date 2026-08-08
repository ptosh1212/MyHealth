'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Smartphone } from 'lucide-react';
import { initiateUPIPayment, UPI_APPS, generateUPIQRData } from '@/lib/upi-payment';
import QRCode from 'qrcode.react';

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  bookingId: string;
  onPaymentComplete: (transactionRef: string) => void;
}

export default function UPIPaymentModal({
  isOpen,
  onClose,
  amount,
  bookingId,
  onPaymentComplete,
}: UPIPaymentModalProps) {
  const [step, setStep] = useState<'method' | 'qr' | 'confirm'>('method');
  const [transactionRef, setTransactionRef] = useState('');
  const [copied, setCopied] = useState(false);
  const [upiId] = useState('myhealth@paytm'); // Your UPI ID
  const [manualTransactionId, setManualTransactionId] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Generate unique transaction reference
      const ref = `ZH${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      setTransactionRef(ref);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUPIAppClick = (appId: string) => {
    const note = `MyHealth - Booking ${bookingId}`;
    initiateUPIPayment(amount, note, transactionRef);
    
    // Move to confirmation step after 2 seconds
    setTimeout(() => {
      setStep('confirm');
    }, 2000);
  };

  const handleQRPayment = () => {
    setStep('qr');
  };

  const copyUPIId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentConfirm = () => {
    // In production, verify payment with backend
    onPaymentComplete(manualTransactionId || transactionRef);
    onClose();
  };

  const qrData = generateUPIQRData(
    amount,
    `MyHealth - Booking ${bookingId}`,
    transactionRef
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[95vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-[32px] sm:rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Pay with UPI</h2>
              <p className="text-slate-500 text-sm mt-1">Amount: ₹{amount}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition"
            >
              <X size={24} className="text-slate-900" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Method Selection */}
          {step === 'method' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Choose Payment Method</h3>
                
                {/* UPI Apps */}
                <div className="space-y-3 mb-6">
                  {UPI_APPS.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleUPIAppClick(app.id)}
                      className="w-full p-4 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-primary transition text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: `${app.color}20` }}
                        >
                          {app.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{app.name}</p>
                          <p className="text-sm text-slate-500">Pay via {app.name}</p>
                        </div>
                        <Smartphone className="text-slate-400" size={20} />
                      </div>
                    </button>
                  ))}
                </div>

                {/* QR Code Option */}
                <button
                  onClick={handleQRPayment}
                  className="w-full p-4 bg-primary/10 hover:bg-primary/20 rounded-xl border-2 border-primary transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <QrCode className="text-primary" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Scan QR Code</p>
                      <p className="text-sm text-slate-600">Use any UPI app to scan</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* UPI ID Display */}
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-600 mb-2">Or pay directly to UPI ID:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white rounded-lg text-slate-900 font-mono text-sm border border-slate-200">
                    {upiId}
                  </code>
                  <button
                    onClick={copyUPIId}
                    className="p-2 bg-primary hover:bg-primary/90 rounded-lg transition"
                  >
                    {copied ? (
                      <Check size={20} className="text-white" />
                    ) : (
                      <Copy size={20} className="text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Transaction Reference */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Transaction Reference:</p>
                <code className="text-sm font-mono text-blue-900">{transactionRef}</code>
              </div>
            </div>
          )}

          {/* QR Code Display */}
          {step === 'qr' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
                  <QRCode value={qrData} size={256} level="H" />
                </div>
                <p className="text-slate-600 mt-4">Scan with any UPI app</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Amount:</span>
                  <span className="font-bold text-slate-900">₹{amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">UPI ID:</span>
                  <span className="text-sm font-mono text-slate-900">{upiId}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('method')}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition"
                >
                  I've Paid
                </button>
              </div>
            </div>
          )}

          {/* Payment Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-green-600" size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Initiated</h3>
                <p className="text-slate-600">Please confirm your payment</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount Paid:</span>
                  <span className="font-bold text-slate-900">₹{amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Reference:</span>
                  <span className="text-sm font-mono text-slate-900">{transactionRef}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  UPI Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={manualTransactionId}
                  onChange={(e) => setManualTransactionId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary transition"
                  placeholder="Enter 12-digit UPI transaction ID"
                />
                <p className="text-xs text-slate-500 mt-2">
                  You can find this in your UPI app's transaction history
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ Your booking will be confirmed once we verify the payment. This usually takes 2-5 minutes.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('method')}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Back
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}