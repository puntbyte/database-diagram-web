// web/src/components/relationship/note-callout-renderer.ts
//
// Renders dashed callout arrows from notes that have a `target` attribute.
// Arrows are drawn in the same SVG layer as relationship lines.

export class NoteCalloutRenderer {
  private readonly svgLayer: SVGSVGElement;
  private readonly getScale: () => number;

  constructor(svgLayer: SVGSVGElement, getScale: () => number) {
    this.svgLayer = svgLayer;
    this.getScale = getScale;
  }

  /** Call after every relationship draw cycle. */
  render(): void {
    const notes = document.querySelectorAll<HTMLElement>('.sticky-note[data-callout-target]');
    notes.forEach(noteEl => {
      const target = noteEl.dataset.calloutTarget!;
      const targetAnchor = noteEl.dataset.calloutTargetAnchor ?? 'left';
      this.renderCallout(noteEl, target, targetAnchor);
    });
  }

  private renderCallout(noteEl: HTMLElement, target: string, targetAnchor: string): void {
    // Resolve the target element: "table.column" → col-table-column, "table" → table-table
    const [tablePart, colPart] = target.split('.');
    const targetId = colPart ? `col-${tablePart}-${colPart}` : `table-${tablePart}`;
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    const noteRect = this.getElementRect(noteEl);
    const targetRect = this.getElementRect(targetEl);
    if (!noteRect || !targetRect) return;

    // Note exit point: right-center of the note
    const noteExit = {
      x: noteRect.x + noteRect.width,
      y: noteRect.y + noteRect.height / 2,
    };

    // Target entry point based on targetAnchor
    const targetEntry = this.anchorPoint(targetRect, targetAnchor);

    // Simple curved callout path
    const midX = (noteExit.x + targetEntry.x) / 2;
    const d = `M ${noteExit.x} ${noteExit.y} `
        + `C ${midX} ${noteExit.y}, ${midX} ${targetEntry.y}, `
        + `${targetEntry.x} ${targetEntry.y}`;

    const group = document.createElementNS(this.svgLayer.namespaceURI!, 'g') as SVGGElement;
    group.classList.add('note-callout-group');

    const path = document.createElementNS(this.svgLayer.namespaceURI!, 'path') as SVGPathElement;
    path.setAttribute('d', d);
    path.classList.add('note-callout-line');

    // Arrowhead marker
    const arrowX = targetEntry.x;
    const arrowY = targetEntry.y;
    const dot = document.createElementNS(this.svgLayer.namespaceURI!, 'circle') as SVGCircleElement;
    dot.setAttribute('cx', String(arrowX));
    dot.setAttribute('cy', String(arrowY));
    dot.setAttribute('r', '4');
    dot.classList.add('note-callout-dot');

    group.append(path, dot);
    this.svgLayer.appendChild(group);
  }

  private anchorPoint(
      rect: { x: number; y: number; width: number; height: number },
      anchor: string
  ): { x: number; y: number } {
    switch (anchor) {
      case 'right':
        return {x: rect.x + rect.width, y: rect.y + rect.height / 2};
      case 'top':
        return {x: rect.x + rect.width / 2, y: rect.y};
      case 'bottom':
        return {x: rect.x + rect.width / 2, y: rect.y + rect.height};
      case 'left':
      default:
        return {x: rect.x, y: rect.y + rect.height / 2};
    }
  }

  private getElementRect(el: HTMLElement): {
    x: number; y: number; width: number; height: number
  } | undefined {
    const er = el.getBoundingClientRect();
    const cr = this.svgLayer.getBoundingClientRect();
    if (cr.width === 0 && cr.height === 0) return undefined;
    const s = this.getScale();
    return {
      x: (er.left - cr.left) / s,
      y: (er.top - cr.top) / s,
      width: er.width / s,
      height: er.height / s
    };
  }
}