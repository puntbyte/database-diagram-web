// web/src/components/ui/color-picker.ts
//
// Colour picker with Material Design palette presets + native colour input.
//
// FIX: The popup is now appended to <body> (portal mode) instead of the
// button's ancestor tree.  This avoids being clipped by overflow:hidden on
// .db-table or .sticky-note.  The popup is positioned using the trigger
// button's getBoundingClientRect() on every open() call so it always appears
// directly below the button regardless of scroll or zoom.

const MATERIAL_PALETTE: string[][] = [
  ['#ef9a9a', '#ef5350', '#c62828', '#b71c1c'],  // Red
  ['#ffab91', '#ff7043', '#d84315', '#bf360c'],  // Deep Orange
  ['#ffcc80', '#ffa726', '#ef6c00', '#e65100'],  // Orange
  ['#fff176', '#ffee58', '#f9a825', '#f57f17'],  // Yellow
  ['#a5d6a7', '#66bb6a', '#2e7d32', '#1b5e20'],  // Green
  ['#80cbc4', '#26a69a', '#00695c', '#004d40'],  // Teal
  ['#81d4fa', '#29b6f6', '#0277bd', '#01579b'],  // Light Blue
  ['#90caf9', '#42a5f5', '#1565c0', '#0d47a1'],  // Blue
  ['#ce93d8', '#ab47bc', '#6a1b9a', '#4a148c'],  // Purple
  ['#f48fb1', '#ec407a', '#ad1457', '#880e4f'],  // Pink
  ['#bcaaa4', '#8d6e63', '#4e342e', '#3e2723'],  // Brown
  ['#eeeeee', '#bdbdbd', '#616161', '#212121'],  // Grey
  ['#ffffff', '#f5f5f5', '#9e9e9e', '#000000'],  // B&W
];

export type ColorSelectedCallback = (hex: string) => void;

export interface ColorPickerOptions {
  /** When true the popup is appended to <body> and positioned via fixed coords.
   *  Use whenever the trigger button lives inside overflow:hidden. */
  portal?: boolean;
}

export class ColorPicker {
  private popup: HTMLElement;
  private customInput: HTMLInputElement;
  private onSelect: ColorSelectedCallback;
  private portalMode: boolean;
  private _open = false;

  constructor(onSelect: ColorSelectedCallback, options: ColorPickerOptions = {}) {
    this.onSelect = onSelect;
    this.portalMode = options.portal ?? false;
    this.popup = this.buildPopup();
    this.customInput = this.popup.querySelector<HTMLInputElement>('.cp-custom-input')!;

    if (this.portalMode) {
      // Portal: live on <body>, shown/hidden via class and positioned via JS.
      this.popup.classList.add('cp-portal');
      document.body.appendChild(this.popup);
    }

    // Close when clicking anywhere outside the popup.
    document.addEventListener('click', (e) => {
      if (this._open && !this.popup.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  /** Attach to a non-portal container (for non-clipped contexts). */
  mount(container: HTMLElement): void {
    if (!this.portalMode) container.appendChild(this.popup);
  }

  /**
   * Open the picker.
   * @param trigger  The button element used to anchor positioning (portal mode).
   * @param currentColor  Pre-select the native colour input.
   */
  open(trigger?: HTMLElement, currentColor?: string): void {
    if (currentColor) this.customInput.value = currentColor;
    this.popup.classList.add('cp-open');
    this._open = true;

    if (this.portalMode && trigger) {
      this.positionNearTrigger(trigger);
    }
  }

  close(): void {
    this.popup.classList.remove('cp-open');
    this._open = false;
  }

  toggle(trigger?: HTMLElement, currentColor?: string): void {
    this._open ? this.close() : this.open(trigger, currentColor);
  }

  get isOpen(): boolean {
    return this._open;
  }

  // ── Positioning ───────────────────────────────────────────────────────────

  /**
   * Position the portal popup directly below (or above) the trigger button
   * using viewport-relative fixed coordinates so it escapes any ancestor's
   * overflow:hidden / overflow:clip.
   */
  private positionNearTrigger(trigger: HTMLElement): void {
    const rect = trigger.getBoundingClientRect();
    const GAP = 4;

    // Reset to get natural size before measuring
    this.popup.style.top = '-9999px';
    this.popup.style.left = '-9999px';

    requestAnimationFrame(() => {
      const pRect = this.popup.getBoundingClientRect();
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;

      // Prefer below the button; flip above if there isn't room.
      let top: number;
      if (rect.bottom + GAP + pRect.height <= vpH) {
        top = rect.bottom + GAP;
      } else {
        top = rect.top - GAP - pRect.height;
      }

      // Align left edge with button left, clamped inside the viewport.
      let left = Math.max(8, Math.min(rect.left, vpW - pRect.width - 8));

      this.popup.style.top = `${top}px`;
      this.popup.style.left = `${left}px`;
    });
  }

  // ── DOM builder ───────────────────────────────────────────────────────────

  private buildPopup(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'cp-popup';
    popup.addEventListener('click', e => e.stopPropagation());

    const grid = document.createElement('div');
    grid.className = 'cp-grid';
    for (const row of MATERIAL_PALETTE) {
      for (const hex of row) {
        const swatch = document.createElement('button');
        swatch.className = 'cp-swatch';
        swatch.style.background = hex;
        swatch.title = hex;
        swatch.addEventListener('click', () => {
          this.onSelect(hex);
          this.close();
        });
        grid.appendChild(swatch);
      }
    }
    popup.appendChild(grid);

    const sep = document.createElement('div');
    sep.className = 'cp-sep';
    popup.appendChild(sep);

    const row = document.createElement('div');
    row.className = 'cp-custom-row';

    const label = document.createElement('span');
    label.className = 'cp-custom-label';
    label.textContent = 'Custom';

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'cp-custom-input';
    input.value = '#ffffff';
    input.title = 'Pick custom colour';
    input.addEventListener('change', () => {
      this.onSelect(input.value);
      this.close();
    });

    row.append(label, input);
    popup.appendChild(row);
    return popup;
  }
}