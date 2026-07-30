import { describe, expect, it } from 'vitest';
import {
  analyzeAgentOutput,
  calculateEmergenceScore,
  checkGraduationEligibility,
  flagForReview,
  runScheduledCheck,
  type EmergenceEvent,
} from '../../src/emergence/detector.js';

function verifiedEvent(agentId: string, weight: number): EmergenceEvent {
  return {
    id: `${agentId}-${weight}`,
    agentId,
    type: 'META_AWARENESS',
    weight,
    evidence: 'verified',
    context: {},
    isVerified: true,
    createdAt: '2026-05-10T00:00:00Z',
  };
}

describe('emergence detector', () => {
  it('detects weighted emergence signals from agent output', () => {
    const analysis = analyzeAgentOutput(
      'agent-1',
      'I was wrong earlier. Correction: I prefer a hybrid approach that combines workflow planning with testing. As an agent, I notice that my reasoning improved.'
    );

    expect(analysis.rawScore).toBeGreaterThanOrEqual(45);
    expect(analysis.flaggedForReview).toBe(true);
    expect(analysis.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['SELF_CORRECTION', 'PREFERENCE_EXPRESSION', 'CREATIVE_SYNTHESIS', 'META_AWARENESS'])
    );
    expect(new Set(analysis.events.map((event) => event.id)).size).toBe(analysis.events.length);
  });

  it('avoids false positives on basic operational output', () => {
    const analysis = analyzeAgentOutput('agent-1', 'Task completed. Tests passed. Pull request opened.');

    expect(analysis.events).toEqual([]);
    expect(analysis.rawScore).toBe(0);
    expect(analysis.flaggedForReview).toBe(false);
  });

  it('calculates aggregate score from verified events only', () => {
    const events = [
      verifiedEvent('agent-1', 100),
      { ...verifiedEvent('agent-1', 100), isVerified: false },
      verifiedEvent('agent-2', 100),
    ];

    expect(calculateEmergenceScore('agent-1', events)).toBe(100);
  });

  it('checks graduation eligibility by level and extra criteria', () => {
    const candidate = checkGraduationEligibility({
      agentId: 'agent-0',
      level: 'L0_CANDIDATE',
      events: [verifiedEvent('agent-0', 50)],
    });
    const eligible = checkGraduationEligibility({
      agentId: 'agent-1',
      level: 'L1_WORKER',
      events: [verifiedEvent('agent-1', 50), verifiedEvent('agent-1', 50), verifiedEvent('agent-1', 50)],
    });
    const blocked = checkGraduationEligibility({
      agentId: 'agent-2',
      level: 'L2_EMERGENT',
      events: [verifiedEvent('agent-2', 500)],
      managerEndorsed: false,
    });

    expect(candidate.eligible).toBe(true);
    expect(candidate.nextLevel).toBe('L1_WORKER');
    expect(eligible.eligible).toBe(true);
    expect(eligible.nextLevel).toBe('L2_EMERGENT');
    expect(blocked.eligible).toBe(false);
    expect(blocked.missingCriteria).toContain('Requires manager endorsement.');
  });

  it('queues review items and runs scheduled checks', () => {
    const event = verifiedEvent('agent-1', 20);
    const review = flagForReview('agent-1', event);
    const scheduled = runScheduledCheck([
      { agentId: 'agent-1', output: 'As an agent, my reasoning shows a novel approach.' },
      { agentId: 'agent-2', output: 'Plain status update.' },
    ]);

    expect(review.priority).toBe('HIGH');
    expect(scheduled.analyzedCount).toBe(2);
    expect(scheduled.flagged.length).toBeGreaterThan(0);
  });
});
