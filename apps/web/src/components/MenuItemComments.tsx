'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import CommentImagePicker from './CommentImagePicker';
import styles from './MenuItemComments.module.css';

interface MenuReply {
  id: string;
  user: { name: string; initials: string };
  content: string;
  createdAt: string;
}

interface MenuComment {
  id: string;
  user: { name: string; initials: string };
  content: string;
  images: string[];
  createdAt: string;
  replies: MenuReply[];
}

interface CommentsResponse {
  totalComments: number;
  comments: MenuComment[];
}

interface Props {
  menuItemId: string;
}

export default function MenuItemComments({ menuItemId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<MenuComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async (withImages: boolean) => {
    const res = await api.get<CommentsResponse>(
      `/fastfood/menu/${menuItemId}/comments${withImages ? '?hasImages=true' : ''}`,
    );
    if (res.ok && res.data) {
      setComments(res.data.comments);
      setTotal(res.data.totalComments);
    }
    setLoading(false);
  }, [menuItemId]);

  useEffect(() => {
    let cancelled = false;
    api.get<CommentsResponse>(
      `/fastfood/menu/${menuItemId}/comments${onlyWithImages ? '?hasImages=true' : ''}`,
    ).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setComments(res.data.comments);
        setTotal(res.data.totalComments);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [menuItemId, onlyWithImages]);

  const reload = () => load(onlyWithImages);

  const toggleOnlyWithImages = () => {
    setLoading(true);
    setOnlyWithImages((v) => !v);
  };

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    setError('');
    const res = await api.post(`/fastfood/menu/${menuItemId}/comments`, {
      content: content.trim(),
      images: images.length > 0 ? images : undefined,
    });
    if (res.ok) {
      setContent('');
      setImages([]);
      await reload();
    } else {
      setError(res.error || 'No se pudo publicar el comentario');
    }
    setSending(false);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>Comentarios ({total})</h3>
        <button
          type="button"
          className={`${styles.filter} ${onlyWithImages ? styles.filterActive : ''}`}
          onClick={toggleOnlyWithImages}
          aria-pressed={onlyWithImages}
        >
          📷 Con fotos
        </button>
      </div>

      {user ? (
        <div className={styles.form}>
          <textarea
            className={styles.input}
            placeholder="Comparte tu opinion sobre este plato..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={2}
          />
          <CommentImagePicker value={images} onChange={setImages} />
          <div className={styles.formActions}>
            <span className={styles.count}>{content.length}/500</span>
            <button type="button" className={styles.submit} onClick={handleSubmit} disabled={!content.trim() || sending}>
              {sending ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      ) : (
        <p className={styles.loginHint}>Inicia sesion para comentar.</p>
      )}

      {loading ? (
        <div className={styles.list} aria-busy="true" aria-label="Cargando comentarios">
          {[0, 1].map((i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>
          {onlyWithImages ? 'Aun no hay comentarios con fotos.' : 'Aun no hay comentarios. ¡Se el primero!'}
        </p>
      ) : (
        <div className={styles.list}>
          {comments.map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.avatar}>{c.user.initials}</span>
                <span className={styles.name}>{c.user.name}</span>
                <span className={styles.date}>{new Date(c.createdAt).toLocaleDateString('es-VE')}</span>
              </div>
              <p className={styles.text}>{c.content}</p>
              {c.images.length > 0 && (
                <div className={styles.images}>
                  {c.images.map((img, i) => (
                    <button
                      key={img}
                      type="button"
                      className={styles.imageBtn}
                      onClick={() => setPreview(resolveMediaUrl(img))}
                      aria-label={`Ampliar foto ${i + 1} de ${c.user.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveMediaUrl(img) ?? img} alt={`Foto ${i + 1} de ${c.user.name}`} loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              {c.replies.length > 0 && (
                <div className={styles.replies}>
                  {c.replies.map((r) => (
                    <div key={r.id} className={styles.reply}>
                      <span className={styles.replyName}>{r.user.name}</span>
                      <span className={styles.replyText}>{r.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className={styles.lightbox} onClick={() => setPreview(null)} role="dialog" aria-modal="true" aria-label="Foto del comentario">
          <button type="button" className={styles.lightboxClose} onClick={() => setPreview(null)} aria-label="Cerrar">✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto del comentario" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
