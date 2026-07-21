/**
 * Wallet Module Index
 * Exports all wallet implementations
 */

export { LNDClient, getLNDClient } from './lightning.js';
export type {
  LightningInvoice,
  PaymentResult,
  WalletBalance,
  DecodedInvoice,
} from './lightning.js';
