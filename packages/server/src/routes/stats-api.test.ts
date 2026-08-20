import { describe, expect, test } from 'bun:test';
import { buildArticlesReadingCSV, buildDailyViewsCSV } from './stats-api';

describe('stats CSV export', () => {
  test('exports all daily totals with an Excel-compatible BOM', () => {
    const csv = buildDailyViewsCSV([
      { date: '2026-08-18', count: 12 },
      { date: '2026-08-19', count: 34 },
    ]);

    expect(csv).toBe('\ufeff日期,访问量\n2026-08-18,12\n2026-08-19,34');
  });

  test('prevents spreadsheet formulas in date-like cells', () => {
    const csv = buildDailyViewsCSV([{ date: '=1+1', count: 1 }]);
    expect(csv).toContain("'=1+1,1");
  });

  test('exports reading statistics for every article with safe text cells', () => {
    const csv = buildArticlesReadingCSV([{
      article_id: 7,
      title: '=测试文章,第一篇',
      slug: 'first-article',
      estimated_minutes: 5,
      actual_avg_seconds: 123.456,
      actual_avg_minutes: 2.0576,
      session_count: 9,
      likes_count: 3,
    }]);

    expect(csv).toBe(
      '\ufeff文章ID,文章标题,文章标识,预计阅读分钟,实际平均秒数,实际平均分钟,阅读记录数,点赞数\n' +
      '7,"\'=测试文章,第一篇",first-article,5,123.46,2.06,9,3',
    );
  });
});
