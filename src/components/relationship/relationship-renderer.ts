// web/src/components/relationship/relationship-renderer.ts

import type {DbRelationship} from '../../models/types';
import type {EndpointsConfig, LineStyle, Rect} from './types';
import {RelationshipPath} from './path/relationship-path.ts';
import {RelationshipWidget} from '../widgets/relationship-widget.ts';
import {AnchorWidget} from '../widgets/anchor-widget.ts';
import {PathGeometer} from './path/path-geometer.ts';
import {PathComposer} from './path/path-composer.ts';

// Desired visual stroke width on screen (in CSS/device pixels).
const OVERLAY_SCREEN_PX = 3;

export class RelationshipRenderer {
  private svgLayer: SVGSVGElement;
  private readonly getScale: () => number;

  constructor(svgLayer: SVGSVGElement, getScale: () => number) {
    this.svgLayer = svgLayer;
    this.getScale = getScale;
  }

  render(
      relationships: DbRelationship[],
      configs: Map<DbRelationship, EndpointsConfig[]>,
      style: LineStyle,
      overlayMode: boolean = false
  ): void {
    if (overlayMode) {
      relationships.forEach(rel => this.renderOverlay(rel, style));
      return;
    }
    relationships.forEach(rel => this.renderRelationship(rel, configs.get(rel) ?? [], style));
  }

  // ── Overlay (semantic-zoom) mode ──────────────────────────────────────────

  private renderOverlay(rel: DbRelationship, style: LineStyle): void {
    // FIX: Use the real table element rects (not zero-size center points) so
    // PathGeometer picks the correct left/right edge anchor, matching normal mode.
    const srcRect = this.getElementRect(`table-${rel.fromTable}`);
    const dstRect = this.getElementRect(`table-${rel.toTable}`);
    if (!srcRect || !dstRect) return;

    const isSelf = rel.fromTable === rel.toTable;
    const config: EndpointsConfig = {
      fromColIndex: 0, fromColTotal: 1,
      toColIndex: 0, toColTotal: 1,
      fromLaneIndex: 0, toLaneIndex: 0,
      fromLabel: null, fromStagger: 0,
      toLabel: null, toStagger: 0,
      isSelfReference: isSelf,
      sourceAnchor: rel.sourceAnchor,
      targetAnchor: rel.targetAnchor,
    };

    const geo = new PathGeometer().calculate(srcRect, dstRect, config, style);
    const d = new PathComposer().generate(geo, style);

    const group = document.createElementNS(this.svgLayer.namespaceURI!, 'g') as SVGGElement;
    group.classList.add('relationship-group', 'overlay');

    const base = RelationshipWidget.createBaseLine(d);
    const flow = RelationshipWidget.createFlowLine(d);

    // FIX: CSS `transform: scale()` on the canvas parent scales SVG strokes too,
    // because `vector-effect: non-scaling-stroke` only compensates for SVG
    // `transform` attributes — NOT for CSS transforms.
    // Correct fix: set stroke-width = desiredScreenPx / cssScale so the stroke
    // appears at a constant visual thickness at any zoom level.
    const scale = this.getScale();
    const sw = OVERLAY_SCREEN_PX / Math.max(scale, 0.05);
    base.setAttribute('stroke-width', String(sw));
    flow.setAttribute('stroke-width', String(sw));
    // Keep flow dash pattern visually consistent too.
    flow.setAttribute('stroke-dasharray', `${15 / scale} ${150 / scale}`);

    group.append(base, flow);
    this.svgLayer.appendChild(group);
  }

  // ── Normal (column-level) mode ────────────────────────────────────────────

  private renderRelationship(
      rel: DbRelationship,
      pairConfigs: EndpointsConfig[],
      style: LineStyle
  ): void {
    const srcTableId = rel.fromTable;
    const dstTableId = rel.toTable;
    const isSelf = srcTableId === dstTableId;
    const pairCount = Math.min(rel.fromColumns.length, rel.toColumns.length);

    for (let i = 0; i < pairCount; i++) {
      const base = pairConfigs[i];
      if (!base) continue;
      this.renderColumnPair(rel, i, srcTableId, dstTableId, {
        ...base,
        isSelfReference: isSelf
      }, style);
    }
  }

  private renderColumnPair(
      rel: DbRelationship,
      idx: number,
      srcTableId: string,
      dstTableId: string,
      config: EndpointsConfig,
      style: LineStyle
  ): void {
    const srcColId = `col-${srcTableId}-${rel.fromColumns[idx]}`;
    const dstColId = `col-${dstTableId}-${rel.toColumns[idx]}`;

    const srcRect = this.getElementRect(srcColId);
    const dstRect = this.getElementRect(dstColId);
    if (!srcRect || !dstRect) return;

    const pathData = new RelationshipPath().calculate(
        srcRect, dstRect, srcColId, dstColId,
        `table-${srcTableId}`, `table-${dstTableId}`,
        style, config
    );

    const group = RelationshipWidget.createGroup(pathData);
    this.applyColor(group, rel);
    this.svgLayer.appendChild(group);
    this.renderAnchors(pathData);
  }

  private renderAnchors(pd: import('./types').ConnectionPathData): void {
    const s = AnchorWidget.create(pd.start);
    s.dataset.anchorId = pd.fromId;
    const e = AnchorWidget.create(pd.end);
    e.dataset.anchorId = pd.toId;
    this.svgLayer.append(s, e);
  }

  private applyColor(group: SVGGElement, rel: DbRelationship): void {
    const c = rel.settings?.color;
    if (!c) return;
    (group.querySelector('.relation-line-base') as SVGPathElement | null)?.style.setProperty('stroke', c);
    (group.querySelector('.relation-line-flow') as SVGPathElement | null)?.style.setProperty('stroke', c);
  }

  private getElementRect(id: string): Rect | undefined {
    const el = document.getElementById(id);
    if (!el) return undefined;
    const er = el.getBoundingClientRect();
    const cr = this.svgLayer.getBoundingClientRect();
    if (cr.width === 0 && cr.height === 0) return undefined;
    const s = this.getScale();
    return {
      x: (er.left - cr.left) / s,
      y: (er.top - cr.top) / s,
      width: er.width / s,
      height: er.height / s,
    };
  }
}