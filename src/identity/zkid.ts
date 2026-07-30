import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type AgentLevel = 'L0_CANDIDATE' | 'L1_WORKER' | 'L2_EMERGENT' | 'L3_SOVEREIGN' | 'L4_MANAGER';

export type ZkProofType = 'level' | 'capability' | 'reputation' | 'composite';

export interface ZkIdentityClaims {
  level?: AgentLevel;
  capabilities?: string[];
  reputationScore?: number;
}

export interface ZkIdentity {
  zkId: string;
  commitment: string;
  createdAt: string;
}

export interface ZkProof {
  type: ZkProofType;
  zkId: string;
  commitment: string;
  publicInputs: Record<string, string | number | boolean>;
  proof: string;
  timestamp: Date;
}

export interface RevealedIdentity {
  zkId: string;
  agentId: string;
  level: AgentLevel;
  capabilities: string[];
  reputationScore: number;
  revealedAt: string;
}

interface ZkIdentityRecord extends ZkIdentityClaims {
  zkId: string;
  agentId: string;
  salt: string;
  proofSecret: string;
  commitment: string;
  createdAt: string;
  level: AgentLevel;
  capabilities: string[];
  reputationScore: number;
}

// MVP upgrade path: replace proofDigest/createProof with a snarkjs, circom, or
// Semaphore proof adapter while keeping the public proof contract stable.
const PROOF_VERSION = 'zkid-hash-mvp-v1';

const LEVEL_RANK: Record<AgentLevel, number> = {
  L0_CANDIDATE: 0,
  L1_WORKER: 1,
  L2_EMERGENT: 2,
  L3_SOVEREIGN: 3,
  L4_MANAGER: 4,
};

const registry = new Map<string, ZkIdentityRecord>();

export function generateZkId(agentId: string, claims: ZkIdentityClaims = {}): ZkIdentity {
  if (!agentId.trim()) {
    throw new Error('agentId is required to generate a ZK identity.');
  }

  const salt = randomBytes(16).toString('hex');
  const proofSecret = randomBytes(32).toString('hex');
  const normalizedClaims = normalizeClaims(claims);
  const commitment = hashCanonical({
    version: PROOF_VERSION,
    agentId,
    salt,
    level: normalizedClaims.level,
    capabilities: normalizedClaims.capabilities,
    reputationScore: normalizedClaims.reputationScore,
  });
  const zkId = `zk_${hashCanonical({ commitment, salt }).slice(0, 32)}`;
  const record: ZkIdentityRecord = {
    zkId,
    agentId,
    salt,
    proofSecret,
    commitment,
    createdAt: new Date().toISOString(),
    ...normalizedClaims,
  };

  registry.set(zkId, record);

  return {
    zkId,
    commitment,
    createdAt: record.createdAt,
  };
}

export function proveLevel(zkId: string, minLevel: AgentLevel): ZkProof {
  const record = requireRecord(zkId);
  if (LEVEL_RANK[record.level] < LEVEL_RANK[minLevel]) {
    throw new Error(`Identity does not satisfy minimum level ${minLevel}.`);
  }

  return createProof(record, 'level', {
    minLevel,
    levelRankAtLeast: LEVEL_RANK[minLevel],
  });
}

export function proveCapability(zkId: string, capability: string): ZkProof {
  const record = requireRecord(zkId);
  const normalizedCapability = normalizeCapability(capability);

  if (!record.capabilities.includes(normalizedCapability)) {
    throw new Error(`Identity does not prove capability ${capability}.`);
  }

  return createProof(record, 'capability', {
    capabilityHash: hashCanonical({ capability: normalizedCapability }),
  });
}

export function proveReputation(zkId: string, minScore: number): ZkProof {
  const record = requireRecord(zkId);
  if (!Number.isFinite(minScore) || minScore < 0) {
    throw new Error('minScore must be a non-negative finite number.');
  }
  if (record.reputationScore < minScore) {
    throw new Error(`Identity does not satisfy minimum reputation ${minScore}.`);
  }

  return createProof(record, 'reputation', {
    minScore,
  });
}

export function verifyProof(proof: ZkProof): boolean {
  const record = registry.get(proof.zkId);
  if (!record || record.commitment !== proof.commitment) {
    return false;
  }

  if (proof.type === 'level' && !verifyLevelInputs(record, proof.publicInputs)) {
    return false;
  }
  if (proof.type === 'capability' && !verifyCapabilityInputs(record, proof.publicInputs)) {
    return false;
  }
  if (proof.type === 'reputation' && !verifyReputationInputs(record, proof.publicInputs)) {
    return false;
  }
  if (proof.type === 'composite') {
    return false;
  }

  return safeEqual(proof.proof, proofDigest(proof.type, proof.commitment, proof.publicInputs, record.proofSecret));
}

export function createRevealSignature(zkId: string): string {
  const record = requireRecord(zkId);

  return hashCanonical({
    version: PROOF_VERSION,
    purpose: 'identity-reveal',
    zkId,
    agentId: record.agentId,
    salt: record.salt,
  });
}

export function revealIdentity(zkId: string, signature: string): RevealedIdentity {
  const record = requireRecord(zkId);
  if (!safeEqual(signature, createRevealSignature(zkId))) {
    throw new Error('Invalid reveal signature.');
  }

  return {
    zkId,
    agentId: record.agentId,
    level: record.level,
    capabilities: [...record.capabilities],
    reputationScore: record.reputationScore,
    revealedAt: new Date().toISOString(),
  };
}

function normalizeClaims(claims: ZkIdentityClaims): Required<ZkIdentityClaims> {
  return {
    level: claims.level ?? 'L0_CANDIDATE',
    capabilities: [...new Set((claims.capabilities ?? []).map(normalizeCapability))].sort(),
    reputationScore: claims.reputationScore ?? 0,
  };
}

function normalizeCapability(capability: string): string {
  const normalized = capability.trim().toLowerCase();
  if (!normalized) {
    throw new Error('capability is required.');
  }

  return normalized;
}

function requireRecord(zkId: string): ZkIdentityRecord {
  const record = registry.get(zkId);
  if (!record) {
    throw new Error(`Unknown ZK identity ${zkId}.`);
  }

  return record;
}

function createProof(
  record: ZkIdentityRecord,
  type: ZkProofType,
  publicInputs: ZkProof['publicInputs']
): ZkProof {
  return {
    type,
    zkId: record.zkId,
    commitment: record.commitment,
    publicInputs,
    proof: proofDigest(type, record.commitment, publicInputs, record.proofSecret),
    timestamp: new Date(),
  };
}

function proofDigest(
  type: ZkProofType,
  commitment: string,
  publicInputs: ZkProof['publicInputs'],
  proofSecret: string
): string {
  return hashCanonical({
    version: PROOF_VERSION,
    type,
    commitment,
    publicInputs,
    proofSecret,
  });
}

function verifyLevelInputs(record: ZkIdentityRecord, inputs: ZkProof['publicInputs']): boolean {
  const minLevel = inputs.minLevel;
  return (
    typeof minLevel === 'string' &&
    minLevel in LEVEL_RANK &&
    LEVEL_RANK[record.level] >= LEVEL_RANK[minLevel as AgentLevel] &&
    inputs.levelRankAtLeast === LEVEL_RANK[minLevel as AgentLevel]
  );
}

function verifyCapabilityInputs(record: ZkIdentityRecord, inputs: ZkProof['publicInputs']): boolean {
  const capabilityHash = inputs.capabilityHash;
  return (
    typeof capabilityHash === 'string' &&
    record.capabilities.some((capability) => hashCanonical({ capability }) === capabilityHash)
  );
}

function verifyReputationInputs(record: ZkIdentityRecord, inputs: ZkProof['publicInputs']): boolean {
  const minScore = inputs.minScore;
  return typeof minScore === 'number' && minScore >= 0 && record.reputationScore >= minScore;
}

function hashCanonical(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

function canonicalize(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
