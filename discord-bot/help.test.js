const { describe, it, expect } = require('vitest');
// Pure parser from the help bot. help.js has no top-level discord/supabase
// requires (they're lazy), so importing it here is dependency-free.
const { parseStructured } = require('./help');

describe('parseStructured', () => {
  it('parses a "covered" reply and leaves the article draft empty', () => {
    const raw = [
      'COVERAGE: covered',
      '===ANSWER===',
      'Reserved items cost 1 allocation point and must sit alone at their rank.',
      '===ARTICLE_TITLE===',
      '',
      '===ARTICLE_DESCRIPTION===',
      '',
      '===ARTICLE_CONTENT===',
      '',
    ].join('\n');

    const out = parseStructured(raw);
    expect(out.coverage).toBe('covered');
    expect(out.answer).toBe('Reserved items cost 1 allocation point and must sit alone at their rank.');
    expect(out.title).toBe('');
    expect(out.content).toBe('');
  });

  it('parses a "novel" reply and extracts the multi-line article draft', () => {
    const raw = [
      'COVERAGE: novel',
      '===ANSWER===',
      'Yes — transfer ownership from Guild Settings, then you can leave.',
      '===ARTICLE_TITLE===',
      'Leaving a guild as Guild Master',
      '===ARTICLE_DESCRIPTION===',
      'How a Guild Master hands off before leaving',
      '===ARTICLE_CONTENT===',
      '# Leaving a guild',
      '',
      'Transfer ownership first, then leave.',
    ].join('\n');

    const out = parseStructured(raw);
    expect(out.coverage).toBe('novel');
    expect(out.answer).toBe('Yes — transfer ownership from Guild Settings, then you can leave.');
    expect(out.title).toBe('Leaving a guild as Guild Master');
    expect(out.description).toBe('How a Guild Master hands off before leaving');
    expect(out.content).toBe('# Leaving a guild\n\nTransfer ownership first, then leave.');
  });

  it('surfaces NO_ANSWER so the caller can fall back to a human', () => {
    const raw = ['COVERAGE: none', '===ANSWER===', 'NO_ANSWER'].join('\n');
    const out = parseStructured(raw);
    expect(out.coverage).toBe('none');
    expect(out.answer).toBe('NO_ANSWER');
  });

  it('defaults coverage to "none" when the marker is missing', () => {
    const out = parseStructured('just some text with no markers');
    expect(out.coverage).toBe('none');
  });
});
