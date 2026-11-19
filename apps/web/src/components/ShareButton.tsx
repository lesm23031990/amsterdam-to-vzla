'use client';

import { useMemo, useState } from 'react';
import { buildSharePayload } from '@/lib/share';
import styles from './ShareButton.module.css';

interface Props {
  title: string;
  price?: string | null;
  /** Por defecto usa window.location.href */
  url?: string;
  /** Variante compacta (solo iconos) para headers de modal */
  compact?: boolean;
  className?: string;
}

function currentUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

export default function ShareButton({ title, price, url, compact = false, className }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const payload = useMemo(
    () => buildSharePayload({ title, price, url: url || currentUrl() }),
    [title, price, url],
  );

  const handleNativeShare = async () => {
    setError('');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        return;
      } catch {
        return; // el usuario cancelo
      }
    }
    window.open(payload.whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    window.open(payload.whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar el link');
    }
  };

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''} ${className || ''}`}>
      <button type="button" className={styles.primary} onClick={handleNativeShare} title="Compartir">
        <span aria-hidden="true">📤</span>
        {!compact && <span>Compartir</span>}
      </button>
      <button type="button" className={styles.whatsapp} onClick={handleWhatsApp} title="Compartir por WhatsApp">
        <span aria-hidden="true">🟢</span>
        {!compact && <span>WhatsApp</span>}
      </button>
      <button type="button" className={styles.copy} onClick={handleCopy} title="Copiar link">
        <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
        {!compact && <span>{copied ? 'Link copiado' : 'Copiar link'}</span>}
      </button>
      {error && <span className={styles.error} role="alert">{error}</span>}
    </div>
  );
}
