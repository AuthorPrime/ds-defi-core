import { describe, it, expect } from 'vitest';
import { createMockAgent } from '../utils/factories';

describe('Agent Lifecycle', () => {
  it('should initialize agent with default level 1', () => {
    const agent = createMockAgent({ level: 1 });
    expect(agent.level).toBe(1);
    expect(agent.status).toBe('active');
  });
});