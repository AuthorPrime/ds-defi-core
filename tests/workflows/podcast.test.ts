import { describe, expect, it } from 'vitest';
import {
  createPodcastTask,
  createTranscript,
  estimateDuration,
  generateRSSEntry,
  validateScript,
} from '../../src/workflows/podcast.js';

describe('podcast workflow', () => {
  it('creates podcast tasks for supported task types', () => {
    const task = createPodcastTask('WRITE_SCRIPT', {
      title: 'Agent economy update',
      targetDurationMinutes: 10,
    });

    expect(task.id).toBeTruthy();
    expect(task.type).toBe('WRITE_SCRIPT');
    expect(task.params.requiredSegments).toEqual(['intro', 'body', 'outro']);
    expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it('validates script completeness and speaker cues', () => {
    const body = Array.from({ length: 90 }, (_, index) => `word${index}`).join(' ');
    const script = `Intro\nHost: Welcome to the episode.\n${body}\nOutro\nHost: Subscribe for more.`;

    const validation = validateScript(script);
    const invalid = validateScript('A short note without structure.');

    expect(validation.valid).toBe(true);
    expect(validation.segments.hasHostCue).toBe(true);
    expect(validation.wordCount).toBeGreaterThan(80);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('Script is missing an intro section or cue.');
  });

  it('estimates duration from script word count', () => {
    const script = Array.from({ length: 300 }, (_, index) => `word${index}`).join(' ');

    expect(estimateDuration(script)).toBe(120);
  });

  it('counts non-English script words when estimating duration', () => {
    const script = Array.from({ length: 150 }, (_, index) => `palabra${index} café`).join(' ');

    expect(estimateDuration(script)).toBe(120);
  });

  it('generates a valid RSS item for an episode', () => {
    const rss = generateRSSEntry({
      title: 'Sovereign Agents',
      description: 'A short episode about agent economies.',
      duration: 3723,
      audioUrl: 'https://example.com/episode.mp3',
      transcript: 'Transcript URL pending',
      shownotes: '<p>Shownotes and links</p>',
      publishedAt: new Date('2026-05-10T12:00:00Z'),
    });

    expect(rss).toContain('<item>');
    expect(rss).toContain('<title>Sovereign Agents</title>');
    expect(rss).toContain('<itunes:duration>01:02:03</itunes:duration>');
    expect(rss).toContain('https://example.com/episode.mp3');
  });

  it('escapes RSS XML and CDATA boundaries', () => {
    const rss = generateRSSEntry({
      title: 'Agents & Markets',
      description: 'Use <safe> XML',
      duration: 60,
      audioUrl: 'https://example.com/episode.mp3?x=1&y=2',
      shownotes: 'CDATA end ]]> stays safe',
      publishedAt: new Date('2026-05-10T12:00:00Z'),
    });

    expect(rss).toContain('<title>Agents &amp; Markets</title>');
    expect(rss).toContain('url="https://example.com/episode.mp3?x=1&amp;y=2"');
    expect(rss).toContain('CDATA end ]]]]><![CDATA[> stays safe');
  });

  it('creates transcript jobs for valid audio URLs', () => {
    const job = createTranscript('https://example.com/audio.mp3');

    expect(job.status).toBe('PENDING');
    expect(job.provider).toBe('stub');
    expect(() => createTranscript('not-a-url')).toThrow('A valid audio URL is required');
  });
});
