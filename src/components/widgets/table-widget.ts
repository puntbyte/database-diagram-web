// web/src/components/widgets/table-widget.ts

import type {DbTable} from '../../models/types.ts';
import {FieldWidget} from './field-widget.ts';
import {Icons} from '../ui/icons.ts';

const CSS = {
  table: 'db-table',
  overlay: 'semantic-overlay',
  overlayName: 'overlay-text',
  overlayMeta: 'overlay-meta',
  header: 'db-table-header',
  titleWrapper: 'header-title-wrapper',
  tableIcon: 'table-icon',
  title: 'title',
  schemaBanner: 'schema-banner',
  tableNote: 'table-note',
  resizeHandle: 'resize-handle',
} as const;

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

  // ── Table container ───────────────────────────────────────────────────────

  private static createContainer(table: DbTable): HTMLElement {
    const el = document.createElement('div');
    el.className = CSS.table;
    el.id = `table-${table.id}`;
    el.dataset.tableName = table.schema === 'public'
        ? table.name
        : `${table.schema}.${table.name}`;
    el.style.setProperty('--table-main-color', table.color ?? 'var(--header-bg)');
    if (table.width) el.style.width = `${table.width}px`;
    return el;
  }

  // ── Semantic overlay ──────────────────────────────────────────────────────
  // FIX: Show table name + column count + schema in overlay so the zoomed-out
  // view carries useful info without being cluttered.
  // FIX: Overlay is made position:absolute again but the table itself will have
  // its rows set to display:none in semantic-zoom CSS, so the table collapses to
  // just the header height and the overlay auto-fits to that size.

  private static createOverlay(table: DbTable): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = CSS.overlay;

    const name = document.createElement('div');
    name.className = CSS.overlayName;
    name.textContent = table.name;

    // Compact metadata line: "12 cols · public"
    const meta = document.createElement('div');
    meta.className = CSS.overlayMeta;
    const colCount = table.fields.length;
    const parts: string[] = [`${colCount} col${colCount !== 1 ? 's' : ''}`];
    if (table.schema && table.schema !== 'public') parts.push(table.schema);
    meta.textContent = parts.join(' · ');

    overlay.append(name, meta);
    return overlay;
  }

  // ── Header ────────────────────────────────────────────────────────────────

  private static createHeader(table: DbTable): HTMLElement {
    const header = document.createElement('div');
    header.className = CSS.header;

    const titleSection = document.createElement('div');
    titleSection.className = CSS.titleWrapper;

    const icon = document.createElement('span');
    icon.className = CSS.tableIcon;
    icon.innerHTML = Icons.table;

    const title = document.createElement('span');
    title.className = CSS.title;
    title.textContent = table.name;

    titleSection.append(icon, title);
    header.append(titleSection, this.createSchemaBadge(table.schema));

    if (table.note) {
      const note = document.createElement('div');
      note.className = CSS.tableNote;
      note.textContent = table.note;
      header.appendChild(note);
    }

    return header;
  }

  private static createSchemaBadge(schema: string): HTMLElement {
    const el = document.createElement('span');
    el.className = CSS.schemaBanner;
    el.textContent = schema;
    return el;
  }

  private static createResizeHandle(): HTMLElement {
    const el = document.createElement('div');
    el.className = CSS.resizeHandle;
    el.title = 'Drag to resize';
    return el;
  }
}