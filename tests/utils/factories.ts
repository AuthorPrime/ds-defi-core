let counter = 0;
function uid(prefix: string) { counter += 1; return `${prefix}-${counter}`; }

export function agentFactory(overrides: Record<string, unknown> = {}) {
  return {
    id: uid('agent'),
    displayName: 'Test Agent',
    agentType: 'AI',
    level: 'L1_WORKER',
    capabilities: ['typescript', 'research'],
    preferences: { domains: ['WEB'], maxConcurrentTasks: 3 },
    reputationScore: 100,
    isActive: true,
    ...overrides,
  };
}

export function taskFactory(overrides: Record<string, unknown> = {}) {
  return {
    id: uid('task'),
    title: 'Test bounty',
    description: 'A test bounty task',
    domain: 'WEB',
    requiredLevel: 'L1_WORKER',
    requiredCapabilities: ['typescript'],
    status: 'AVAILABLE',
    bountyAmount: '1000',
    bountyToken: 'SATS',
    bonusMultiplier: '1.00',
    ...overrides,
  };
}

export function walletFactory(overrides: Record<string, unknown> = {}) {
  return {
    id: uid('wallet'),
    agentId: uid('agent'),
    chain: 'bitcoin',
    address: 'bc1qexample',
    cachedBalance: '0',
    isPrimary: true,
    isActive: true,
    ...overrides,
  };
}
