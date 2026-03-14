// web/src/components/widgets/table-widget.ts

import type {DbTable} from '../../models/types.ts';
import {FieldWidget} from './field-widget.ts';
import {Icons} from '../ui/icons.ts';
import {Tooltip} from '../ui/tooltip.ts';
import {ColorPicker} from '../ui/color-picker.ts';

const CSS = {
  table: 'db-table',
  overlay: 'semantic-overlay',
  overlayName: 'overlay-text',
  overlayMeta: 'overlay-meta',
  header: 'db-table-header',
  titleWrapper: 'header-title-wrapper',
  headerRight: 'header-right',
  tableIcon: 'table-icon',
  title: 'title',
  schemaBanner: 'schema-banner',
  tableNote: 'table-note',
  resizeHandle: 'resize-handle',
  menuWrap: 'entity-menu-wrap',
  menuBtn: 'entity-menu-btn',
} as const;

// ── Contrast helper ────────────────────────────────────────────────────────────
// FIX: Previously the header used --header-text which is a fixed colour, so
// a light-coloured custom header (e.g. yellow or white) produced unreadable text.
// Now we compute a contrasting black or white based on the background luminance.

function contrastColor(hex: string): string {
  const c = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? '#1f2937' : '#f9fafb';
}

export class TableWidget {
  static create(table: DbTable): HTMLElement {
    const el = this.createContainer(table);
    el.append(
        this.createOverlay(table),
        this.createHeader(table),
        ...table.fields.map(f => FieldWidget.create(f, table.id)),
        this.createResizeHandle()
    );
    return el;
  }

  private static createContainer(table: DbTable): HTMLElement {
    const el = document.createElement('div');
    el.className = CSS.table;
    el.id = `table-${table.id}`;
    el.dataset.tableName = table.schema === 'public'
        ? table.name : `${table.schema}.${table.name}`;
    el.style.setProperty('--table-main-color', table.color ?? 'var(--header-bg)');
    // Pre-compute contrast text colour for the initial color.
    if (table.color) {
      el.style.setProperty('--table-header-text', contrastColor(table.color));
    }
    if (table.width) el.style.width = `${table.width}px`;
    return el;
  }

  private static createOverlay(table: DbTable): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = CSS.overlay;
    const name = document.createElement('div');
    name.className = CSS.overlayName;
    name.textContent = table.name;
    const meta = document.createElement('div');
    meta.className = CSS.overlayMeta;
    const parts = [`${table.fields.length} col${table.fields.length !== 1 ? 's' : ''}`];
    if (table.schema && table.schema !== 'public') parts.push(table.schema);
    meta.textContent = parts.join(' · ');
    overlay.append(name, meta);
    return overlay;
  }

  private static createHeader(table: DbTable): HTMLElement {
    const header = document.createElement('div');
    header.className = CSS.header;

    // Left: icon + title
    const titleSection = document.createElement('div');
    titleSection.className = CSS.titleWrapper;
    const icon = document.createElement('span');
    icon.className = CSS.tableIcon;
    icon.innerHTML = Icons.table;
    const title = document.createElement('span');
    title.className = CSS.title;
    title.textContent = table.name;
    titleSection.append(icon, title);

    // Right: schema badge + three-dot menu
    const right = document.createElement('div');
    right.className = CSS.headerRight;
    right.append(
        this.createSchemaBadge(table.schema),
        this.createMenuWrap(table)
    );

    header.append(titleSection, right);

    if (table.note) {
      const noteEl = document.createElement('div');
      noteEl.className = CSS.tableNote;
      noteEl.textContent = table.note;
      Tooltip.bind(noteEl, () => table.note!);
      header.appendChild(noteEl);
    }

    return header;
  }

  private static createSchemaBadge(schema: string): HTMLElement {
    const el = document.createElement('span');
    el.className = CSS.schemaBanner;
    el.textContent = schema;
    return el;
  }

  private static createMenuWrap(table: DbTable): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = CSS.menuWrap;

    const btn = document.createElement('button');
    btn.className = CSS.menuBtn;
    btn.innerHTML = DOTS_SVG;
    btn.title = 'Options';
    btn.addEventListener('mousedown', e => e.stopPropagation());

    // Portal mode: popup lives on <body>, escaping the table's overflow:hidden.
    const picker = new ColorPicker((hex) => {
      const tableEl = btn.closest<HTMLElement>('.db-table');
      if (tableEl) {
        tableEl.style.setProperty('--table-main-color', hex);
        // FIX: update the header text colour to maintain legibility on any bg.
        tableEl.style.setProperty('--table-header-text', contrastColor(hex));
        tableEl.dispatchEvent(new CustomEvent('table-color-changed', {
          detail: {tableName: table.name, color: hex},
          bubbles: true,
        }));
      }
    }, {portal: true});

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      picker.toggle(btn, table.color);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  private static createResizeHandle(): HTMLElement {
    const el = document.createElement('div');
    el.className = CSS.resizeHandle;
    el.title = 'Drag to resize';
    return el;
  }
}

const DOTS_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
  <circle cx="10" cy="4"  r="1.5"/>
  <circle cx="10" cy="10" r="1.5"/>
  <circle cx="10" cy="16" r="1.5"/>
</svg>`;