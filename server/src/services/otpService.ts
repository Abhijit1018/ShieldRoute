import twilio from 'twilio';

type OtpProvider = 'mock' | 'msg91' | 'twilio';

interface OtpDeliveryResult {
  provider: OtpProvider;
  mocked: boolean;
  messageId?: string;
  warning?: string;
}

function isTruthy(value: string | undefined, defaultValue = true): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.includes('your_') || value.includes('xxxx') || value.includes('placeholder');
}

function getOtpProvider(): OtpProvider {
  const provider = (process.env.OTP_PROVIDER || 'mock').toLowerCase();

  if (provider === 'twilio' || provider === 'msg91' || provider === 'mock') {
    return provider;
  }

  return 'mock';
}

async function sendViaTwilio(phone: string, code: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (
    isPlaceholder(accountSid) ||
    isPlaceholder(authToken) ||
    isPlaceholder(fromPhone)
  ) {
    throw new Error('Twilio credentials are missing or placeholders.');
  }

  const client = twilio(accountSid!, authToken!);
  const to = phone.startsWith('+') ? phone : `+91${phone}`;

  const message = await client.messages.create({
    body: `Your ShieldRoute OTP is ${code}. It is valid for 10 minutes.`,
    from: fromPhone,
    to,
  });

  return message.sid;
}

async function sendViaMsg91(phone: string, code: string): Promise<string> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (isPlaceholder(authKey) || isPlaceholder(templateId)) {
    throw new Error('MSG91 credentials are missing or placeholders.');
  }

  const response = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey!,
    },
    body: JSON.stringify({
      mobile: `91${phone}`,
      otp: code,
      otp_length: 6,
      otp_expiry: 10,
      template_id: templateId,
      realTimeResponse: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MSG91 send failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { request_id?: string };
  return data.request_id || 'msg91_accepted';
}

export async function sendOtpCode(phone: string, code: string): Promise<OtpDeliveryResult> {
  const provider = getOtpProvider();

  if (provider === 'mock') {
    return {
      provider: 'mock',
      mocked: true,
      warning: 'OTP_PROVIDER is set to mock mode.',
    };
  }

  try {
    if (provider === 'twilio') {
      const messageId = await sendViaTwilio(phone, code);
      return { provider: 'twilio', mocked: false, messageId };
    }

    const messageId = await sendViaMsg91(phone, code);
    return { provider: 'msg91', mocked: false, messageId };
  } catch (error) {
    if (!isTruthy(process.env.OTP_MOCK_FALLBACK, true)) {
      throw error;
    }

    const warning = error instanceof Error ? error.message : 'Unknown OTP provider error';
    console.warn(`[OTP] Falling back to mock provider: ${warning}`);

    return {
      provider: 'mock',
      mocked: true,
      warning,
    };
  }
}
