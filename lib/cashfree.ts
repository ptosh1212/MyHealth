// Cashfree Payment Gateway Integration
// Auto-verifies UPI payments, supports all payment methods

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  environment: 'TEST' | 'PROD';
}

interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
  orderNote?: string;
}

interface PaymentSession {
  orderId: string;
  paymentSessionId: string;
  orderStatus: string;
}

// Cashfree Configuration
// Get these from: https://merchant.cashfree.com/merchants/login
const CASHFREE_CONFIG: CashfreeConfig = {
  appId: process.env.NEXT_PUBLIC_CASHFREE_APP_ID || 'TEST_APP_ID', // Replace with your App ID
  secretKey: process.env.CASHFREE_SECRET_KEY || 'TEST_SECRET_KEY', // Replace with your Secret Key
  environment: (process.env.NEXT_PUBLIC_CASHFREE_ENV as 'TEST' | 'PROD') || 'TEST',
};

// API URLs
const API_URLS = {
  TEST: 'https://sandbox.cashfree.com/pg',
  PROD: 'https://api.cashfree.com/pg',
};

const BASE_URL = API_URLS[CASHFREE_CONFIG.environment];

/**
 * Generate signature for Cashfree API
 */
function generateSignature(postData: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', CASHFREE_CONFIG.secretKey)
    .update(postData)
    .digest('base64');
}

/**
 * Create payment order
 */
export async function createPaymentOrder(params: CreateOrderParams): Promise<PaymentSession> {
  try {
    const orderData = {
      order_id: params.orderId,
      order_amount: params.orderAmount,
      order_currency: params.orderCurrency,
      customer_details: {
        customer_id: params.customerPhone,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
      },
      order_meta: {
        return_url: params.returnUrl,
        notify_url: params.notifyUrl,
      },
      order_note: params.orderNote || '',
    };

    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_CONFIG.appId,
        'x-client-secret': CASHFREE_CONFIG.secretKey,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    const data = await response.json();
    
    return {
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
    };
  } catch (error) {
    console.error('Cashfree order creation error:', error);
    throw error;
  }
}

/**
 * Verify payment signature (webhook)
 */
export function verifyWebhookSignature(
  signature: string,
  timestamp: string,
  rawBody: string
): boolean {
  const crypto = require('crypto');
  const signatureData = `${timestamp}${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', CASHFREE_CONFIG.secretKey)
    .update(signatureData)
    .digest('base64');
  
  return signature === expectedSignature;
}

/**
 * Get payment status
 */
export async function getPaymentStatus(orderId: string): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_CONFIG.appId,
        'x-client-secret': CASHFREE_CONFIG.secretKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get payment status');
    }

    return await response.json();
  } catch (error) {
    console.error('Payment status error:', error);
    throw error;
  }
}

/**
 * Initialize Cashfree Checkout (Client-side)
 */
export function initializeCashfreeCheckout(
  paymentSessionId: string,
  onSuccess: (data: any) => void,
  onFailure: (data: any) => void
) {
  if (typeof window === 'undefined') return;

  // Load Cashfree SDK
  const script = document.createElement('script');
  script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
  script.async = true;
  
  script.onload = () => {
    // @ts-ignore
    const cashfree = window.Cashfree({
      mode: CASHFREE_CONFIG.environment === 'PROD' ? 'production' : 'sandbox',
    });

    const checkoutOptions = {
      paymentSessionId: paymentSessionId,
      returnUrl: `${window.location.origin}/payment/callback`,
      redirectTarget: '_self', // or '_modal' for popup
    };

    cashfree.checkout(checkoutOptions).then((result: any) => {
      if (result.error) {
        onFailure(result.error);
      } else if (result.paymentDetails) {
        onSuccess(result.paymentDetails);
      }
    });
  };

  document.body.appendChild(script);
}

/**
 * Create refund
 */
export async function createRefund(
  orderId: string,
  refundAmount: number,
  refundNote: string
): Promise<any> {
  try {
    const refundData = {
      refund_amount: refundAmount,
      refund_note: refundNote,
    };

    const response = await fetch(`${BASE_URL}/orders/${orderId}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_CONFIG.appId,
        'x-client-secret': CASHFREE_CONFIG.secretKey,
      },
      body: JSON.stringify(refundData),
    });

    if (!response.ok) {
      throw new Error('Failed to create refund');
    }

    return await response.json();
  } catch (error) {
    console.error('Refund error:', error);
    throw error;
  }
}

/**
 * Generate unique order ID
 */
export function generateOrderId(prefix: string = 'ZH'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Format amount for Cashfree (in rupees, not paise)
 */
export function formatAmount(amount: number): number {
  return parseFloat(amount.toFixed(2));
}

/**
 * Payment status mapping
 */
export const PAYMENT_STATUS = {
  ACTIVE: 'ACTIVE', // Order created
  PAID: 'PAID', // Payment successful
  EXPIRED: 'EXPIRED', // Order expired
  CANCELLED: 'CANCELLED', // Order cancelled
  FAILED: 'FAILED', // Payment failed
  PENDING: 'PENDING', // Payment pending
} as const;

/**
 * Check if payment is successful
 */
export function isPaymentSuccessful(status: string): boolean {
  return status === PAYMENT_STATUS.PAID;
}

/**
 * Check if payment is pending
 */
export function isPaymentPending(status: string): boolean {
  return status === PAYMENT_STATUS.ACTIVE || status === PAYMENT_STATUS.PENDING;
}

/**
 * Check if payment failed
 */
export function isPaymentFailed(status: string): boolean {
  return status === PAYMENT_STATUS.FAILED || 
         status === PAYMENT_STATUS.EXPIRED || 
         status === PAYMENT_STATUS.CANCELLED;
}