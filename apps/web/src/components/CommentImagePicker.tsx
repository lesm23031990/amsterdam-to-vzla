'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  ALLOWED_COMMENT_IMAGE_ACCEPT,
  MAX_COMMENT_IMAGES,
  formatMegabytes,
  MAX_COMMENT_IMAGE_BYTES,
  remainingImageSlots,
  validateImageFile,
} from '@/lib/commentImages';
import styles from './CommentImagePicker.module.css';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  max?: number;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

export default function CommentImagePicker({ value, onChange, disabled = false, max = MAX_COMMENT_IMAGES }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const slots = remainingImageSlots(value.length, max);

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    if (slots === 0) {
      setError(`Maximo ${max} fotos por comentario`);
      return;
    }

    const accepted = files.slice(0, slots);
    if (files.length > slots) {
      setError(`Solo puedes agregar ${slots} foto(s) mas`);
    }

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of accepted) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        const res = await api.post<{ url: string }>('/uploads', { dataUrl });
        if (res.ok && res.data?.url) {
          uploaded.push(res.data.url);
        } else {
          setError(res.error || 'No se pudo subir la imagen');
        }
      } catch {
        setError('No se pudo leer la imagen');
      }
    }

    if (uploaded.length > 0) {
      onChange([...value, ...uploaded].slice(0, max));
    }
    setUploading(false);
  };

  const removeAt = (url: string) => {
    setError('');
    onChange(value.filter((v) => v !== url));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading || slots === 0}
        >
          {uploading ? 'Subiendo...' : '📷 Agregar foto'}
        </button>
        <span className={styles.hint}>
          {value.length}/{max} fotos · JPG, PNG, WebP o AVIF · max {formatMegabytes(MAX_COMMENT_IMAGE_BYTES)}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_COMMENT_IMAGE_ACCEPT}
          multiple
          hidden
          onChange={handleSelect}
        />
      </div>

      {value.length > 0 && (
        <div className={styles.previews}>
          {value.map((src, i) => (
            <div key={src} className={styles.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} />
              <button type="button" onClick={() => removeAt(src)} aria-label={`Quitar foto ${i + 1}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
