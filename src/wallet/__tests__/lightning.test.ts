/**
 * Unit Tests for Lightning Wallet Integration
 * Mocks LND REST API responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LNDClient } from '../lightning.js';

// Mock environment
const originalEnv = process.env;

describe('Lightning Wallet Integration', () => {
  let client: LNDClient;
  let mockFetch: vi.SpyInstance;
  let mockMacaroonLoader: vi.SpyInstance;

  beforeEach(() => {
    client = new LNDClient();
    vi.spyOn(client, 'loadMacaroon').mockResolvedValue('mock-macaroon-hex');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInvoice', () => {
    it('should create invoice with correct parameters', async () => {
      const mockInvoiceResponse = {
        payment_request: 'lnbc1000n1pwk7q8gpp5x5qyz8qp5x5qyz8qp5x5qyz8qp5x5qyz8qp5x5qyz8qp5x5qyz8qpshyeu',
        r_hash: 'aGVsbG8gd29ybGQ=', // base64 of 'hello world'
        add_index: '1',
        expiration: '3600',
        timestamp: Date.now().toString(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInvoiceResponse),
      }) as unknown as typeof fetch;

      const invoice = await client.createInvoice(1000, 'Test payment');

      expect(invoice.amount).toBe(1000);
      expect(invoice.memo).toBe('Test payment');
      expect(invoice.paymentRequest).toBeDefined();
      expect(invoice.paymentHash).toBe('68656c6c6f20776f726c64'); // hex of 'hello world'
    });

    it('should throw error on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      }) as unknown as typeof fetch;

      await expect(client.createInvoice(1000, 'Test'))
        .rejects.toThrow('LND API error (500)');
    });
  });

  describe('getBalance', () => {
    it('should return wallet balance in satoshis', async () => {
      const mockBalanceResponse = {
        total_balance: '100000',
        confirmed_balance: '80000',
        unconfirmed_balance: '20000',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBalanceResponse),
      }) as unknown as typeof fetch;

      const balance = await client.getBalance();

      expect(balance.totalBalance).toBe(100000);
      expect(balance.confirmedBalance).toBe(80000);
      expect(balance.unconfirmedBalance).toBe(20000);
    });
  });

  describe('decodeInvoice', () => {
    it('should decode invoice details correctly', async () => {
      const mockDecodeResponse = {
        destination: '03abcdef...',
        num_satoshis: '5000',
        timestamp: Date.now().toString(),
        expiry: '3600',
        description: 'Payment for services',
        description_hash: '',
        payment_hash: 'abc123',
        features: {},
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockDecodeResponse),
      }) as unknown as typeof fetch;

      const decoded = await client.decodeInvoice('lnbc5000n1...');

      expect(decoded.amount).toBe(5000);
      expect(decoded.memo).toBe('Payment for services');
      expect(decoded.paymentHash).toBe('abc123');
      expect(decoded.destination).toBe('03abcdef...');
    });
  });

  describe('payInvoice', () => {
    it('should return payment result on success', async () => {
      const mockPaymentResponse = {
        payment_hash: 'hash123',
        payment_preimage: 'preimage456',
        status: 'completed',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPaymentResponse),
      }) as unknown as typeof fetch;

      const result = await client.payInvoice('lnbc1000n1...');

      expect(result.status).toBe('completed');
      expect(result.paymentHash).toBe('hash123');
      expect(result.preimage).toBe('preimage456');
    });

    it('should include error on payment failure', async () => {
      const mockPaymentResponse = {
        payment_hash: 'hash123',
        status: 'failed',
        failure_reason: 'INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPaymentResponse),
      }) as unknown as typeof fetch;

      const result = await client.payInvoice('lnbc1000n1...');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('INCORRECT_OR_UNKNOWN_PAYMENT_DETAILS');
    });
  });
});
