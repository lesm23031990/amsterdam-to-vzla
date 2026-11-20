export type CommentFilter = 'all' | 'question' | 'comment' | 'withImages' | 'withRating';

export const COMMENT_FILTERS: CommentFilter[] = ['all', 'question', 'comment', 'withImages', 'withRating'];

export const COMMENT_FILTER_LABELS: Record<CommentFilter, string> = {
  all: 'Todos',
  question: 'Preguntas',
  comment: 'Comentarios',
  withImages: 'Con fotos',
  withRating: 'Con rating',
};

/** Query string del listado de comentarios segun el filtro activo. */
export function commentsEndpoint(productId: string, filter: CommentFilter, perPage = 10): string {
  const params = new URLSearchParams({ perPage: String(perPage) });
  if (filter === 'question' || filter === 'comment') params.set('type', filter);
  if (filter === 'withImages') params.set('hasImages', 'true');
  if (filter === 'withRating') params.set('hasRating', 'true');
  return `/products/${productId}/comments?${params.toString()}`;
}
