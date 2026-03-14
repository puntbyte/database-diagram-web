// web/src/core/diagram/diagram-controller.ts

import type {SchemaPayload, ViewSettings} from '../communication/protocol';
import type {TransformState} from './types';
import type {DbRelationship} from '../../models/types';
import {CanvasManager} from './canvas-manager';
import {EntityRenderer} from './entity-renderer';
import {ViewportStateManager} from './viewport-state-manager';
import {RelationshipCoordinator} from './relationship-coordinator';

export class DiagramController {
  private readonly canvasManager: CanvasManager;
  private readonly entityRenderer: EntityRenderer;
  private readonly viewportState: ViewportStateManager;
  private readonly relationshipCoordinator: RelationshipCoordinator;

  private currentRelationships: DbRelationship[] = [];

  constructor(
      containerId: string,
      onTablePositionChange: (name: string, x: number, y: number, width?: number) => void,
      onTransformChange?: (state: TransformState) => void
  ) {
    this.canvasManager = new CanvasManager(containerId);

    this.viewportState = new ViewportStateManager(
        this.canvasManager.container,
        this.canvasManager.canvas,
        onTransformChange,
        (isSemanticZoom) => this.handleSemanticZoomChange(isSemanticZoom)
    );

    this.relationshipCoordinator = new RelationshipCoordinator(
        this.canvasManager.canvas,
        this.canvasManager.svgLayer
    );

    this.entityRenderer = new EntityRenderer(
        this.canvasManager.entityLayer,
        this.relationshipCoordinator.manager,
        onTablePositionChange
    );
  }

  updateVisuals(settings: ViewSettings): void {
    this.viewportState.applyGridSettings(settings);
    this.viewportState.applyNoteSettings(settings);
    this.relationshipCoordinator.setStyle(settings.lineStyle);
  }

  loadSchema(payload: SchemaPayload, viewSettings?: ViewSettings): void {
    const preservedTransform = this.viewportState.getTransform();

    this.canvasManager.clear();
    this.entityRenderer.updateScale(preservedTransform.scale);
    this.viewportState.reinitializeControls();

    if (!payload) return;

    try {
      this.currentRelationships = payload.relationships;
      this.applyViewConfiguration(viewSettings, preservedTransform);
      this.entityRenderer.renderAll(payload.tables, payload.notes);
      this.entityRenderer.setRelationships(payload.relationships);
      this.relationshipCoordinator.scheduleRender(payload.relationships);
    } catch (error) {
      this.canvasManager.showError(error);
    }
  }

  private applyViewConfiguration(
      settings: ViewSettings | undefined,
      currentTransform: TransformState
  ): void {
    if (settings) this.updateVisuals(settings);
    this.viewportState.applyInitialOrRestoreTransform(currentTransform);
  }

  // FIX: Redraw lines on BOTH threshold crossings (entering AND leaving overlay mode).
  //
  // Entering semantic-zoom: tables collapse to fit-content width — their rects
  // change, so overlay lines drawn before the collapse are stale immediately.
  //
  // Leaving semantic-zoom: rows become visible again — table heights and column
  // element rects are restored, so column-level lines need a fresh measurement.
  //
  // Two nested rAFs are used so the first frame removes/adds the CSS class and
  // triggers layout, and the second frame reads the settled geometry.
  private handleSemanticZoomChange(_isSemanticZoom: boolean): void {
    if (this.currentRelationships.length === 0) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.relationshipCoordinator.scheduleRender(this.currentRelationships);
      });
    });
  }
}