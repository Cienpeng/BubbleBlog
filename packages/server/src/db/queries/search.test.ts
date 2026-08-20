import { describe, expect, test } from 'bun:test';
import { escapeLikePattern, formatSearchHeadline, splitSearchTerms } from './search';

describe('mixed-language search helpers', () => {
  test('keeps an unspaced Chinese phrase as one literal term', () => {
    expect(splitSearchTerms('  图片缓存策略  ')).toEqual(['图片缓存策略']);
  });

  test('splits mixed-language input and removes case-insensitive duplicates', () => {
    expect(splitSearchTerms('PostgreSQL 中文 postgresql 缓存')).toEqual([
      'PostgreSQL',
      '中文',
      '缓存',
    ]);
  });

  test('escapes LIKE wildcard and escape characters', () => {
    expect(escapeLikePattern('100%_done\\')).toBe('100\\%\\_done\\\\');
  });

  test('highlights Chinese terms while escaping article HTML', () => {
    const headline = formatSearchHeadline('<script>图片缓存</script>', ['图片', '缓存']);
    expect(headline).toBe(
      '&lt;script&gt;<mark>图片</mark><mark>缓存</mark>&lt;/script&gt;',
    );
  });

  test('preserves existing full-text markers without nesting them', () => {
    const headline = formatSearchHeadline(
      '__BUBBLE_MARK_START__running__BUBBLE_MARK_END__ 中文',
      ['run', '中文'],
    );
    expect(headline).toBe('<mark>running</mark> <mark>中文</mark>');
  });
});
