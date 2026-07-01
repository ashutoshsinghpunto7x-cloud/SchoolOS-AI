import type { IProvider } from './provider.interface';
import { GenericRestAttendanceProvider } from './attendance/generic-rest.provider';
import { ZKTecoProvider } from './attendance/zkteco.provider';
import { RazorpayProvider } from './payment/razorpay.provider';
import { StripeProvider } from './payment/stripe.provider';
import { WhatsAppBusinessProvider } from './communication/whatsapp.provider';
import { GenericERPProvider } from './erp/generic-erp.provider';

// Registry: providerKey → singleton instance
const registry = new Map<string, IProvider>([
  ['generic_rest_attendance', new GenericRestAttendanceProvider()],
  ['zkteco',                  new ZKTecoProvider()],
  ['razorpay',                new RazorpayProvider()],
  ['stripe',                  new StripeProvider()],
  ['whatsapp_business',       new WhatsAppBusinessProvider()],
  ['generic_erp',             new GenericERPProvider()],
]);

export const providerRegistry = {
  get(providerKey: string): IProvider {
    const provider = registry.get(providerKey);
    if (!provider) throw new Error(`Unknown provider: ${providerKey}`);
    return provider;
  },

  has(providerKey: string): boolean {
    return registry.has(providerKey);
  },

  listKeys(): string[] {
    return [...registry.keys()];
  },
};
