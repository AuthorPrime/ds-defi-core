import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19,
  nip57,
  SimplePool,
  verifyEvent,
  type Event,
  type EventTemplate,
  type Filter,
  type VerifiedEvent,
} from 'nostr-tools';
import { createHash } from 'node:crypto';

export interface NostrKeypair {
  privateKey: string;
  publicKey: string;
  nsec: string;
  npub: string;
}

export interface SubCloser {
  close(reason?: string): void;
}

export interface RelayPublisher {
  publish(relays: string[], event: Event): Promise<string>[];
  subscribe(relays: string[], filter: Filter, params: { onevent: (event: Event) => void }): SubCloser;
  destroy?(): void;
}

export interface PublishResult {
  event: VerifiedEvent;
  relays: string[];
  acknowledgements: string[];
}

export interface ZapResult extends PublishResult {
  zapRequest: VerifiedEvent;
  amountSats: number;
}

export interface AttestationInput {
  type?: string;
  subject?: string;
  data: object;
}

export interface NostrOptions {
  privateKey?: string | Uint8Array;
  relays?: string[];
  publisher?: RelayPublisher;
}

const DEFAULT_RELAY = 'wss://relay.damus.io';
const KIND_ZAP_REQUEST = 9734;
const KIND_ZAP_RECEIPT = 9735;
const KIND_BADGE_DEFINITION = 30009;
const KIND_BADGE_AWARD = 8;
const KIND_APP_DATA = 30078;

export type NostrEvent = Event;

export function generateKeypair(): NostrKeypair {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);

  return {
    privateKey: bytesToHex(secretKey),
    publicKey,
    nsec: nip19.nsecEncode(secretKey),
    npub: nip19.npubEncode(publicKey),
  };
}

export function signEvent(event: EventTemplate, privateKey: string | Uint8Array = loadPrivateKey()): VerifiedEvent {
  return finalizeEvent(event, normalizePrivateKey(privateKey));
}

export async function publishEvent(event: Event, options: NostrOptions = {}): Promise<PublishResult> {
  if (!verifyEvent(event)) {
    throw new Error('Cannot publish an unsigned or invalid Nostr event.');
  }

  const relays = resolveRelays(options.relays);
  const { publisher, ownsPublisher } = resolvePublisher(options.publisher);

  try {
    const acknowledgements = await Promise.all(publisher.publish(relays, event));
    return { event, relays, acknowledgements };
  } finally {
    if (ownsPublisher) {
      publisher.destroy?.();
    }
  }
}

export async function sendZap(
  recipientPubkey: string,
  amount: number,
  message = '',
  options: NostrOptions = {}
): Promise<ZapResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Zap amount must be a positive integer number of sats.');
  }
  assertHexPubkey(recipientPubkey);

  const relays = resolveRelays(options.relays);
  const unsignedZap = nip57.makeZapRequest({
    pubkey: recipientPubkey,
    amount: amount * 1000,
    comment: message,
    relays,
  });
  const zapRequest = signEvent(unsignedZap, options.privateKey ?? loadPrivateKey());
  const result = await publishEvent(zapRequest, { ...options, relays });

  return {
    ...result,
    zapRequest,
    amountSats: amount,
  };
}

export function subscribeToZaps(
  pubkey: string,
  onZap: (event: Event) => void,
  options: NostrOptions = {}
): SubCloser {
  assertHexPubkey(pubkey);
  const relays = resolveRelays(options.relays);
  const { publisher, ownsPublisher } = resolvePublisher(options.publisher);

  const subscription = publisher.subscribe(
    relays,
    {
      kinds: [KIND_ZAP_RECEIPT],
      '#p': [pubkey],
    },
    { onevent: onZap }
  );

  return {
    close(reason?: string): void {
      subscription.close(reason);
      if (ownsPublisher) {
        publisher.destroy?.();
      }
    },
  };
}

export function createAttestation(data: object, options: NostrOptions = {}): VerifiedEvent {
  const attestation = normalizeAttestation(data);
  const privateKey = options.privateKey ?? loadPrivateKey();
  const publicKey = getPublicKey(normalizePrivateKey(privateKey));
  const digest = stableHash(attestation.data);
  const content = canonicalize(attestation.data);

  return signEvent(
    {
      kind: KIND_APP_DATA,
      created_at: now(),
      content,
      tags: [
        ['d', `ds-attestation:${digest}`],
        ['t', 'attestation'],
        ['type', attestation.type],
        ['subject', attestation.subject],
        ['hash', digest],
        ['p', publicKey],
      ],
    },
    privateKey
  );
}

export function createAgentCredentialBadge(
  credentialId: string,
  name: string,
  description: string,
  options: NostrOptions = {}
): VerifiedEvent {
  const d = credentialId.trim();
  if (!d || !name.trim()) {
    throw new Error('Badge credential id and name are required.');
  }

  return signEvent(
    {
      kind: KIND_BADGE_DEFINITION,
      created_at: now(),
      content: description,
      tags: [
        ['d', d],
        ['name', name],
        ['description', description],
      ],
    },
    options.privateKey ?? loadPrivateKey()
  );
}

export function awardAgentCredentialBadge(
  badgeAddress: string,
  recipientPubkey: string,
  options: NostrOptions = {}
): VerifiedEvent {
  assertHexPubkey(recipientPubkey);

  return signEvent(
    {
      kind: KIND_BADGE_AWARD,
      created_at: now(),
      content: '',
      tags: [
        ['a', badgeAddress],
        ['p', recipientPubkey],
      ],
    },
    options.privateKey ?? loadPrivateKey()
  );
}

export function parseRelayList(value = process.env.NOSTR_RELAY_LIST ?? process.env.NOSTR_RELAY_URL): string[] {
  if (!value?.trim()) {
    return [DEFAULT_RELAY];
  }

  const relays = value
    .split(',')
    .map((relay) => relay.trim())
    .filter(Boolean);

  if (relays.length === 0) {
    return [DEFAULT_RELAY];
  }

  for (const relay of relays) {
    if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) {
      throw new Error(`Invalid Nostr relay URL: ${relay}`);
    }
  }

  return [...new Set(relays)];
}

export function isSignedEvent(event: Event): boolean {
  return verifyEvent(event);
}

function normalizeAttestation(data: object): Required<AttestationInput> {
  if ('data' in data && typeof (data as AttestationInput).data === 'object') {
    const input = data as AttestationInput;
    return {
      type: input.type ?? 'record',
      subject: input.subject ?? 'agent',
      data: input.data,
    };
  }

  return {
    type: 'record',
    subject: 'agent',
    data,
  };
}

function resolveRelays(relays?: string[]): string[] {
  return relays?.length ? parseRelayList(relays.join(',')) : parseRelayList();
}

function resolvePublisher(publisher?: RelayPublisher): { publisher: RelayPublisher; ownsPublisher: boolean } {
  if (publisher) {
    return { publisher, ownsPublisher: false };
  }

  return { publisher: new SimplePool(), ownsPublisher: true };
}

function loadPrivateKey(): Uint8Array {
  const value = process.env.NOSTR_PRIVATE_KEY;
  if (!value) {
    throw new Error('NOSTR_PRIVATE_KEY is required for signing.');
  }

  return normalizePrivateKey(value);
}

function normalizePrivateKey(privateKey: string | Uint8Array): Uint8Array {
  if (privateKey instanceof Uint8Array) {
    if (privateKey.length !== 32) {
      throw new Error('Nostr private key must be 32 bytes.');
    }

    return privateKey;
  }

  if (privateKey.startsWith('nsec1')) {
    const decoded = nip19.decode(privateKey);
    if (decoded.type !== 'nsec') {
      throw new Error('Expected an nsec private key.');
    }

    return decoded.data;
  }

  if (!/^[a-f0-9]{64}$/i.test(privateKey)) {
    throw new Error('Nostr private key must be 64 hex characters or nsec encoded.');
  }

  return Uint8Array.from(Buffer.from(privateKey, 'hex'));
}

function assertHexPubkey(pubkey: string): void {
  if (!/^[a-f0-9]{64}$/i.test(pubkey)) {
    throw new Error('Nostr public key must be 64 hex characters.');
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function stableHash(value: object): string {
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
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
