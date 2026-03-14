// web/src/interactions/viewport-controller.ts

import panzoom, {type PanZoom} from 'panzoom';

export type ZoomCallback = (scale: number) => void;
export type TransformCallback = (scale: number, x: number, y: number) => void;

interface ViewportConfig {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  smoothZoomFactor: number;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const DEFAULT_CONFIG: ViewportConfig = {
  minZoom: 0.2,
  maxZoom: 3,
  zoomStep: 0.05,
  smoothZoomFactor: 1.25
};

export class ViewportController {
  private panzoom: PanZoom;
  private config: ViewportConfig;
  private currentTransform: Transform = {scale: 1, x: 0, y: 0};
  private readonly onZoom: ZoomCallback;
  private readonly onTransform?: TransformCallback;
  private readonly canvas: HTMLElement;

  constructor(
      container: HTMLElement,
      onZoom: ZoomCallback,
      onTransform?: TransformCallback,
      config: Partial<ViewportConfig> = {}
  ) {
    this.onZoom = onZoom;
    this.onTransform = onTransform;
    this.config = {...DEFAULT_CONFIG, ...config};
    this.canvas = container;
    this.panzoom = this.initPanzoom(container);
    this.setupHandlers();
    this.centerView();
  }

  private initPanzoom(container: HTMLElement): PanZoom {
    return panzoom(container, {
      maxZoom: this.config.maxZoom,
      minZoom: this.config.minZoom,
      bounds: false,
      beforeMouseDown: (e) => this.beforeMouseDown(e),
      beforeWheel: (e) => this.handleWheel(e),
    });
  }

  private beforeMouseDown(event: MouseEvent | TouchEvent): boolean {
    const target = event.target as HTMLElement;
    const isEntityOrUI =
        target.closest('.db-table') !== null ||
        target.closest('.sticky-note') !== null ||
        target.closest('.toolbar-widget') !== null;

    if (!isEntityOrUI) {
      // FIX: Add class to canvas immediately so CSS :is(canvas.panning) rule fires.
      // Using a class instead of inline style means it survives specificity battles.
      this.canvas.classList.add('panning');
    }
    return isEntityOrUI; // true = panzoom ignores this event
  }

  private handleWheel(event: WheelEvent): boolean {
    if (!event.shiftKey) return false;
    const isH = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const delta = isH ? -event.deltaX : event.deltaY;
    if (delta === 0) {
      event.preventDefault();
      return true;
    }
    const factor = delta < 0 ? 1 + this.config.zoomStep : 1 - this.config.zoomStep;
    event.preventDefault();
    this.panzoom.zoomAbs(event.clientX, event.clientY, this.clamp(this.currentTransform.scale *
        factor));
    return true;
  }

  private clamp(s: number): number {
    return Math.max(this.config.minZoom, Math.min(this.config.maxZoom, s));
  }

  private setupHandlers(): void {
    const onT = (e: { getTransform: () => Transform }) => {
      const t = e.getTransform();
      this.currentTransform = {scale: t.scale, x: t.x || 0, y: t.y || 0};
      this.onZoom(this.currentTransform.scale);
      this.onTransform?.(this.currentTransform.scale, this.currentTransform.x, this.currentTransform.y);
    };

    this.panzoom.on('zoom', onT);
    this.panzoom.on('pan', onT);
    this.panzoom.on('transform', onT);

    // FIX: Remove panning class on any mouseup/touchend so cursor reverts to grab.
    const stopPan = () => this.canvas.classList.remove('panning');
    document.addEventListener('mouseup', stopPan);
    document.addEventListener('touchend', stopPan);

    // FIX: Apply base grab cursor on canvas immediately so users see the
    // panning affordance before their first interaction.
    this.canvas.classList.add('pannable');
  }

  getScale(): number {
    return this.currentTransform.scale;
  }

  getTransform(): Transform {
    return {...this.currentTransform};
  }

  setTransform(scale: number, x: number, y: number): void {
    this.panzoom.zoomAbs(x, y, 1);
    this.panzoom.moveTo(x, y);
    this.panzoom.zoomAbs(x, y, scale);
    this.currentTransform = {scale, x, y};
  }

  zoomIn(): void {
    this.smoothZoom(this.config.smoothZoomFactor);
  }

  zoomOut(): void {
    this.smoothZoom(1 / this.config.smoothZoomFactor);
  }

  private smoothZoom(f: number): void {
    const c = this.center();
    this.panzoom.smoothZoom(c.x, c.y, f);
  }

  private center(): { x: number; y: number } {
    const el = document.getElementById('app');
    return {
      x: (el?.clientWidth ?? window.innerWidth) / 2,
      y: (el?.clientHeight ?? window.innerHeight) / 2
    };
  }

  centerView(): void {
    const c = this.center();
    this.setTransform(1, c.x, c.y);
  }

  resetView(): void {
    this.centerView();
  }

  dispose(): void {
    this.panzoom.dispose();
  }
}