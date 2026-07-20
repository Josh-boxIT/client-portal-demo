import { describe, it, expect } from 'vitest';
import { renderTemplate, collectTokens } from './template';

describe('renderTemplate', () => {
  it('substitutes a simple {{fieldId}} token', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
  });

  it('substitutes tokens with surrounding whitespace', () => {
    expect(renderTemplate('Hello {{ name }}', { name: 'World' })).toBe('Hello World');
    expect(renderTemplate('Hello {{  name  }}', { name: 'World' })).toBe('Hello World');
  });

  it('resolves a missing token to an empty string', () => {
    expect(renderTemplate('Hello {{name}}!', {})).toBe('Hello !');
    expect(renderTemplate('Hello {{name}}!', { other: 'x' })).toBe('Hello !');
  });

  it('preserves non-token text untouched', () => {
    expect(renderTemplate('Just plain text, no tokens here.', {})).toBe('Just plain text, no tokens here.');
  });

  it('substitutes multiple distinct tokens', () => {
    expect(renderTemplate('{{first}} {{last}}', { first: 'Jane', last: 'Doe' })).toBe('Jane Doe');
  });

  it('substitutes a repeated token consistently', () => {
    expect(renderTemplate('{{name}} met {{name}} again', { name: 'Sam' })).toBe('Sam met Sam again');
  });

  it('stringifies non-string values', () => {
    expect(renderTemplate('Count: {{count}}', { count: 42 })).toBe('Count: 42');
    expect(renderTemplate('Active: {{active}}', { active: true })).toBe('Active: true');
    expect(renderTemplate('Value: {{v}}', { v: 0 })).toBe('Value: 0');
  });

  it('handles a null/undefined value the same as missing (empty string)', () => {
    expect(renderTemplate('X{{a}}Y', { a: null })).toBe('XY');
    expect(renderTemplate('X{{a}}Y', { a: undefined })).toBe('XY');
  });

  it('caps a long rendered summary at 100 chars via .slice(0,100), same as the ticket-create call-site', () => {
    const tpl = 'Long request: {{details}}';
    const details = 'x'.repeat(200);
    const rendered = renderTemplate(tpl, { details });
    expect(rendered.length).toBe('Long request: '.length + 200);
    const capped = rendered.slice(0, 100);
    expect(capped.length).toBe(100);
    expect(capped).toBe(rendered.slice(0, 100));
  });
});

describe('collectTokens', () => {
  it('returns distinct field ids in first-seen order', () => {
    expect(collectTokens('{{b}} {{a}} {{b}} {{c}} {{a}}')).toEqual(['b', 'a', 'c']);
  });

  it('returns an empty array when there are no tokens', () => {
    expect(collectTokens('no tokens here')).toEqual([]);
  });

  it('ignores whitespace inside the token braces', () => {
    expect(collectTokens('{{ foo }} {{bar}}')).toEqual(['foo', 'bar']);
  });
});
