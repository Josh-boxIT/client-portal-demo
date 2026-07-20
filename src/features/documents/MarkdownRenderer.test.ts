import { describe, it, expect } from 'vitest';
import { isSafeImageSrc, parseInline } from './MarkdownRenderer';

describe('isSafeImageSrc', () => {
  it('allows same-origin API-proxied image URLs', () => {
    expect(isSafeImageSrc('/api/tickets/1/images/2')).toBe(true);
  });

  it('allows same-origin API-proxied inline-image URLs', () => {
    expect(isSafeImageSrc('/api/tickets/1/inline-images/x')).toBe(true);
  });

  it('allows inline raster data:image/png URIs', () => {
    expect(isSafeImageSrc('data:image/png;base64,AAAA')).toBe(true);
  });

  it('rejects data:image/svg+xml URIs (can embed executable script)', () => {
    expect(isSafeImageSrc('data:image/svg+xml;base64,AAAA')).toBe(false);
  });

  it('rejects external URLs', () => {
    expect(isSafeImageSrc('https://evil.example/x.png')).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
  });
});

describe('parseInline image handling', () => {
  it('parses alt text containing escaped brackets, e.g. real ConnectWise-style refs', () => {
    const segments = parseInline('![\\[image\\]](/api/tickets/1/images/2)');
    const image = segments.find((s) => s.type === 'image');
    expect(image).toBeDefined();
    expect(image).toMatchObject({
      type: 'image',
      content: '/api/tickets/1/images/2',
      alt: '[image]',
    });
  });

  it('produces an image segment (fallback-rendered as alt) for a non-allowlisted src', () => {
    const segments = parseInline('![\\[image\\]](https://evil.example/x.png)');
    const image = segments.find((s) => s.type === 'image');
    expect(image).toBeDefined();
    expect(image).toMatchObject({
      type: 'image',
      content: 'https://evil.example/x.png',
      alt: '[image]',
    });
    // The renderer only emits an <img> when isSafeImageSrc(content) is true;
    // for this src it must fall back to rendering the alt text.
    expect(isSafeImageSrc((image as { content: string }).content)).toBe(false);
  });
});
