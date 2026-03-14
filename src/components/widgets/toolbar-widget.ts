// web/src/components/widgets/toolbar-widget.ts

import type {ViewportController} from '../../interactions/viewport-controller.ts';
import {Icons} from '../ui/icons.ts';

const CSS = {
  toolbar: 'toolbar-widget',
  group: 'toolbar-controls-group',
  btn: 'toolbar-control-btn',
  separator: 'toolbar-separator',
  legendWrap: 'toolbar-legend-wrap',
  popup: 'toolbar-legend-popup',
  popupOpen: 'toolbar-legend-popup--open',
} as const;

export class ToolbarWidget {
  private readonly container: HTMLElement;
  private readonly el: HTMLElement;

  constructor(container: HTMLElement, viewport: ViewportController) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = CSS.toolbar;

    // Legend first → popup opens leftward from the toolbar's left edge.
    this.el.append(
        this.legendButton(),
        this.separator(),
        this.zoomGroup(viewport),
    );
    this.container.appendChild(this.el);
  }

  // ── Zoom controls ─────────────────────────────────────────────────────────

  private zoomGroup(vp: ViewportController): HTMLElement {
    const g = document.createElement('div');
    g.className = CSS.group;
    g.append(
        this.btn(Icons.zoomOut, 'Zoom Out', () => vp.zoomOut()),
        this.btn(Icons.center, 'Reset View', () => vp.resetView()),
        this.btn(Icons.zoomIn, 'Zoom In', () => vp.zoomIn()),
    );
    return g;
  }

  private separator(): HTMLElement {
    const el = document.createElement('div');
    el.className = CSS.separator;
    return el;
  }

  // ── Legend button + popup ─────────────────────────────────────────────────

  private legendButton(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = CSS.legendWrap;

    const btn = document.createElement('button');
    btn.className = CSS.btn;
    btn.title = 'Legend';
    btn.innerHTML = LEGEND_ICON;

    const popup = this.buildLegendPopup();
    wrap.append(btn, popup);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.toggle(CSS.popupOpen);
    });
    document.addEventListener('click', () => popup.classList.remove(CSS.popupOpen));
    return wrap;
  }

  private buildLegendPopup(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = CSS.popup;
    popup.addEventListener('click', (e) => e.stopPropagation());

    // Title
    const title = document.createElement('div');
    title.className = 'legend-title';
    title.textContent = 'Diagram Legend';
    popup.appendChild(title);

    // ── Key types section ─────────────────────────────────────────────────
    // FIX: Use the actual key SVG icon with the same CSS classes used on real
    // field rows (.key-icon.pk / .fk / .pk-fk) so the legend shows the exact
    // same colored key icon the user sees in the diagram — not a plain dot.
    popup.appendChild(this.sectionLabel('Key Types'));

    const keyTypes: Array<[string, string, string]> = [
      ['pk', 'pk', 'Primary Key'],
      ['fk', 'fk', 'Foreign Key'],
      ['pk-fk', 'pkFk', 'Primary + Foreign Key'],
    ];
    for (const [cssClass, , label] of keyTypes) {
      const icon = document.createElement('span');
      icon.className = `key-icon ${cssClass}`;
      icon.innerHTML = Icons.key;
      popup.appendChild(this.legendRow(icon, label));
    }

    popup.appendChild(this.divider());

    // ── Column badges section ─────────────────────────────────────────────
    popup.appendChild(this.sectionLabel('Column Badges'));
    const badges: Array<[string, string, string]> = [
      ['unique', 'unique', 'Unique constraint'],
      ['not-null', 'not-null', 'Not Null constraint'],
      ['enum', 'enum', 'Enumeration type'],
      ['custom-type', 'custom-type', 'User-defined type'],
    ];
    for (const [, cls, label] of badges) {
      const chip = document.createElement('span');
      chip.className = `legend-badge ${cls}`;
      // Show representative label text matching the real badge
      chip.textContent = cls === 'not-null' ? 'NN'
          : cls === 'unique' ? 'UQ'
              : cls === 'enum' ? 'ENUM'
                  : 'TYPE';
      popup.appendChild(this.legendRow(chip, label));
    }

    popup.appendChild(this.divider());

    // ── Cardinality section ───────────────────────────────────────────────
    popup.appendChild(this.sectionLabel('Cardinality'));
    for (const [card, label] of [['1:1', 'One-to-one'], ['1:n', 'One-to-many'],
      ['n:1', 'Many-to-one'], ['m:n', 'Many-to-many']]) {
      const chip = document.createElement('span');
      chip.className = 'legend-card';
      chip.textContent = card;
      popup.appendChild(this.legendRow(chip, label));
    }

    return popup;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** A single legend row: [icon/chip] + [label text]. */
  private legendRow(iconEl: HTMLElement, labelText: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'legend-row';
    const label = document.createElement('span');
    label.textContent = labelText;
    row.append(iconEl, label);
    return row;
  }

  private sectionLabel(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'legend-section-label';
    el.textContent = text;
    return el;
  }

  private divider(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'legend-divider';
    return el;
  }

  private btn(icon: string, title: string, action: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = CSS.btn;
    b.innerHTML = icon;
    b.title = title;
    b.addEventListener('click', action);
    return b;
  }

  destroy(): void {
    this.el.remove();
  }
}

const LEGEND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
</svg>`;