import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Verificación estática de los breakpoints del detalle de producto.
 *
 * No hay navegador headless en el proyecto, así que se valida el CSS que
 * gobierna cada ancho objetivo: 320, 375, 768, 1024 y 1440 px.
 */
const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const pageCss = read('../src/app/products/[id]/page.module.css');
const menuModalCss = read('../src/components/MenuItemModal.module.css');
const commentsCss = read('../src/components/MenuItemComments.module.css');
const shareCss = read('../src/components/ShareButton.module.css');
const pickerCss = read('../src/components/CommentImagePicker.module.css');

/** Extrae el bloque completo de un @media a partir de su condición. */
function mediaBlock(css: string, condition: string): string {
  const start = css.indexOf(`@media (${condition})`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return '';
}

/** Recorta la declaración de un selector simple dentro de un bloque CSS. */
function declaration(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return '';
  const end = css.indexOf('}', start);
  return css.slice(start, end === -1 ? css.length : end);
}

describe('Detalle de producto responsive (320 / 375 / 768 / 1024 / 1440 px)', () => {
  it('320 y 375 px: heredan el corte de 768 px y la grilla pasa a una columna', () => {
    const mobile = mediaBlock(pageCss, 'max-width: 768px');

    expect(mobile).not.toBe('');
    expect(declaration(mobile, '.mainGrid')).toContain('grid-template-columns: 1fr;');
    expect(declaration(mobile, '.relatedGrid')).toContain('repeat(2, 1fr)');
    // La galería deja de ser sticky para no tapar el contenido en pantallas cortas
    expect(declaration(mobile, '.gallerySection')).toContain('position: static;');
  });

  it('320 px: el contenedor conserva padding lateral y los filtros hacen scroll', () => {
    expect(declaration(pageCss, '.container')).toContain('padding: 32px 16px;');

    const tiny = mediaBlock(pageCss, 'max-width: 480px');

    expect(tiny).not.toBe('');
    const filters = declaration(tiny, '.commentFilters');
    expect(filters).toContain('flex-wrap: nowrap;');
    expect(filters).toContain('overflow-x: auto;');
    // Miniaturas de comentarios reducidas para que entren 3 sin desbordar
    expect(declaration(tiny, '.commentImage')).toContain('width: 72px;');
    expect(declaration(tiny, '.lightboxImg')).toContain('max-width: 100%;');
  });

  it('375 px: las fotos de comentarios también se reducen en la sección completa', () => {
    const comments344 = mediaBlock(commentsCss, 'max-width: 640px');

    expect(comments344).not.toBe('');
    expect(declaration(comments344, '.imageBtn')).toContain('width: 72px;');
    expect(declaration(comments344, '.wrap')).toContain('padding: 16px;');
  });

  it('768 px: el modal de MenuItem deja de ser dos columnas y el CTA ocupa el ancho', () => {
    const modal = mediaBlock(menuModalCss, 'max-width: 720px');

    expect(modal).not.toBe('');
    expect(declaration(modal, '.body')).toContain('grid-template-columns: 1fr;');
    expect(declaration(modal, '.addBtn')).toContain('width: 100%;');
    expect(declaration(menuModalCss, '.modal')).toContain('max-width: 860px;');
  });

  it('1024 y 1440 px: layout de dos columnas dentro de un contenedor de 1200 px', () => {
    expect(declaration(pageCss, '.container')).toContain('max-width: 1200px;');
    expect(declaration(pageCss, '.container')).toContain('margin: 0 auto;');
    expect(declaration(pageCss, '.mainGrid')).toContain('grid-template-columns: 1fr 1fr;');
    expect(declaration(pageCss, '.mainGrid')).toContain('gap: 48px;');
    // Con 1200 px de contenido, en 1440 px quedan 120 px de margen por lado
    expect((1440 - 1200) / 2).toBe(120);
  });

  it('acciones y pickers pueden envolver para no generar scroll horizontal', () => {
    expect(declaration(shareCss, '.wrap')).toContain('flex-wrap: wrap;');
    expect(declaration(pickerCss, '.controls')).toContain('flex-wrap: wrap;');
  });

  it('el skeleton respeta prefers-reduced-motion y existe para hero, info y comentarios', () => {
    expect(pageCss).toContain('@keyframes shimmer');
    expect(declaration(pageCss, '.skeletonImage')).toContain('aspect-ratio: 1;');
    expect(declaration(pageCss, '.skeletonThumb')).toContain('width: 72px;');
    expect(mediaBlock(pageCss, 'prefers-reduced-motion: reduce')).toContain('animation: none;');
    expect(mediaBlock(commentsCss, 'prefers-reduced-motion: reduce')).toContain('animation: none;');
  });
});
