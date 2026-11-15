import { v4 as uuidv4 } from 'uuid';

/**
 * Test data factories for consistent entity generation
 */
export const createMockAgent = (overrides = {}) => ({
  id: uuidv4(),
  name: 'Test Agent',
  level: 1,
  status: 'active',
  createdAt: new Date(),
  ...overrides,
});

export const createMockTask = (overrides = {}) => ({
  id: uuidv4(),
  title: 'Test Bounty',
  reward: '1000',
  status: 'open',
  ...overrides,
});