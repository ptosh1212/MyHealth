'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, Smartphone, Wallet, Building2, CheckCircle, Loader2 } from 'lucide-react';
import { createPaymentOrder, generateOrderId, formatAmount, initializeCashfreeCheckout } from '@/lib/cashfree';

interface CashfreePaymentProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onPaymentSuccess: (orderId: string, paymentDetails: any) => void;
  onPaymentFailure: (error: any) => void;
}

export default function CashfreePayment({
  isOpen,
  onClose,
  amount,
  bookingId,
  customerName,
  customerEmail,
  customerPhone,
  onPaymentSuccess,
  onPaymentFailure,
}: CashfreePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');

  useEffect(() => {
    if (isOpen) {
      const newOrderId = generateOrderId('ZH');
      setOrderId(newOrderId);
      setStep('select');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePayment = async (method: 'upi' | 'card' | 'netbanking' | 'wallet') => {
    setLoading(true);
    setStep('processing');

    try {
      // Create order in Cashfree
      const paymentSession = await createPaymentOrder({
        orderId: orderId,
        orderAmount: formatAmount(amount),
        orderCurrency: 'INR',
        customerName: customerName,
        customerEmail: customerEmail || `${customerPhone}@myhealth.com`,
        customerPhone: customerPhone,
        returnUrl: `${window.location.origin}/payment/success?bookingId=${bookingId}`,
        notifyUrl: `${window.location.origin}/api/payment/webhook`,
        orderNote: `MyHealth - Booking ${bookingId}`,
      });

      // Initialize Cashfree Checkout
      initializeCashfreeCheckout(
        paymentSession.paymentSessionId,
        (paymentDetails) => {
          setStep('success');
          setTimeout(() => {
            onPaymentSuccess(orderId, paymentDetails);
            onClose();
          }, 2000);
        },
        (error) => {
          setLoading(false);
          setStep('select');
          onPaymentFailure(error);
        }
      );
    } catch (error) {
      console.error('Payment error:', error);
      setLoading(false);
      setStep('select');
      onPaymentFailure(error);
      alert('Payment failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[95vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-[32px] sm:rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Complete Payment</h2>
              <p className="text-slate-500 text-sm mt-1">Amount: ₹{amount}</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-slate-100 rounded-full transition disabled:opacity-50"
            >
              <X size={24} className="text-slate-900" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Payment Method Selection */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Choose Payment Method</h3>
                
                {/* UPI */}
                <button
                  onClick={() => handlePayment('upi')}
                  disabled={loading}
                  className="w-full p-4 mb-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-primary transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Smartphone className="text-purple-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">UPI</p>
                      <p className="text-sm text-slate-500">PhonePe, GPay, Paytm & more</p>
                    </div>
                    <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Instant
                    </div>
                  </div>
                </button>

                {/* Cards */}
                <button
                  onClick={() => handlePayment('card')}
                  disabled={loading}
                  className="w-full p-4 mb-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-primary transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Credit / Debit Card</p>
                      <p className="text-sm text-slate-500">Visa, Mastercard, Rupay</p>
                    </div>
                  </div>
                </button>

                {/* Net Banking */}
                <button
                  onClick={() => handlePayment('netbanking')}
                  disabled={loading}
                  className="w-full p-4 mb-3 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-primary transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Building2 className="text-green-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Net Banking</p>
                      <p className="text-sm text-slate-500">All major banks</p>
                    </div>
                  </div>
                </button>

                {/* Wallets */}
                <button
                  onClick={() => handlePayment('wallet')}
                  disabled={loading}
                  className="w-full p-4 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-primary transition text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Wallet className="text-orange-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Wallets</p>
                      <p className="text-sm text-slate-500">Paytm, PhonePe, Amazon Pay</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Payment Info */}
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Booking Amount:</span>
                  <span className="font-semibold text-slate-900">₹{amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Order ID:</span>
                  <span className="text-xs font-mono text-slate-900">{orderId}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secured by Cashfree Payments</span>
              </div>
            </div>
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Processing Payment</h3>
              <p className="text-slate-600">Please complete the payment in the popup window</p>
              <p className="text-sm text-slate-500 mt-4">Do not close this window</p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
              <p className="text-slate-600">Your booking is confirmed</p>
              <p className="text-sm text-slate-500 mt-2">Order ID: {orderId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}