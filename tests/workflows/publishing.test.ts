import { describe, expect, it } from 'vitest';
import {
  calculateQualityScore,
  createPublishingTask,
  exportToFormat,
  generateOutline,
  validateSubmission,
} from '../../src/workflows/publishing.js';

describe('publishing workflow', () => {
  it('creates publishing tasks for supported task types', () => {
    const task = createPublishingTask('DRAFT_CHAPTER', {
      topic: 'sovereign agents',
      minWords: 10,
      requiredKeywords: ['agents'],
    });

    expect(task.id).toBeTruthy();
    expect(task.type).toBe('DRAFT_CHAPTER');
    expect(task.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(task.params.requiredKeywords).toEqual(['agents']);
  });

  it('validates submissions against word count and keyword requirements', () => {
    const task = createPublishingTask('METADATA_ENTRY', {
      minWords: 8,
      requiredKeywords: ['bitcoin', 'agents'],
    });

    const valid = validateSubmission(
      task.id,
      'Bitcoin agents coordinate publishing tasks with clear metadata and useful keywords.'
    );
    const invalid = validateSubmission(task.id, 'Agents only.');

    expect(valid.valid).toBe(true);
    expect(valid.errors).toEqual([]);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('Submission is below the minimum word count of 8.');
    expect(invalid.errors).toContain('Submission is missing one or more required keywords.');
  });

  it('calculates quality metrics and flags obvious writing issues', () => {
    const quality = calculateQualityScore(
      'This sentence is readable.  This second sentence covers bitcoin agents clearly.',
      ['bitcoin', 'agents']
    );

    expect(quality.wordCount).toBeGreaterThan(5);
    expect(quality.metrics.requiredKeywordCoverage).toBe(1);
    expect(quality.metrics.repeatedWhitespaceCount).toBe(1);
    expect(quality.issues).toContain('Contains repeated whitespace.');
  });

  it('matches required keywords on word boundaries', () => {
    const missing = calculateQualityScore('The agentic workflow is clear.', ['agent']);
    const present = calculateQualityScore('The agent workflow is clear.', ['agent']);

    expect(missing.metrics.requiredKeywordCoverage).toBe(0);
    expect(present.metrics.requiredKeywordCoverage).toBe(1);
  });

  it('generates a reusable outline for a publishing topic', () => {
    const outline = generateOutline('agent economies');

    expect(outline).toHaveLength(6);
    expect(outline[0]).toContain('agent economies');
  });

  it('exports markdown, DOCX-compatible HTML, and EPUB-compatible XHTML', () => {
    const markdown = exportToFormat('# Title\n\nBody text', 'md', 'chapter');
    const docx = exportToFormat('Title\n\nBody text', 'docx', 'chapter');
    const epub = exportToFormat('Title\n\nBody text', 'epub', 'chapter');

    expect(markdown.filename).toBe('chapter.md');
    expect(markdown.content).toContain('# Title');
    expect(docx.filename).toBe('chapter.docx');
    expect(docx.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(docx.content).toContain('<html>');
    expect(docx.content).toContain('<p>Title</p>');
    expect(epub.filename).toBe('chapter.epub');
    expect(epub.content).toContain('xmlns="http://www.w3.org/1999/xhtml"');

    const structured = exportToFormat('# Title\n\n- one\n- two', 'docx', 'structured');
    expect(structured.content).toContain('<h1>Title</h1>');
    expect(structured.content).toContain('<ul><li>one</li><li>two</li></ul>');
  });
});
