// web/src/interactions/drag/entity-drag-handler.ts

import {RelationshipManager} from '../../components/relationship';
import type {DbRelationship} from '../../models/types';
import {DragStateManager} from './drug-state-manager.ts';
import {TablePositionNotifier} from './table-notifier';
import {NotePositionNotifier} from './note-notifier';
import {DragInteractionDetector} from './interaction-detector';

export type TablePositionCallback = (
    tableName: string, x: number, y: number, width?: number
) => void;

export class EntityDragHandler {
  private readonly stateManager: DragStateManager;
  private readonly interactionDetector: DragInteractionDetector;
  private readonly tableNotifier: TablePositionNotifier;
  private readonly noteNotifier: NotePositionNotifier;

  private relationshipManager: RelationshipManager;
  private relationships: DbRelationship[] = [];
  private scale = 1; // kept as fallback for liveScale()

  constructor(
      wrapper: HTMLElement,
      relationshipManager: RelationshipManager,
      onPositionUpdate: TablePositionCallback
  ) {
    this.relationshipManager = relationshipManager;
    this.stateManager = new DragStateManager();
    this.tableNotifier = new TablePositionNotifier(onPositionUpdate);
    this.noteNotifier = new NotePositionNotifier(wrapper);
    this.interactionDetector = new DragInteractionDetector(wrapper, this);
  }

  updateConnectionManager(m: RelationshipManager): void {
    this.relationshipManager = m;
  }

  setRelationships(r: DbRelationship[]): void {
    this.relationships = r;
  }

  updateScale(s: number): void {
    this.scale = s;
  }

  beginDrag(element: HTMLElement, event: MouseEvent): void {
    this.stateManager.beginDrag(element, event);
    // FIX: Add body class so CSS can force grabbing cursor globally with !important,
    // preventing flicker when the mouse briefly leaves the element during fast drag.
    document.body.classList.add('entity-dragging');
    this.prevent(event);
  }

  beginResize(element: HTMLElement, event: MouseEvent): void {
    this.stateManager.beginResize(element, event);
    // FIX: se-resize communicates the bottom-right resize direction clearly.
    document.body.classList.add('entity-resizing');
    this.prevent(event);
  }

  handleMove(event: MouseEvent): void {
    const state = this.stateManager.getState();
    if (state.mode === 'idle' || !state.element) return;

    const delta = this.delta(event);

    if (state.mode === 'dragging') this.moveDrag(state.element, delta);
    else if (state.mode === 'resizing') this.moveResize(state.element, delta);
  }

  private delta(event: MouseEvent): { x: number; y: number } {
    const start = this.stateManager.getStartMouse();
    const s = this.liveScale();
    return {x: (event.clientX - start.x) / s, y: (event.clientY - start.y) / s};
  }

  /** Read --zoom CSS variable directly from #app — always current, immune to
   *  stale this.scale which only refreshes on full schema loads. */
  private liveScale(): number {
    try {
      const v = getComputedStyle(document.getElementById('app')!).getPropertyValue('--zoom').trim();
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) return n;
    } catch (_) {
    }
    return this.scale;
  }

  private moveDrag(el: HTMLElement, delta: { x: number; y: number }): void {
    const start = this.stateManager.getStartValues();
    el.style.left = `${start.x + delta.x}px`;
    el.style.top = `${start.y + delta.y}px`;
    el.style.transform = 'none';
    if (el.classList.contains('db-table'))
      requestAnimationFrame(() => this.relationshipManager.draw(this.relationships));
  }

  private moveResize(el: HTMLElement, delta: { x: number; y: number }): void {
    const start = this.stateManager.getStartValues();
    el.style.width = `${Math.max(100, start.width + delta.x)}px`;
    if (el.classList.contains('sticky-note'))
      el.style.height = `${Math.max(100, start.height + delta.y)}px`;
    if (el.classList.contains('db-table'))
      requestAnimationFrame(() => this.relationshipManager.draw(this.relationships));
  }

  handleEnd(): void {
    const state = this.stateManager.getState();
    if (state.mode === 'idle' || !state.element) return;

    const rect = this.finalRect(state.element);
    if (state.element.classList.contains('db-table'))
      this.tableNotifier.notify(state.element, rect);
    else if (state.element.classList.contains('sticky-note'))
      this.noteNotifier.notify(state.element, rect);

    this.cleanup(state.element);
  }

  private finalRect(el: HTMLElement): { x: number; y: number; width: number; height: number } {
    // FIX: offsetLeft/offsetTop/offsetWidth/offsetHeight — layout values already in
    // logical CSS pixels, no scale conversion needed, no sub-pixel truncation drift.
    return {
      x: Math.round(el.offsetLeft),
      y: Math.round(el.offsetTop),
      width: Math.round(el.offsetWidth),
      height: Math.round(el.offsetHeight),
    };
  }

  private cleanup(el: HTMLElement): void {
    el.classList.remove('dragging', 'resizing');
    // FIX: Remove body cursor classes to restore normal state.
    document.body.classList.remove('entity-dragging', 'entity-resizing');
    this.stateManager.reset();
  }

  private prevent(e: MouseEvent): void {
    e.stopPropagation();
    e.preventDefault();
  }
}