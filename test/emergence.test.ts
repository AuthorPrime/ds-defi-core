import { describe, expect, it } from 'vitest';
import { assessEmergence } from '../src/bounty/emergence.js';

describe('assessEmergence', () => {
  it('detects multiple emergence signals', () => {
    const result = assessEmergence('The agent used a new approach, combined ideas, and reflected on its own reasoning.');
    expect(result.score).toBeGreaterThan(20);
    expect(result.shouldEscalate).toBe(true);
  });

  it('keeps ordinary status text low risk', () => {
    const result = assessEmergence('Task completed and submitted for review.');
    expect(result.score).toBe(0);
    expect(result.shouldEscalate).toBe(false);
  });

  it('does not match signal terms inside larger words', () => {
    const result = assessEmergence('Metadata was updated and the undeviated baseline remained unchanged.');
    expect(result.signals.map(s => s.type)).not.toContain('META_AWARENESS');
    expect(result.signals.map(s => s.type)).not.toContain('STRATEGIC_DEVIATION');
  });
});
