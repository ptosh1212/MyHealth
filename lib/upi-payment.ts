// UPI Payment Integration
// Supports PhonePe, Google Pay, Paytm, BHIM, and all UPI apps

interface UPIPaymentParams {
  payeeVPA: string; // Your UPI ID (e.g., yourname@paytm)
  payeeName: string; // Your business name
  amount: number;
  transactionNote: string;
  transactionRef: string; // Unique transaction ID
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'success' | 'failed';
  message: string;
}

// Your UPI Details (Change these to your actual UPI details)
const UPI_CONFIG = {
  vpa: 'zeyphrahealth@paytm', // Change to your UPI ID
  name: 'Zeyphra Health',
  merchantCode: 'ZEYPHRA', // Optional merchant code
};

/**
 * Generate UPI payment link
 */
export function generateUPILink(params: UPIPaymentParams): string {
  const { payeeVPA, payeeName, amount, transactionNote, transactionRef } = params;
  
  // UPI URI format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&tn=<Note>&tr=<Ref>
  const upiParams = new URLSearchParams({
    pa: payeeVPA, // Payee VPA (UPI ID)
    pn: payeeName, // Payee Name
    am: amount.toFixed(2), // Amount
    tn: transactionNote, // Transaction Note
    tr: transactionRef, // Transaction Reference
    cu: 'INR', // Currency
  });

  return `upi://pay?${upiParams.toString()}`;
}

/**
 * Generate UPI intent for specific apps
 */
export function generateUPIIntent(app: 'phonepe' | 'gpay' | 'paytm' | 'bhim', params: UPIPaymentParams): string {
  const baseLink = generateUPILink(params);
  
  const appPackages: Record<string, string> = {
    phonepe: 'com.phonepe.app',
    gpay: 'com.google.android.apps.nqr',
    paytm: 'net.one97.paytm',
    bhim: 'in.org.npci.upiapp',
  };

  // For Android deep linking
  return `intent://${baseLink.replace('upi://', '')}#Intent;scheme=upi;package=${appPackages[app]};end`;
}

/**
 * Open UPI payment in user's preferred app
 */
export function initiateUPIPayment(
  amount: number,
  transactionNote: string,
  transactionRef: string
): string {
  const params: UPIPaymentParams = {
    payeeVPA: UPI_CONFIG.vpa,
    payeeName: UPI_CONFIG.name,
    amount,
    transactionNote,
    transactionRef,
  };

  const upiLink = generateUPILink(params);
  
  // Open UPI link (works on mobile)
  if (typeof window !== 'undefined') {
    window.location.href = upiLink;
  }

  return upiLink;
}

/**
 * Generate QR code data for UPI payment
 */
export function generateUPIQRData(
  amount: number,
  transactionNote: string,
  transactionRef: string
): string {
  const params: UPIPaymentParams = {
    payeeVPA: UPI_CONFIG.vpa,
    payeeName: UPI_CONFIG.name,
    amount,
    transactionNote,
    transactionRef,
  };

  return generateUPILink(params);
}

/**
 * Verify payment status (mock implementation)
 * In production, you would:
 * 1. Use UPI PSP APIs to verify
 * 2. Or use webhook from payment gateway
 * 3. Or manual verification by admin
 */
export async function verifyPayment(transactionRef: string): Promise<PaymentResult> {
  // This is a mock implementation
  // In production, integrate with:
  // - Razorpay Payment Gateway
  // - Cashfree
  // - PayU
  // - Or your bank's UPI API
  
  return {
    success: false,
    transactionId: transactionRef,
    status: 'pending',
    message: 'Payment verification pending. Please confirm manually.',
  };
}

/**
 * Create payment record in database
 */
export function createPaymentRecord(
  bookingId: string,
  amount: number,
  transactionRef: string
) {
  return {
    bookingId,
    amount,
    transactionRef,
    status: 'pending',
    method: 'upi',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get popular UPI apps for user to choose
 */
export const UPI_APPS = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    icon: '📱',
    color: '#5f259f',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    icon: '💳',
    color: '#4285f4',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    icon: '💰',
    color: '#00baf2',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    icon: '🏦',
    color: '#097bed',
  },
  {
    id: 'other',
    name: 'Other UPI Apps',
    icon: '📲',
    color: '#6b7280',
  },
] as const;

/**
 * Format UPI ID for display
 */
export function formatUPIId(vpa: string): string {
  return vpa.toLowerCase().trim();
}

/**
 * Validate UPI ID format
 */
export function isValidUPIId(vpa: string): boolean {
  // UPI ID format: username@bankname
  const upiRegex = /^[\w.-]+@[\w.-]+$/;
  return upiRegex.test(vpa);
}