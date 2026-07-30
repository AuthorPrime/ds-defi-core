import { describe, expect, it } from 'vitest';
import {
  awardAgentCredentialBadge,
  createAgentCredentialBadge,
  createAttestation,
  generateKeypair,
  isSignedEvent,
  parseRelayList,
  publishEvent,
  sendZap,
  signEvent,
  subscribeToZaps,
  type RelayPublisher,
} from '../../src/wallet/nostr.js';
import type { Event, Filter } from 'nostr-tools';
import type { SubCloser } from '../../src/wallet/nostr.js';

class FakePublisher implements RelayPublisher {
  public published: Array<{ relays: string[]; event: Event }> = [];
  public subscriptions: Array<{ relays: string[]; filter: Filter }> = [];
  public destroyCount = 0;

  publish(relays: string[], event: Event): Promise<string>[] {
    this.published.push({ relays, event });
    return relays.map((relay) => Promise.resolve(`${relay}:ok`));
  }

  subscribe(relays: string[], filter: Filter, params: { onevent: (event: Event) => void }): SubCloser {
    this.subscriptions.push({ relays, filter });
    return {
      close: () => undefined,
    };
  }

  destroy(): void {
    this.destroyCount += 1;
  }
}

describe('nostr wallet integration', () => {
  it('generates Nostr keypairs and signs verifiable NIP-01 events', () => {
    const keypair = generateKeypair();
    const event = signEvent(
      {
        kind: 1,
        content: 'hello sovereign agents',
        tags: [],
        created_at: 1_772_000_000,
      },
      keypair.privateKey
    );

    expect(keypair.privateKey).toMatch(/^[a-f0-9]{64}$/);
    expect(keypair.publicKey).toMatch(/^[a-f0-9]{64}$/);
    expect(keypair.nsec).toMatch(/^nsec1/);
    expect(keypair.npub).toMatch(/^npub1/);
    expect(event.pubkey).toBe(keypair.publicKey);
    expect(isSignedEvent(event)).toBe(true);
  });

  it('publishes signed events to configured relays', async () => {
    const keypair = generateKeypair();
    const publisher = new FakePublisher();
    const event = createAttestation({ action: 'claim-task', taskId: 'task-1' }, { privateKey: keypair.privateKey });
    const result = await publishEvent(event, {
      relays: ['wss://relay.one', 'wss://relay.two'],
      publisher,
    });

    expect(result.acknowledgements).toEqual(['wss://relay.one:ok', 'wss://relay.two:ok']);
    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0].event.id).toBe(event.id);
  });

  it('creates and publishes NIP-57 zap requests without hitting live relays in tests', async () => {
    const sender = generateKeypair();
    const recipient = generateKeypair();
    const publisher = new FakePublisher();
    const result = await sendZap(recipient.publicKey, 21, 'paid for useful work', {
      privateKey: sender.privateKey,
      relays: ['wss://relay.example'],
      publisher,
    });

    expect(result.amountSats).toBe(21);
    expect(result.zapRequest.kind).toBe(9734);
    expect(result.zapRequest.pubkey).toBe(sender.publicKey);
    expect(result.zapRequest.tags).toContainEqual(['p', recipient.publicKey]);
    expect(result.zapRequest.tags).toContainEqual(['amount', '21000']);
    expect(publisher.published[0].event.id).toBe(result.zapRequest.id);
  });

  it('subscribes to incoming zap receipts for a pubkey', () => {
    const recipient = generateKeypair();
    const publisher = new FakePublisher();
    const sub = subscribeToZaps(recipient.publicKey, () => undefined, {
      relays: ['wss://relay.example'],
      publisher,
    });

    expect(publisher.subscriptions).toHaveLength(1);
    expect(publisher.subscriptions[0].filter).toMatchObject({
      kinds: [9735],
      '#p': [recipient.publicKey],
    });
    expect(() => sub.close()).not.toThrow();
  });

  it('creates immutable attestations and NIP-58 badge events', () => {
    const issuer = generateKeypair();
    const recipient = generateKeypair();
    const attestation = createAttestation(
      { type: 'task-proof', subject: 'task-42', data: { completed: true, score: 98 } },
      { privateKey: issuer.privateKey }
    );
    const badge = createAgentCredentialBadge('agent-reviewer', 'Agent Reviewer', 'Can review agent work', {
      privateKey: issuer.privateKey,
    });
    const award = awardAgentCredentialBadge(
      `30009:${issuer.publicKey}:agent-reviewer`,
      recipient.publicKey,
      { privateKey: issuer.privateKey }
    );

    expect(attestation.kind).toBe(30078);
    expect(attestation.tags.some((tag) => tag[0] === 'hash')).toBe(true);
    expect(attestation.content).toBe('{"completed":true,"score":98}');
    expect(badge.kind).toBe(30009);
    expect(award.kind).toBe(8);
    expect(award.tags).toContainEqual(['p', recipient.publicKey]);
  });

  it('canonicalizes undefined attestation values without runtime errors', () => {
    const issuer = generateKeypair();
    const attestation = createAttestation(
      { type: 'task-proof', subject: 'task-43', data: { completed: true, optional: undefined } },
      { privateKey: issuer.privateKey }
    );

    expect(attestation.content).toBe('{"completed":true,"optional":null}');
    expect(isSignedEvent(attestation)).toBe(true);
  });

  it('closes internally owned subscriptions without affecting injected publishers', () => {
    const recipient = generateKeypair();
    const publisher = new FakePublisher();
    const sub = subscribeToZaps(recipient.publicKey, () => undefined, {
      relays: ['wss://relay.example'],
      publisher,
    });

    sub.close();

    expect(publisher.destroyCount).toBe(0);
  });

  it('parses relay environment values defensively', () => {
    expect(parseRelayList('wss://relay.one,wss://relay.one,wss://relay.two')).toEqual([
      'wss://relay.one',
      'wss://relay.two',
    ]);
    expect(() => parseRelayList('https://not-a-relay')).toThrow('Invalid Nostr relay URL');
  });
});
