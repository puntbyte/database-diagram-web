// web/src/core/diagram/relationship-coordinator.ts

import {RelationshipManager} from '../../components/relationship';
import {NoteCalloutRenderer} from '../../components/relationship/note-callout-renderer.ts';
import type {DbRelationship} from '../../models/types';

export class RelationshipCoordinator {
  readonly manager: RelationshipManager;
  private readonly calloutRenderer: NoteCalloutRenderer;

  constructor(container: HTMLElement, svgLayer: SVGSVGElement) {
    this.manager = new RelationshipManager(container, svgLayer);
    this.calloutRenderer = new NoteCalloutRenderer(svgLayer, () => this.manager['scale'] ?? 1);
  }

  setStyle(style: string): void {
    this.manager.setStyle(style as any);
  }

  scheduleRender(relationships: DbRelationship[]): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.manager.draw(relationships);
        // Callout arrows are rendered after relationship lines so they sit on top.
        this.calloutRenderer.render();
      });
    });
  }
}