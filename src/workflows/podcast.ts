import { randomUUID } from 'node:crypto';

export type PodcastTaskType =
  | 'RESEARCH_TOPIC'
  | 'WRITE_SCRIPT'
  | 'RECORD_AUDIO'
  | 'EDIT_AUDIO'
  | 'WRITE_SHOWNOTES'
  | 'PUBLISH_EPISODE';

export interface PodcastTaskParams {
  title?: string;
  topic?: string;
  hostName?: string;
  guestName?: string;
  targetDurationMinutes?: number;
  audience?: string;
  requiredSegments?: string[];
}

export interface PodcastTask {
  id: string;
  type: PodcastTaskType;
  params: PodcastTaskParams;
  instructions: string;
  acceptanceCriteria: string[];
  createdAt: string;
}

export interface Episode {
  title: string;
  description: string;
  duration: number;
  audioUrl: string;
  transcript?: string;
  shownotes: string;
  publishedAt: Date;
}

export interface ScriptValidation {
  valid: boolean;
  estimatedDurationSeconds: number;
  wordCount: number;
  segments: {
    hasIntro: boolean;
    hasOutro: boolean;
    hasHostCue: boolean;
    hasBody: boolean;
  };
  errors: string[];
  warnings: string[];
}

export interface TranscriptJob {
  audioUrl: string;
  status: 'PENDING';
  provider: 'stub';
  requestedAt: string;
  message: string;
}

const DEFAULT_REQUIRED_SEGMENTS = ['intro', 'body', 'outro'];
const MIN_BODY_WORDS = 80;
const SHORT_EPISODE_WARNING_SECONDS = 30;
const WORDS_PER_MINUTE = 150;
const WORD_PATTERN = /[\p{L}\p{N}'-]+/gu;

const TASK_CONFIG: Record<PodcastTaskType, { instructions: string; acceptanceCriteria: string[] }> = {
  RESEARCH_TOPIC: {
    instructions: 'Collect credible source material and key angles for a podcast episode.',
    acceptanceCriteria: [
      'Includes source links or citations',
      'Identifies key questions and audience value',
      'Summarizes the strongest narrative angle',
    ],
  },
  WRITE_SCRIPT: {
    instructions: 'Write a complete episode script or structured outline.',
    acceptanceCriteria: [
      'Includes intro, body, and outro sections',
      'Contains host cues or speaker labels',
      'Matches the requested target duration',
    ],
  },
  RECORD_AUDIO: {
    instructions: 'Record clean spoken audio for the approved script.',
    acceptanceCriteria: [
      'Audio URL is provided',
      'Recording matches the approved script or outline',
      'Noise and clipping are within acceptable limits',
    ],
  },
  EDIT_AUDIO: {
    instructions: 'Edit raw audio into a polished episode.',
    acceptanceCriteria: [
      'Removes long silences and major mistakes',
      'Normalizes volume',
      'Exports a publishable audio asset',
    ],
  },
  WRITE_SHOWNOTES: {
    instructions: 'Write listener-facing episode notes and links.',
    acceptanceCriteria: [
      'Summarizes the episode clearly',
      'Includes relevant links and credits',
      'Contains a concise call to action',
    ],
  },
  PUBLISH_EPISODE: {
    instructions: 'Prepare and publish episode metadata for distribution.',
    acceptanceCriteria: [
      'RSS-compatible metadata is complete',
      'Audio URL is valid',
      'Published timestamp is included',
    ],
  },
};

export function createPodcastTask(
  type: PodcastTaskType,
  params: PodcastTaskParams = {}
): PodcastTask {
  const config = TASK_CONFIG[type];
  if (!config) {
    throw new Error(`Unsupported podcast task type: ${type}`);
  }

  const task: PodcastTask = {
    id: randomUUID(),
    type,
    params: {
      requiredSegments: DEFAULT_REQUIRED_SEGMENTS,
      ...params,
    },
    instructions: config.instructions,
    acceptanceCriteria: config.acceptanceCriteria,
    createdAt: new Date().toISOString(),
  };

  return task;
}

export function validateScript(script: string): ScriptValidation {
  const content = script.trim();
  const words = countWords(content);
  const lower = content.toLowerCase();
  const segments = {
    hasIntro: /\b(intro|introduction|cold open)\b/.test(lower),
    hasOutro: /\b(outro|closing|wrap[- ]?up|subscribe)\b/.test(lower),
    hasHostCue: /\b(host|speaker|guest|narrator)\s*:/i.test(content),
    hasBody: words >= MIN_BODY_WORDS,
  };
  const estimatedDurationSeconds = estimateDuration(content);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content) errors.push('Script is empty.');
  if (!segments.hasIntro) errors.push('Script is missing an intro section or cue.');
  if (!segments.hasOutro) errors.push('Script is missing an outro or closing section.');
  if (!segments.hasHostCue) errors.push('Script needs host, speaker, guest, or narrator cues.');
  if (!segments.hasBody) errors.push('Script body is too short for review.');
  if (estimatedDurationSeconds < SHORT_EPISODE_WARNING_SECONDS) {
    warnings.push('Estimated duration is very short for a podcast episode.');
  }

  return {
    valid: errors.length === 0,
    estimatedDurationSeconds,
    wordCount: words,
    segments,
    errors,
    warnings,
  };
}

export function estimateDuration(script: string): number {
  return Math.round((countWords(script) / WORDS_PER_MINUTE) * 60);
}

export function generateRSSEntry(episode: Episode): string {
  validateEpisode(episode);

  return `<item>
  <title>${escapeXml(episode.title)}</title>
  <description>${escapeXml(episode.description)}</description>
  <pubDate>${episode.publishedAt.toUTCString()}</pubDate>
  <enclosure url="${escapeXml(episode.audioUrl)}" type="audio/mpeg" />
  <guid>${escapeXml(episode.audioUrl)}</guid>
  <itunes:duration>${formatDuration(episode.duration)}</itunes:duration>
  <content:encoded><![CDATA[${escapeCdata(episode.shownotes)}]]></content:encoded>
${episode.transcript ? `  <podcast:transcript>${escapeXml(episode.transcript)}</podcast:transcript>\n` : ''}</item>`;
}

export function createTranscript(audioUrl: string): TranscriptJob {
  if (!isHttpUrl(audioUrl)) {
    throw new Error('A valid audio URL is required to create a transcript job.');
  }

  return {
    audioUrl,
    status: 'PENDING',
    provider: 'stub',
    requestedAt: new Date().toISOString(),
    message: 'Transcript generation is queued for an external speech-to-text integration.',
  };
}

function validateEpisode(episode: Episode): void {
  if (!episode.title.trim()) throw new Error('Episode title is required.');
  if (!episode.description.trim()) throw new Error('Episode description is required.');
  if (!episode.shownotes.trim()) throw new Error('Episode shownotes are required.');
  if (!isHttpUrl(episode.audioUrl)) throw new Error('Episode audioUrl must be an HTTP(S) URL.');
  if (!Number.isFinite(episode.duration) || episode.duration <= 0) {
    throw new Error('Episode duration must be a positive number of seconds.');
  }
  if (!(episode.publishedAt instanceof Date) || Number.isNaN(episode.publishedAt.getTime())) {
    throw new Error('Episode publishedAt must be a valid Date.');
  }
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCdata(value: string): string {
  return value.replaceAll(']]>', ']]]]><![CDATA[>');
}

function countWords(value: string): number {
  return value.match(WORD_PATTERN)?.length ?? 0;
}
