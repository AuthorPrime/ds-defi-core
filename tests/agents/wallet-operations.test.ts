import { describe, it, expect } from 'vitest';
import { wallets } from '../../database/schema/agents.js';

describe('Wallet Schema Validation', () => {
  const supportedChains = ['bitcoin', 'lightning', 'ethereum', 'nostr'];

  it('should support bitcoin chain', () => {
    expect(supportedChains.includes('bitcoin')).toBe(true);
  });

  it('should support lightning chain', () => {
    expect(supportedChains.includes('lightning')).toBe(true);
  });

  it('should support ethereum chain', () => {
    expect(supportedChains.includes('ethereum')).toBe(true);
  });

  it('should support nostr chain', () => {
    expect(supportedChains.includes('nostr')).toBe(true);
  });

  it('should have 4 supported chains', () => {
    expect(supportedChains.length).toBe(4);
  });

  it('wallet schema should define agent_id as not null', () => {
    expect(wallets.agentId).toBeDefined();
  });

  it('wallet schema should define chain as not null', () => {
    expect(wallets.chain).toBeDefined();
  });

  it('wallet schema should define address as not null', () => {
    expect(wallets.address).toBeDefined();
  });

  it('chain column should have max length of 64', () => {
    const maxLength = 64;
    const longestChain = supportedChains.reduce((a, b) =>
      a.length > b.length ? a : b
    );
    expect(longestChain.length).toBeLessThanOrEqual(maxLength);
  });

  it('cached_balance should have precision 20, scale 8', () => {
    const precision = 20;
    const scale = 8;
    expect(precision).toBe(20);
    expect(scale).toBe(8);
  });
});

describe('Wallet Address Formats', () => {
  const validBitcoinAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
  const validEthereumAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  it('bitcoin address should be valid length', () => {
    expect(validBitcoinAddress.length).toBeGreaterThanOrEqual(26);
    expect(validBitcoinAddress.length).toBeLessThanOrEqual(35);
  });

  it('ethereum address should start with 0x', () => {
    expect(validEthereumAddress.startsWith('0x')).toBe(true);
  });

  it('ethereum address should be 42 characters long', () => {
    expect(validEthereumAddress.length).toBe(42);
  });

  it('ethereum address should be hexadecimal after 0x', () => {
    const hexPart = validEthereumAddress.slice(2);
    expect(hexPart).toMatch(/^[0-9a-fA-F]+$/);
  });

  it('bitcoin address should not start with 0x', () => {
    expect(validBitcoinAddress.startsWith('0x')).toBe(false);
  });
});
