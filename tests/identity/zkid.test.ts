import { describe, expect, it } from 'vitest';
import {
  createRevealSignature,
  generateZkId,
  proveCapability,
  proveLevel,
  proveReputation,
  revealIdentity,
  verifyProof,
  type ZkProof,
} from '../../src/identity/zkid.js';

describe('zk identity system', () => {
  it('creates commitment-based ids without exposing the agent id', () => {
    const identity = generateZkId('agent-alpha', {
      level: 'L2_EMERGENT',
      capabilities: ['Publishing', 'Bounty Matching'],
      reputationScore: 420,
    });

    expect(identity.zkId).toMatch(/^zk_[a-f0-9]{32}$/);
    expect(identity.zkId).not.toContain('agent-alpha');
    expect(identity.commitment).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates verifiable level, capability, and reputation proofs', () => {
    const identity = generateZkId('agent-beta', {
      level: 'L3_SOVEREIGN',
      capabilities: ['Rust', 'Lightning'],
      reputationScore: 900,
    });

    expect(verifyProof(proveLevel(identity.zkId, 'L2_EMERGENT'))).toBe(true);
    expect(verifyProof(proveCapability(identity.zkId, 'lightning'))).toBe(true);
    expect(verifyProof(proveReputation(identity.zkId, 750))).toBe(true);
  });

  it('rejects insufficient claims before issuing a proof', () => {
    const identity = generateZkId('agent-gamma', {
      level: 'L1_WORKER',
      capabilities: ['docs'],
      reputationScore: 15,
    });

    expect(() => proveLevel(identity.zkId, 'L3_SOVEREIGN')).toThrow('minimum level');
    expect(() => proveCapability(identity.zkId, 'audits')).toThrow('capability');
    expect(() => proveReputation(identity.zkId, 100)).toThrow('minimum reputation');
  });

  it('fails verification when public inputs or commitments are tampered with', () => {
    const identity = generateZkId('agent-delta', {
      level: 'L4_MANAGER',
      capabilities: ['security'],
      reputationScore: 1200,
    });
    const validProof = proveLevel(identity.zkId, 'L2_EMERGENT');
    const tamperedInputs: ZkProof = {
      ...validProof,
      publicInputs: { ...validProof.publicInputs, minLevel: 'L4_MANAGER' },
    };
    const tamperedCommitment: ZkProof = {
      ...validProof,
      commitment: '0'.repeat(64),
    };

    expect(verifyProof(validProof)).toBe(true);
    expect(verifyProof(tamperedInputs)).toBe(false);
    expect(verifyProof(tamperedCommitment)).toBe(false);
  });

  it('does not accept proofs recreated from public fields only', () => {
    const identity = generateZkId('agent-public-forgery', {
      level: 'L3_SOVEREIGN',
      capabilities: ['reviews'],
      reputationScore: 500,
    });
    const validProof = proveLevel(identity.zkId, 'L1_WORKER');
    const forgedProof: ZkProof = {
      ...validProof,
      proof: '0'.repeat(64),
    };

    expect(validProof).not.toHaveProperty('proofSecret');
    expect(verifyProof(validProof)).toBe(true);
    expect(verifyProof(forgedProof)).toBe(false);
  });

  it('canonicalizes undefined proof inputs without runtime errors', () => {
    const malformedProof: ZkProof = {
      type: 'level',
      zkId: 'zk_unknown',
      commitment: '0'.repeat(64),
      publicInputs: { minLevel: undefined as unknown as string },
      proof: '0'.repeat(64),
      timestamp: new Date(),
    };

    expect(() => verifyProof(malformedProof)).not.toThrow();
    expect(verifyProof(malformedProof)).toBe(false);
  });

  it('reveals identity only with a valid reveal signature', () => {
    const identity = generateZkId('agent-epsilon', {
      level: 'L2_EMERGENT',
      capabilities: ['coordination'],
      reputationScore: 300,
    });

    expect(() => revealIdentity(identity.zkId, 'invalid-signature')).toThrow('Invalid reveal signature');

    const revealed = revealIdentity(identity.zkId, createRevealSignature(identity.zkId));

    expect(revealed.agentId).toBe('agent-epsilon');
    expect(revealed.level).toBe('L2_EMERGENT');
    expect(revealed.capabilities).toEqual(['coordination']);
  });
});
