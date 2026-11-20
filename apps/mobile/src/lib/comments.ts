export type CommentFilter = 'all' | 'question' | 'comment' | 'withImages' | 'withRating';

export const COMMENT_FILTERS: CommentFilter[] = ['all', 'question', 'comment', 'withImages', 'withRating'];

export const COMMENT_FILTER_LABELS: Record<CommentFilter, string> = {
  all: 'Todos',
  question: 'Preguntas',
  comment: 'Comentarios',
  withImages: 'Con fotos',
  withRating: 'Con rating',
};

/**
 * Construye el endpoint de comentarios con el filtro activo.
 * `basePath` debe incluir el prefijo completo (ej. `/api/v1/products/:id/comments`).
 */
export function commentsEndpoint(basePath: string, filter: CommentFilter): string {
  const path = basePath.replace(/\/+$/, '');
  if (filter === 'all') return path;
  if (filter === 'withImages') return `${path}?hasImages=true`;
  if (filter === 'withRating') return `${path}?hasRating=true`;
  return `${path}?type=${filter}`;
}
