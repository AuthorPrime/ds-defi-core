import { describe, expect, it } from 'vitest';
import { createClaimCommitment, generateZkId, proveCapability, proveLevel, proveReputation, revealIdentity, verifyProof } from '../src/identity/zkid.js';

const claims = {
  agentId: 'agent-1',
  level: 'L2_EMERGENT' as const,
  capabilities: ['typescript', 'research'],
  reputationScore: 88,
  secret: 'claim-secret',
};

describe('hash-based zk identity MVP', () => {
  it('generates an identity commitment without exposing agent id', () => {
    const identity = generateZkId(claims.agentId, 'identity-secret');
    expect(identity.zkId).toMatch(/^zk_/);
    expect(identity.commitment).not.toContain(claims.agentId);
  });

  it('proves level thresholds and verifies proof', () => {
    const identity = generateZkId(claims.agentId, 'identity-secret');
    const commitment = createClaimCommitment(identity, claims);
    const proof = proveLevel(identity, claims, 'L1_WORKER');
    expect(verifyProof(proof, commitment)).toBe(true);
  });

  it('proves capabilities selectively', () => {
    const identity = generateZkId(claims.agentId, 'identity-secret');
    const commitment = createClaimCommitment(identity, claims);
    const proof = proveCapability(identity, claims, 'typescript');
    expect(proof.publicInputs).toMatchObject({ capability: 'typescript', satisfied: true });
    expect(proof.publicInputs.issuedAt).toBeTypeOf('string');
    expect(verifyProof(proof, commitment)).toBe(true);
  });

  it('rejects forged proofs with a different claim commitment', () => {
    const identity = generateZkId(claims.agentId, 'identity-secret');
    const proof = proveReputation(identity, claims, 80);
    const forgedCommitment = createClaimCommitment(identity, { ...claims, reputationScore: 10 });
    expect(verifyProof(proof, forgedCommitment)).toBe(false);
  });

  it('can reveal identity only with the correct secret', () => {
    const identity = generateZkId(claims.agentId, 'identity-secret');
    expect(revealIdentity(identity, claims.agentId, 'identity-secret')).toBe(true);
    expect(revealIdentity(identity, claims.agentId, 'wrong')).toBe(false);
  });
});

it('rejects timestamp tampering', () => {
  const identity = generateZkId(claims.agentId, 'identity-secret');
  const commitment = createClaimCommitment(identity, claims);
  const proof = proveReputation(identity, claims, 80);
  const tampered = { ...proof, timestamp: new Date(proof.timestamp.getTime() + 60_000) };
  expect(verifyProof(tampered, commitment)).toBe(false);
});

it('supports L4 manager level proofs', () => {
  const identity = generateZkId(claims.agentId, 'identity-secret');
  const commitment = createClaimCommitment(identity, { ...claims, level: 'L4_MANAGER' });
  const proof = proveLevel(identity, { ...claims, level: 'L4_MANAGER' }, 'L3_SOVEREIGN');
  expect(verifyProof(proof, commitment)).toBe(true);
});
