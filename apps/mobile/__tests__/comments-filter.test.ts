import { describe, it, expect } from 'vitest';
import { COMMENT_FILTERS, COMMENT_FILTER_LABELS, commentsEndpoint } from '../src/lib/comments';

describe('commentsEndpoint (mobile)', () => {
  const base = '/api/v1/products/abc/comments';

  it('sin filtro devuelve el path limpio', () => {
    expect(commentsEndpoint(base, 'all')).toBe(base);
    expect(commentsEndpoint(`${base}/`, 'all')).toBe(base);
  });

  it('traduce los filtros de tipo', () => {
    expect(commentsEndpoint(base, 'question')).toBe(`${base}?type=question`);
    expect(commentsEndpoint(base, 'comment')).toBe(`${base}?type=comment`);
  });

  it('traduce los filtros de imágenes y rating', () => {
    expect(commentsEndpoint(base, 'withImages')).toBe(`${base}?hasImages=true`);
    expect(commentsEndpoint(base, 'withRating')).toBe(`${base}?hasRating=true`);
  });

  it('expone las etiquetas en español de los 5 filtros', () => {
    expect(COMMENT_FILTERS).toHaveLength(5);
    for (const filter of COMMENT_FILTERS) {
      expect(COMMENT_FILTER_LABELS[filter].length).toBeGreaterThan(0);
    }
  });
});
