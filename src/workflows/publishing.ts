import { randomUUID } from 'node:crypto';

export type PublishingTaskType =
  | 'DRAFT_CHAPTER'
  | 'EDIT_CONTENT'
  | 'PROOFREAD'
  | 'FORMAT_LAYOUT'
  | 'METADATA_ENTRY';

export type ExportFormat = 'md' | 'docx' | 'epub';

export interface PublishingTaskParams {
  title?: string;
  topic?: string;
  audience?: string;
  tone?: string;
  minWords?: number;
  maxWords?: number;
  requiredKeywords?: string[];
  format?: ExportFormat;
  metadata?: Record<string, string>;
}

export interface PublishingTask {
  id: string;
  type: PublishingTaskType;
  params: PublishingTaskParams;
  instructions: string;
  acceptanceCriteria: string[];
  createdAt: string;
}

export interface QualityScore {
  score: number;
  wordCount: number;
  readability: number;
  issues: string[];
  metrics: {
    averageWordsPerSentence: number;
    longSentenceCount: number;
    repeatedWhitespaceCount: number;
    requiredKeywordCoverage: number;
  };
}

export interface SubmissionValidation {
  taskId: string;
  valid: boolean;
  quality: QualityScore;
  errors: string[];
  warnings: string[];
}

export interface ExportedDocument {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string;
}

const publishingTasks = new Map<string, PublishingTask>();
const WORD_PATTERN = /[\p{L}\p{N}'-]+/gu;
const SENTENCE_PATTERN = /[^.!?\n]+[.!?]+|[^.!?\n]+$/g;

const TASK_CONFIG: Record<
  PublishingTaskType,
  { instructions: string; acceptanceCriteria: string[]; defaultMinWords: number }
> = {
  DRAFT_CHAPTER: {
    instructions: 'Draft original long-form content from the supplied topic or outline.',
    acceptanceCriteria: [
      'Includes a clear title or section heading',
      'Develops the topic with coherent paragraphs',
      'Meets the configured word-count target',
    ],
    defaultMinWords: 500,
  },
  EDIT_CONTENT: {
    instructions: 'Improve clarity, structure, and flow while preserving the author intent.',
    acceptanceCriteria: [
      'Removes obvious grammar and style problems',
      'Improves paragraph structure',
      'Preserves the source meaning',
    ],
    defaultMinWords: 200,
  },
  PROOFREAD: {
    instructions: 'Perform a final typo, punctuation, grammar, and consistency pass.',
    acceptanceCriteria: [
      'No obvious spelling placeholders or repeated whitespace',
      'Consistent capitalization and punctuation',
      'Ready for publication handoff',
    ],
    defaultMinWords: 100,
  },
  FORMAT_LAYOUT: {
    instructions: 'Prepare content for publication in the requested output format.',
    acceptanceCriteria: [
      'Uses consistent headings',
      'Preserves lists and paragraph breaks',
      'Can be exported to markdown and DOCX-compatible content',
    ],
    defaultMinWords: 100,
  },
  METADATA_ENTRY: {
    instructions: 'Create publication metadata such as subtitle, description, ISBN, and keywords.',
    acceptanceCriteria: [
      'Contains a concise description',
      'Includes relevant keywords',
      'Provides all requested metadata fields',
    ],
    defaultMinWords: 50,
  },
};

export function createPublishingTask(
  type: PublishingTaskType,
  params: PublishingTaskParams = {}
): PublishingTask {
  const config = TASK_CONFIG[type];
  if (!config) {
    throw new Error(`Unsupported publishing task type: ${type}`);
  }

  const task: PublishingTask = {
    id: randomUUID(),
    type,
    params: {
      minWords: config.defaultMinWords,
      requiredKeywords: [],
      ...params,
    },
    instructions: config.instructions,
    acceptanceCriteria: config.acceptanceCriteria,
    createdAt: new Date().toISOString(),
  };

  publishingTasks.set(task.id, task);
  return task;
}

export function validateSubmission(taskId: string, content: string): SubmissionValidation {
  const task = publishingTasks.get(taskId);
  if (!task) {
    throw new Error(`Publishing task not found: ${taskId}`);
  }

  const quality = calculateQualityScore(content, task.params.requiredKeywords);
  const minWords = task.params.minWords ?? TASK_CONFIG[task.type].defaultMinWords;
  const maxWords = task.params.maxWords;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.trim()) {
    errors.push('Submission content is empty.');
  }

  if (quality.wordCount < minWords) {
    errors.push(`Submission is below the minimum word count of ${minWords}.`);
  }

  if (maxWords && quality.wordCount > maxWords) {
    warnings.push(`Submission exceeds the suggested maximum word count of ${maxWords}.`);
  }

  if (quality.metrics.requiredKeywordCoverage < 1) {
    errors.push('Submission is missing one or more required keywords.');
  }

  if (quality.score < 60) {
    warnings.push('Submission quality score is below the recommended threshold of 60.');
  }

  return {
    taskId,
    valid: errors.length === 0,
    quality,
    errors,
    warnings,
  };
}

export function calculateQualityScore(content: string, requiredKeywords: string[] = []): QualityScore {
  const normalized = content.trim();
  const words = getWords(normalized);
  const sentences = getSentences(normalized);

  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const averageWordsPerSentence = wordCount / sentenceCount;
  const longSentenceCount = sentences.filter((sentence) => {
    const sentenceWords = getWords(sentence);
    return sentenceWords.length > 30;
  }).length;
  const repeatedWhitespaceCount = (content.match(/[ \t]{2,}/g) ?? []).length;
  const requiredKeywordCoverage = calculateKeywordCoverage(normalized, requiredKeywords);
  const readability = calculateFleschKincaidEase(words, sentenceCount);
  const issues: string[] = [];

  if (wordCount === 0) issues.push('No words found.');
  if (averageWordsPerSentence > 28) issues.push('Average sentence length is high.');
  if (longSentenceCount > 0) issues.push('Contains long sentences that may reduce readability.');
  if (repeatedWhitespaceCount > 0) issues.push('Contains repeated whitespace.');
  if (requiredKeywordCoverage < 1) issues.push('Missing required keyword coverage.');

  const readabilityScore = clamp(readability, 0, 100);
  const sentencePenalty = Math.min(longSentenceCount * 5, 20);
  const whitespacePenalty = Math.min(repeatedWhitespaceCount * 3, 12);
  const keywordPenalty = Math.round((1 - requiredKeywordCoverage) * 20);
  const lengthPenalty = wordCount === 0 ? 40 : 0;
  const score = clamp(
    Math.round(readabilityScore - sentencePenalty - whitespacePenalty - keywordPenalty - lengthPenalty),
    0,
    100
  );

  return {
    score,
    wordCount,
    readability: Math.round(readabilityScore),
    issues,
    metrics: {
      averageWordsPerSentence: Number(averageWordsPerSentence.toFixed(2)),
      longSentenceCount,
      repeatedWhitespaceCount,
      requiredKeywordCoverage,
    },
  };
}

export function generateOutline(topic: string): string[] {
  const cleanTopic = topic.trim();
  if (!cleanTopic) {
    throw new Error('Topic is required to generate an outline.');
  }

  return [
    `Introduction: why ${cleanTopic} matters`,
    `Context and audience expectations for ${cleanTopic}`,
    'Key argument, process, or story arc',
    'Practical examples and supporting evidence',
    'Risks, tradeoffs, and open questions',
    'Conclusion and next steps',
  ];
}

export function exportToFormat(
  content: string,
  format: ExportFormat,
  filename = 'publishing-output'
): ExportedDocument {
  const baseName = filename.replace(/\.[a-z0-9]+$/i, '');

  if (format === 'md') {
    return {
      format,
      filename: `${baseName}.md`,
      mimeType: 'text/markdown',
      content,
    };
  }

  if (format === 'docx') {
    return {
      format,
      filename: `${baseName}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: toWordCompatibleHtml(content),
    };
  }

  if (format === 'epub') {
    return {
      format,
      filename: `${baseName}.epub`,
      mimeType: 'application/epub+zip',
      content: toEpubXhtml(content),
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
}

function calculateKeywordCoverage(content: string, requiredKeywords: string[]): number {
  if (requiredKeywords.length === 0) return 1;

  const lowerContent = content.toLowerCase();
  const matched = requiredKeywords.filter((keyword) => keywordMatches(lowerContent, keyword));

  return matched.length / requiredKeywords.length;
}

function calculateFleschKincaidEase(words: string[], sentenceCount: number): number {
  if (words.length === 0) return 0;

  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  return 206.835 - 1.015 * (words.length / sentenceCount) - 84.6 * (syllables / words.length);
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 1;

  const groups = cleaned.match(/[aeiouy]+/g);
  let count = groups?.length ?? 1;

  if (cleaned.endsWith('e') && count > 1) {
    count -= 1;
  }

  return Math.max(count, 1);
}

function toWordCompatibleHtml(content: string): string {
  const body = renderMarkdownBlocks(content);

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Publishing Export</title></head>
<body>
${body}
</body>
</html>`;
}

function toEpubXhtml(content: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Publishing Export</title></head>
<body>
${renderMarkdownBlocks(content)}
</body>
</html>`;
}

function renderMarkdownBlocks(content: string): string {
  const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks
    .map((block) => {
      const heading = block.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }

      const lines = block.split('\n');
      if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
        const items = lines
          .map((line) => `<li>${escapeHtml(line.replace(/^\s*[-*]\s+/, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }

      return `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
}

function getWords(value: string): string[] {
  return value.match(WORD_PATTERN) ?? [];
}

function getSentences(value: string): string[] {
  return value.match(SENTENCE_PATTERN)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function keywordMatches(lowerContent: string, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'u').test(lowerContent);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
