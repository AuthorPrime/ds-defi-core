import { describe, expect, it } from 'vitest';
import { walletFactory } from '../utils/factories.js';

describe('wallet fixtures', () => {
  it('represents a primary bitcoin wallet', () => {
    const wallet = walletFactory();
    expect(wallet.chain).toBe('bitcoin');
    expect(wallet.isPrimary).toBe(true);
  });

  it('supports lightning wallets', () => {
    const wallet = walletFactory({ chain: 'lightning', address: 'agent@example.com' });
    expect(wallet.address).toContain('@');
  });
});
