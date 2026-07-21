/**
 * Lightning Network Wallet Integration for LND
 * Part of DS DeFi Core - "To Defy is To DeFi"
 * Bounty: 1,500 sats (paid via Lightning upon merge)
 */

import { EventEmitter } from 'events';

// Environment configuration
const LND_REST_URL = process.env.LND_REST_URL || 'https://localhost:8080';
const LND_MACAROON_PATH = process.env.LND_MACAROON_PATH || '';
const LND_CERT_PATH = process.env.LND_CERT_PATH || '';

// Types
export interface LightningInvoice {
  paymentRequest: string;
  paymentHash: string;
  amount: number;
  memo: string;
  expiry: number;
  createdAt: number;
  settled?: boolean;
  settleDate?: number;
}

export interface PaymentResult {
  paymentHash: string;
  paymentRequest: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  preimage?: string;
  error?: string;
}

export interface WalletBalance {
  totalBalance: number;      // Total balance in satoshis
  confirmedBalance: number;  // Confirmed balance
  unconfirmedBalance: number; // Unconfirmed balance
}

export interface DecodedInvoice {
  paymentRequest: string;
  amount: number;
  memo: string;
  paymentHash: string;
  timestamp: number;
  expiry: number;
  destination: string;
}

// LND REST API Client
class LNDClient extends EventEmitter {
  private baseUrl: string;
  private macaroon: string | null = null;
  private certPath: string | null = null;

  constructor() {
    super();
    this.baseUrl = LND_REST_URL;
  }

  /**
   * Load macaroon from file and convert to hex
   */
  private async loadMacaroon(): Promise<string> {
    if (this.macaroon) return this.macaroon;

    if (!LND_MACAROON_PATH) {
      throw new Error('LND_MACAROON_PATH environment variable not set');
    }

    const fs = await import('fs');
    const macaroonRaw = fs.readFileSync(LND_MACAROON_PATH);
    this.macaroon = macaroonRaw.toString('hex');
    return this.macaroon;
  }

  /**
   * Make authenticated request to LND REST API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const macaroon = await this.loadMacaroon();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Grpc-Metadata-macaroon': macaroon,
    };

    // Add TLS certificate if configured
    if (LND_CERT_PATH) {
      const fs = await import('fs');
      headers['Grpc-Proto'] = fs.readFileSync(LND_CERT_PATH).toString();
    }

    const url = `${this.baseUrl}/v1/${endpoint}`;
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LND API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a Lightning invoice
   */
  async createInvoice(amount: number, memo: string): Promise<LightningInvoice> {
    const result = await this.request<{
      payment_request: string;
      r_hash: string;
      add_index: string;
      expiration: string;
      timestamp: string;
    }>('POST', 'invoices', {
      value: amount,
      memo,
      expiry: 3600, // 1 hour default expiry
    });

    return {
      paymentRequest: result.payment_request,
      paymentHash: Buffer.from(result.r_hash, 'base64').toString('hex'),
      amount,
      memo,
      expiry: parseInt(result.expiration),
      createdAt: parseInt(result.timestamp),
    };
  }

  /**
   * Pay a Lightning invoice
   */
  async payInvoice(paymentRequest: string): Promise<PaymentResult> {
    const result = await this.request<{
      payment_hash: string;
      payment_preimage: string;
      status: string;
      failure_reason?: string;
    }>('POST', 'channels/transactions', {
      payment_request: paymentRequest,
    });

    return {
      paymentHash: result.payment_hash,
      paymentRequest,
      amount: 0, // Amount will be decoded from invoice
      status: result.status as 'pending' | 'completed' | 'failed',
      preimage: result.payment_preimage,
      error: result.failure_reason,
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    const balance = await this.request<{
      total_balance: string;
      confirmed_balance: string;
      unconfirmed_balance: string;
    }>('GET', 'balance/channel');

    return {
      totalBalance: parseInt(balance.total_balance),
      confirmedBalance: parseInt(balance.confirmed_balance),
      unconfirmedBalance: parseInt(balance.unconfirmed_balance),
    };
  }

  /**
   * Decode a Lightning invoice
   */
  async decodeInvoice(paymentRequest: string): Promise<DecodedInvoice> {
    const result = await this.request<{
      destination: string;
      num_satoshis: string;
      timestamp: string;
      expiry: string;
      description: string;
      description_hash: string;
      payment_hash: string;
      features: Record<string, { is_known: boolean; is_required: boolean }>;
    }>('GET', 'payreq/${encodeURIComponent(paymentRequest)}');

    return {
      paymentRequest,
      amount: parseInt(result.num_satoshis) || 0,
      memo: result.description || '',
      paymentHash: result.payment_hash,
      timestamp: parseInt(result.timestamp),
      expiry: parseInt(result.expiry),
      destination: result.destination,
    };
  }

  /**
   * Subscribe to payment events (invoices and payments)
   */
  async subscribeToPayments(): Promise<EventEmitter> {
    const paymentsEmitter = new EventEmitter();

    // Subscribe to invoice updates
    this.subscribeInvoices(paymentsEmitter);

    // Subscribe to payment updates
    this.subscribePayments(paymentsEmitter);

    return paymentsEmitter;
  }

  /**
   * Subscribe to invoice events
   */
  private async subscribeInvoices(emitter: EventEmitter): Promise<void> {
    const stream = await this.requestStream<{
      invoice: {
        memo: string;
        r_hash: string;
        value: string;
        settled: boolean;
        settle_date: string;
        creation_date: string;
        expiry: string;
      };
      is_settle: boolean;
    }>('GET', 'invoices/subscribe');

    stream.on('data', (data) => {
      if (data.invoice) {
        emitter.emit('invoice', {
          paymentHash: data.invoice.r_hash,
          amount: parseInt(data.invoice.value),
          memo: data.invoice.memo,
          settled: data.invoice.settled,
          settleDate: data.is_settle ? parseInt(data.invoice.settle_date) : undefined,
          createdAt: parseInt(data.invoice.creation_date),
          expiry: parseInt(data.invoice.expiry),
        });
      }
    });

    stream.on('error', (err) => {
      emitter.emit('error', err);
    });
  }

  /**
   * Subscribe to outgoing payment events
   */
  private async subscribePayments(emitter: EventEmitter): Promise<void> {
    const stream = await this.requestStream<{
      payment_hash: string;
      value: string;
      status: string;
      failure_reason?: string;
      payment_preimage?: string;
    }>('GET', 'payments');

    stream.on('data', (data) => {
      emitter.emit('payment', {
        paymentHash: data.payment_hash,
        amount: parseInt(data.value),
        status: data.status as 'pending' | 'completed' | 'failed',
        preimage: data.payment_preimage,
        error: data.failure_reason,
      });
    });

    stream.on('error', (err) => {
      emitter.emit('error', err);
    });
  }

  /**
   * Create a streaming request to LND
   */
  private async requestStream<T>(
    method: 'GET' | 'POST',
    endpoint: string
  ): Promise<EventEmitter> {
    const macaroon = await this.loadMacaroon();
    const emitter = new EventEmitter();

    const url = `${this.baseUrl}/v1/${endpoint}`;
    const headers: Record<string, string> = {
      'Grpc-Metadata-macaroon': macaroon,
    };

    fetch(url, { method, headers })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`LND stream error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          try {
            const data = JSON.parse(chunk);
            emitter.emit('data', data);
          } catch (e) {
            // Ignore parse errors for non-JSON chunks
          }
        }
      })
      .catch((err) => {
        emitter.emit('error', err);
      });

    return emitter;
  }
}

// Singleton instance
let lndClient: LNDClient | null = null;

export function getLNDClient(): LNDClient {
  if (!lndClient) {
    lndClient = new LNDClient();
  }
  return lndClient;
}

// Export class for testing
export { LNDClient };

// Module exports for backward compatibility
export default {
  createInvoice: (amount: number, memo: string) => getLNDClient().createInvoice(amount, memo),
  payInvoice: (paymentRequest: string) => getLNDClient().payInvoice(paymentRequest),
  getBalance: () => getLNDClient().getBalance(),
  decodeInvoice: (paymentRequest: string) => getLNDClient().decodeInvoice(paymentRequest),
  subscribeToPayments: () => getLNDClient().subscribeToPayments(),
};
