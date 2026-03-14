// web/src/core/diagram/viewport-state-manager.ts

import {ViewportController} from '../../interactions/viewport-controller';
import {ToolbarWidget} from '../../components/widgets/toolbar-widget.ts';
import type {TransformState} from './types';
import type {ViewSettings} from '../communication/protocol';

const ZOOM_THRESHOLD = 0.5;
// Duration must match the CSS transition on .db-table (300 ms).
const TRANSITION_MS = 300;

export class ViewportStateManager {
  private readonly panZoomController: ViewportController;
  private controls: ToolbarWidget;
  private isInitialRender = true;
  private currentTransform: TransformState = {scale: 1, x: 0, y: 0};
  private prevSemanticZoom = false;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly container: HTMLElement;
  private readonly canvas: HTMLElement;
  private readonly onTransformChange?: (state: TransformState) => void;
  private readonly onSemanticZoomChange?: (isSemanticZoom: boolean) => void;

  constructor(
      container: HTMLElement,
      canvas: HTMLElement,
      onTransformChange?: (state: TransformState) => void,
      onSemanticZoomChange?: (isSemanticZoom: boolean) => void
  ) {
    this.container = container;
    this.canvas = canvas;
    this.onTransformChange = onTransformChange;
    this.onSemanticZoomChange = onSemanticZoomChange;
    this.panZoomController = this.initializePanZoom();
    this.controls = this.createControls();
  }

  private initializePanZoom(): ViewportController {
    return new ViewportController(
        this.canvas,
        (scale) => this.handleZoomUpdate(scale),
        (scale, x, y) => this.handleTransformUpdate(scale, x, y)
    );
  }

  private handleZoomUpdate(scale: number): void {
    this.currentTransform.scale = scale;
    this.updateZoomStyles(scale);
  }

  private handleTransformUpdate(scale: number, x: number, y: number): void {
    this.currentTransform = {scale, x, y};
    this.updateZoomStyles(scale, x, y);
    this.onTransformChange?.(this.currentTransform);
  }

  private updateZoomStyles(scale: number, x?: number, y?: number): void {
    const isSemanticZoom = scale < ZOOM_THRESHOLD;
    this.canvas.classList.toggle('semantic-zoom', isSemanticZoom);
    this.container.style.setProperty('--zoom', scale.toString());

    if (x !== undefined && y !== undefined) {
      this.container.style.setProperty('--pan-x', `${x}px`);
      this.container.style.setProperty('--pan-y', `${y}px`);
    }

    if (isSemanticZoom !== this.prevSemanticZoom) {
      this.prevSemanticZoom = isSemanticZoom;

      // FIX: Add a transitioning class so the CSS width/height transition on
      // .db-table fires when switching between full and overlay view, creating
      // a smooth animated collapse / expand.  Remove the class after the
      // transition completes so it doesn't interfere with manual resizing.
      if (this.transitionTimer !== null) clearTimeout(this.transitionTimer);
      this.canvas.classList.add('semantic-zoom-transitioning');
      this.transitionTimer = setTimeout(() => {
        this.canvas.classList.remove('semantic-zoom-transitioning');
        this.transitionTimer = null;
      }, TRANSITION_MS);

      this.onSemanticZoomChange?.(isSemanticZoom);
    }
  }

  private createControls(): ToolbarWidget {
    this.container.querySelector('.toolbar-widget')?.remove();
    return new ToolbarWidget(this.container, this.panZoomController);
  }

  reinitializeControls(): void {
    this.controls?.destroy();
    this.controls = new ToolbarWidget(this.container, this.panZoomController);
  }

  applyGridSettings(settings: ViewSettings): void {
    this.container.style.setProperty('--grid-size', `${settings.gridSize}px`);
    this.container.classList.toggle('grid-visible', settings.showGrid);
  }

  applyNoteSettings(settings: ViewSettings): void {
    const c = this.container;
    c.classList.toggle('hide-table-notes', !settings.showTableNotes);
    c.classList.toggle('hide-field-notes', !settings.showFieldNotes);
    c.style.setProperty('--table-note-max-lines', String(settings.tableNoteMaxLines || 2));
    c.style.setProperty('--field-note-max-lines', String(settings.fieldNoteMaxLines || 2));
  }

  getTransform(): TransformState {
    return this.panZoomController.getTransform();
  }

  applyInitialOrRestoreTransform(transform: TransformState): void {
    if (this.isInitialRender) {
      this.applyInitialTransform(transform);
    } else {
      this.restoreTransform(transform);
    }
    this.isInitialRender = false;
  }

  private applyInitialTransform(transform: TransformState): void {
    const hasSavedPosition = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1;
    if (hasSavedPosition) {
      this.panZoomController.setTransform(transform.scale, transform.x, transform.y);
      this.updateZoomStyles(transform.scale, transform.x, transform.y);
    }
  }

  private restoreTransform(transform: TransformState): void {
    this.container.style.setProperty('--zoom', transform.scale.toString());
    this.container.style.setProperty('--pan-x', `${transform.x}px`);
    this.container.style.setProperty('--pan-y', `${transform.y}px`);
  }
}