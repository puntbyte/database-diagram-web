// web/src/components/ui/tooltip.ts
//
// Lightweight singleton tooltip.
// FIX: The previous version called getBoundingClientRect() on the tooltip
// element before the browser had a chance to render it (opacity:0 → it had
// zero size).  The anchor rect was correct but the tooltip rect was (0,0,0,0),
// so centering always placed the tooltip at x=0 (left edge of the screen).
// Fix: position() now uses a requestAnimationFrame so the browser has laid
// out the newly-visible element before we try to measure it.

const SHOW_DELAY_MS = 500;
const HIDE_DELAY_MS = 100;

class TooltipSingleton {
  private el: HTMLDivElement;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private rafHandle: number | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'diagram-tooltip';
    this.el.setAttribute('role', 'tooltip');
    document.body.appendChild(this.el);

    this.el.addEventListener('mouseenter', () => this.cancelHide());
    this.el.addEventListener('mouseleave', () => this.scheduleHide());
  }

  bind(element: HTMLElement, getText: () => string): void {
    element.addEventListener('mouseenter', () => {
      const text = getText();
      if (!text) return;
      this.cancelHide();
      this.showTimer = setTimeout(() => this.show(element, text), SHOW_DELAY_MS);
    });
    element.addEventListener('mouseleave', () => {
      this.cancelShow();
      this.scheduleHide();
    });
    element.addEventListener('mousedown', () => this.hide());
    // Also hide when the element is scrolled out of view
    element.addEventListener('scroll', () => this.hide(), {passive: true});
  }

  private show(anchor: HTMLElement, text: string): void {
    this.el.textContent = text;

    // Make the element visible but off-screen so the browser renders it
    // with its final dimensions before we compute position.
    this.el.style.left = '-9999px';
    this.el.style.top = '-9999px';
    this.el.classList.add('diagram-tooltip--visible');

    // FIX: Wait one animation frame so the browser has laid out the tooltip
    // and getBoundingClientRect() returns real width/height.
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle);
    this.rafHandle = requestAnimationFrame(() => {
      this.position(anchor);
      this.rafHandle = null;
    });
  }

  private hide(): void {
    this.el.classList.remove('diagram-tooltip--visible');
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  private scheduleHide(): void {
    this.hideTimer = setTimeout(() => this.hide(), HIDE_DELAY_MS);
  }

  private cancelShow(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private position(anchor: HTMLElement): void {
    const aRect = anchor.getBoundingClientRect();
    const tRect = this.el.getBoundingClientRect();   // now has real size
    const GAP = 8;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    // Prefer below the anchor; flip above if not enough room
    const top = (aRect.bottom + GAP + tRect.height <= vpH)
        ? aRect.bottom + GAP
        : aRect.top - GAP - tRect.height;

    // Center horizontally, clamp inside viewport
    const left = Math.max(8, Math.min(
        aRect.left + aRect.width / 2 - tRect.width / 2,
        vpW - tRect.width - 8
    ));

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }
}

let _instance: TooltipSingleton | null = null;

export const Tooltip = {
  bind(element: HTMLElement, getText: () => string): void {
    if (!_instance) _instance = new TooltipSingleton();
    _instance.bind(element, getText);
  },
};