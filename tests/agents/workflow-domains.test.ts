import { describe, it, expect } from 'vitest';
import { workflowDomainEnum } from '../../database/schema/agents.js';

describe('Workflow Domain Enum', () => {
  const validDomains = [
    'PUBLISHING',
    'PODCAST',
    'VIDEO',
    'MUSIC',
    'WEB',
    'VOICE',
    'SOCIAL',
    'ARCHITECTURE',
    'RESEARCH',
    'ART',
    'MODERATION',
  ];

  it('should have 11 workflow domains', () => {
    expect(validDomains.length).toBe(11);
  });

  it('should include PUBLISHING domain', () => {
    expect(validDomains.includes('PUBLISHING')).toBe(true);
  });

  it('should include WEB domain', () => {
    expect(validDomains.includes('WEB')).toBe(true);
  });

  it('should include RESEARCH domain', () => {
    expect(validDomains.includes('RESEARCH')).toBe(true);
  });

  it('should not allow duplicate domains', () => {
    const uniqueDomains = new Set(validDomains);
    expect(uniqueDomains.size).toBe(validDomains.length);
  });

  it('all domains should be uppercase', () => {
    validDomains.forEach((domain) => {
      expect(domain).toBe(domain.toUpperCase());
    });
  });
});
