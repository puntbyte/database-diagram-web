// web/src/components/widgets/note-widget.ts

import {marked} from 'marked';
// FIX 1: Import the Config type explicitly from the dompurify module namespace.
// `import DOMPurify from 'dompurify'` imports the sanitizer function / object.
// `import type { Config }` imports the Config interface from the same module.
// This avoids the TS2503 "Cannot find namespace DOMPurify" error that occurs
// when you write `DOMPurify.Config` to reference the namespace type on the
// default export — the default export is a value, not a namespace in TS terms.
import DOMPurify from 'dompurify';
import type {Config as DOMPurifyConfig} from 'dompurify';
import type {DbNote} from '../../models/types.ts';
import {ColorPicker} from '../ui/color-picker.ts';

// ── Marked config ─────────────────────────────────────────────────────────────

const renderer = new marked.Renderer();
renderer.link = ({href, title, tokens}) => {
  const text = tokens.map(t => ('text' in t ? t.text : '')).join('');
  const titleAttr = title ? ` title="${DOMPurify.sanitize(title)}"` : '';
  return `<a href="${DOMPurify.sanitize(href ??
      '')}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};
marked.setOptions({breaks: true, gfm: true, renderer});

// FIX 2: Type the config as the explicit string-returning overload so TypeScript
// selects `sanitize(source, config & { RETURN_DOM_FRAGMENT?: false; RETURN_DOM?: false }): string`
// instead of the broadest `sanitize(source, config): string | HTMLElement | DocumentFragment`.
const PURIFY_CONFIG: DOMPurifyConfig & { RETURN_DOM_FRAGMENT: false; RETURN_DOM: false } = {
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 's', 'del', 'ins', 'mark', 'sup', 'sub', 'small',
    'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'id', 'colspan',
    'rowspan'],
  FORBID_ATTR: ['style', 'onerror', 'onload'],
};

function parseMarkdown(text: string): string {
  // With RETURN_DOM_FRAGMENT:false and RETURN_DOM:false the overload that
  // returns `string` is selected, so no cast or assertion needed.
  return DOMPurify.sanitize(marked.parse(text) as string, PURIFY_CONFIG);
}

function contrastColor(hex: string): string {
  const c = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? '#1f2937' : '#f9fafb';
}

// ── Widget ─────────────────────────────────────────────────────────────────────

export class NoteWidget {
  static create(note: DbNote): HTMLElement {
    const el = document.createElement('div');
    el.className = 'sticky-note';
    el.id = `note-${note.id}`;
    el.dataset.noteId = note.name;

    el.style.left = `${note.horizontal}px`;
    el.style.top = `${note.vertical}px`;
    el.style.width = `${note.width}px`;
    if (note.height) el.style.height = `${note.height}px`;

    if (note.color) {
      el.style.backgroundColor = note.color;
      el.style.color = contrastColor(note.color);
    }

    if (note.target) el.dataset.calloutTarget = note.target;
    if (note.targetAnchor) el.dataset.calloutTargetAnchor = note.targetAnchor;

    // Three-dot menu (top-right corner, portal-based picker)
    const menuWrap = this.createMenuWrap(note, el);

    const content = document.createElement('div');
    content.className = 'note-content';
    content.innerHTML = parseMarkdown(note.content);

    const handle = document.createElement('div');
    handle.className = 'resize-handle';

    el.append(menuWrap, content, handle);
    return el;
  }

  private static createMenuWrap(note: DbNote, noteEl: HTMLElement): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'entity-menu-wrap note-menu-wrap';

    const btn = document.createElement('button');
    btn.className = 'entity-menu-btn';
    btn.innerHTML = DOTS_SVG;
    btn.title = 'Options';
    btn.addEventListener('mousedown', e => e.stopPropagation());

    // Use a portal-mounted picker so overflow:hidden on the note card
    // never clips the popup.
    const picker = new ColorPicker((hex) => {
      noteEl.style.backgroundColor = hex;
      noteEl.style.color = contrastColor(hex);
      noteEl.dispatchEvent(new CustomEvent('note-color-changed', {
        detail: {noteId: note.name, color: hex},
        bubbles: true,
      }));
    }, {portal: true});

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      picker.toggle(btn, note.color ?? '#fffde7');
    });

    wrap.appendChild(btn);
    return wrap;
  }
}

const DOTS_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
  <circle cx="10" cy="4"  r="1.5"/>
  <circle cx="10" cy="10" r="1.5"/>
  <circle cx="10" cy="16" r="1.5"/>
</svg>`;