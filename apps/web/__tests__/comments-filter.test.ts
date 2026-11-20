import { describe, it, expect } from 'vitest';
import { COMMENT_FILTERS, commentsEndpoint } from '../src/lib/comments';

describe('commentsEndpoint', () => {
  it('lists all comments by default', () => {
    expect(commentsEndpoint('p1', 'all')).toBe('/products/p1/comments?perPage=10');
  });

  it('filters by type', () => {
    expect(commentsEndpoint('p1', 'question')).toBe('/products/p1/comments?perPage=10&type=question');
    expect(commentsEndpoint('p1', 'comment', 5)).toBe('/products/p1/comments?perPage=5&type=comment');
  });

  it('filters comments with images and with rating', () => {
    expect(commentsEndpoint('p1', 'withImages')).toBe('/products/p1/comments?perPage=10&hasImages=true');
    expect(commentsEndpoint('p1', 'withRating')).toBe('/products/p1/comments?perPage=10&hasRating=true');
  });

  it('exposes the 5 UI filters in order', () => {
    expect(COMMENT_FILTERS).toEqual(['all', 'question', 'comment', 'withImages', 'withRating']);
  });
});
