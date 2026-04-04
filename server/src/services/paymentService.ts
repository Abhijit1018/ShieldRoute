import crypto from 'crypto';
import Razorpay from 'razorpay';

type PaymentProvider = 'mock' | 'razorpay';

interface CreatePremiumOrderInput {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}

interface CreatePremiumOrderResult {
  provider: PaymentProvider;
  mockMode: boolean;
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId?: string;
}

interface VerifyPremiumPaymentInput {
  orderId: string;
  paymentId?: string;
  signature?: string;
}

interface VerifyPremiumPaymentResult {
  provider: PaymentProvider;
  mockMode: boolean;
  valid: boolean;
  paymentId: string;
}

let razorpayClient: Razorpay | null = null;

function isTruthy(value: string | undefined, defaultValue = true): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.includes('your_') || value.includes('xxxx') || value.includes('placeholder');
}

function getPaymentProvider(): PaymentProvider {
  const provider = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  return provider === 'razorpay' ? 'razorpay' : 'mock';
}

function buildMockOrderId(): string {
  return `mock_order_${Date.now()}`;
}

function buildMockPaymentId(): string {
  return `mock_pay_${Date.now()}`;
}

function getRazorpayClient(): Razorpay {
  if (razorpayClient) return razorpayClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (isPlaceholder(keyId) || isPlaceholder(keySecret)) {
    throw new Error('Razorpay credentials are missing or placeholders.');
  }

  razorpayClient = new Razorpay({
    key_id: keyId!,
    key_secret: keySecret!,
  });

  return razorpayClient;
}

export async function createPremiumOrder(input: CreatePremiumOrderInput): Promise<CreatePremiumOrderResult> {
  const provider = getPaymentProvider();

  if (provider === 'mock') {
    return {
      provider: 'mock',
      mockMode: true,
      orderId: buildMockOrderId(),
      amountPaise: input.amountPaise,
      currency: 'INR',
    };
  }

  try {
    const client = getRazorpayClient();

    const order = (await client.orders.create({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes,
    })) as { id: string; amount: number; currency: string };

    return {
      provider: 'razorpay',
      mockMode: false,
      orderId: order.id,
      amountPaise: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    if (!isTruthy(process.env.PAYMENT_MOCK_FALLBACK, true)) {
      throw error;
    }

    const warning = error instanceof Error ? error.message : 'Unknown Razorpay error';
    console.warn(`[Payment] Falling back to mock provider: ${warning}`);

    return {
      provider: 'mock',
      mockMode: true,
      orderId: buildMockOrderId(),
      amountPaise: input.amountPaise,
      currency: 'INR',
    };
  }
}

export function verifyPremiumPayment(input: VerifyPremiumPaymentInput): VerifyPremiumPaymentResult {
  const provider = getPaymentProvider();

  if (provider === 'mock') {
    return {
      provider: 'mock',
      mockMode: true,
      valid: true,
      paymentId: input.paymentId || buildMockPaymentId(),
    };
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (isPlaceholder(keySecret)) {
      throw new Error('Razorpay key secret is missing or placeholder.');
    }

    if (!input.paymentId || !input.signature) {
      return {
        provider: 'razorpay',
        mockMode: false,
        valid: false,
        paymentId: input.paymentId || '',
      };
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret!)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');

    return {
      provider: 'razorpay',
      mockMode: false,
      valid: generatedSignature === input.signature,
      paymentId: input.paymentId,
    };
  } catch (error) {
    if (!isTruthy(process.env.PAYMENT_MOCK_FALLBACK, true)) {
      throw error;
    }

    const warning = error instanceof Error ? error.message : 'Unknown Razorpay verification error';
    console.warn(`[Payment] Verification fallback to mock: ${warning}`);

    return {
      provider: 'mock',
      mockMode: true,
      valid: true,
      paymentId: input.paymentId || buildMockPaymentId(),
    };
  }
}
