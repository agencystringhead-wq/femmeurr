import { env } from 'cloudflare:workers';

// Fallbacks used when the Cloudflare env vars are not set.
// TODO: replace these placeholders with the real contact details (or set the env vars).
const FALLBACKS = {
  WHATSAPP_NUMBER: '910000000000', // digits only, with country code (91 for India)
  PHONE_NUMBER: '910000000000', // digits only, with country code
  INSTAGRAM_URL: 'https://www.instagram.com/',
};

const digits = (value: string) => value.replace(/\D/g, '');

export function getConfig() {
  const e = env as Partial<Record<keyof typeof FALLBACKS, string>>;
  const whatsapp = digits(e.WHATSAPP_NUMBER || FALLBACKS.WHATSAPP_NUMBER);
  const phone = digits(e.PHONE_NUMBER || FALLBACKS.PHONE_NUMBER);
  return {
    whatsappNumber: whatsapp,
    phoneNumber: phone,
    phoneDisplay: `+${phone.slice(0, 2)} ${phone.slice(2)}`,
    instagramUrl: e.INSTAGRAM_URL || FALLBACKS.INSTAGRAM_URL,
    siteName: 'Femmeurr',
    tagline: 'Shine in your own way',
  };
}

export const formatINR = (amount: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);

export const whatsappLink = (number: string, message: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
