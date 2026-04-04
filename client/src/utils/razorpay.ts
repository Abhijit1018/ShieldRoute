const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export interface OpenRazorpayCheckoutInput {
  keyId: string;
  orderId: string;
  amountPaise: number;
  riderName?: string;
  riderPhone?: string;
}

export interface OpenRazorpayCheckoutResult {
  paymentId: string;
  orderId: string;
  signature: string;
}

function loadCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout only works in browser context.'));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(input: OpenRazorpayCheckoutInput): Promise<OpenRazorpayCheckoutResult> {
  await loadCheckoutScript();

  const RazorpayCtor = window.Razorpay;

  if (!RazorpayCtor) {
    throw new Error('Razorpay SDK unavailable.');
  }

  return new Promise((resolve, reject) => {
    const razorpay = new RazorpayCtor({
      key: input.keyId,
      amount: input.amountPaise,
      currency: 'INR',
      name: 'ShieldRoute',
      description: 'Weekly Policy Premium',
      order_id: input.orderId,
      prefill: {
        name: input.riderName,
        contact: input.riderPhone,
      },
      notes: {
        product: 'Weekly premium',
      },
      theme: {
        color: '#14B8A6',
      },
      handler: (response) => {
        resolve({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment popup closed before completion.'));
        },
      },
    });

    razorpay.on?.('payment.failed', (response) => {
      reject(new Error(response?.error?.description || 'Payment failed.'));
    });

    razorpay.open();
  });
}
