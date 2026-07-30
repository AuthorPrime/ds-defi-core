import { describe, expect, it } from 'vitest';
import {
  autoAssignTask,
  calculateMatchScore,
  findMatchingAgents,
  findMatchingTasks,
  suggestSkillDevelopment,
  type MatchDataSource,
} from '../../src/bounty/matcher.js';

const data: MatchDataSource = {
  agents: [
    {
      id: 'agent-strong',
      level: 'L3_SOVEREIGN',
      capabilities: ['typescript', 'testing', 'graphql'],
      interests: ['matching', 'workflow'],
      preferredDomains: ['bounty'],
      activeTaskCount: 1,
      maxConcurrentTasks: 4,
      reputationScore: 80,
      completedTasksByDomain: { bounty: 8 },
      podIds: ['pod-1'],
      optInAutoAssign: true,
    },
    {
      id: 'agent-busy',
      level: 'L4_MANAGER',
      capabilities: ['typescript', 'testing', 'graphql'],
      preferredDomains: ['bounty'],
      activeTaskCount: 3,
      maxConcurrentTasks: 3,
      reputationScore: 90,
      completedTasksByDomain: { bounty: 10 },
      podIds: ['pod-1'],
      optInAutoAssign: true,
    },
    {
      id: 'agent-junior',
      level: 'L0_CANDIDATE',
      capabilities: ['docs'],
      activeTaskCount: 0,
      maxConcurrentTasks: 2,
      reputationScore: 20,
      completedTasksByDomain: {},
      optInAutoAssign: false,
    },
  ],
  tasks: [
    {
      id: 'task-matcher',
      domain: 'bounty',
      requiredLevel: 'L1_WORKER',
      requiredCapabilities: ['typescript', 'testing'],
      tags: ['matching'],
      podId: 'pod-1',
      status: 'AVAILABLE',
    },
    {
      id: 'task-docs',
      domain: 'publishing',
      requiredLevel: 'L0_CANDIDATE',
      requiredCapabilities: ['docs'],
      tags: ['workflow'],
      status: 'AVAILABLE',
    },
    {
      id: 'task-claimed',
      domain: 'bounty',
      requiredLevel: 'L1_WORKER',
      requiredCapabilities: ['typescript'],
      status: 'CLAIMED',
    },
    {
      id: 'task-review',
      domain: 'bounty',
      requiredLevel: 'L1_WORKER',
      requiredCapabilities: ['typescript'],
      status: 'UNDER_REVIEW',
    },
  ],
};

describe('bounty matcher', () => {
  it('calculates a weighted match score with a useful breakdown', () => {
    const result = calculateMatchScore('agent-strong', 'task-matcher', data);

    expect(result.score).toBeGreaterThan(100);
    expect(result.breakdown.levelMatch).toBe(1);
    expect(result.breakdown.capabilityOverlap).toBe(1);
    expect(result.breakdown.podBonus).toBe(1);
    expect(result.reasons).toContain('Agent has all required capabilities.');
  });

  it('ranks matching agents for an available task', () => {
    const matches = findMatchingAgents('task-matcher', data);

    expect(matches[0].agentId).toBe('agent-strong');
    expect(matches.map((match) => match.agentId)).toContain('agent-busy');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it('recommends matching tasks for an agent and excludes claimed tasks', () => {
    const matches = findMatchingTasks('agent-strong', data);

    expect(matches.map((match) => match.taskId)).toContain('task-matcher');
    expect(matches.map((match) => match.taskId)).not.toContain('task-claimed');
  });

  it('auto-assigns only opted-in agents with available capacity', () => {
    const assignment = autoAssignTask('task-matcher', data);

    expect(assignment?.agentId).toBe('agent-strong');
    expect(assignment?.breakdown.availabilityScore).toBeGreaterThan(0);
  });

  it('suggests missing skills based on available task demand', () => {
    const suggestions = suggestSkillDevelopment('agent-junior', {
      ...data,
      tasks: [
        ...data.tasks,
        {
          id: 'task-testing-uppercase',
          domain: 'bounty',
          requiredLevel: 'L1_WORKER',
          requiredCapabilities: ['Testing'],
          status: 'AVAILABLE',
        },
      ],
    });

    expect(suggestions[0].capability).toBe('testing');
    expect(suggestions[0].matchingTaskCount).toBe(2);
    expect(suggestions.map((suggestion) => suggestion.capability)).toContain('typescript');
  });
});
