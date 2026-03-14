// web/src/main.ts

import {Bridge} from './core/communication/bridge.ts';
import type {ServerMessage, ViewSettings} from './core/communication/protocol.ts';
import './styles/main.css';
import {DiagramController} from './core/diagram/diagram-controller.ts';

class DiagramApplication {
  private bridge: Bridge;
  private controller: DiagramController;
  private viewSettings: ViewSettings = {
    lineStyle: 'Curve',
    showGrid: true,
    gridSize: 20,
    showTableNotes: true,
    showFieldNotes: true,
    tableNoteMaxLines: 2,
    fieldNoteMaxLines: 2,
  };

  constructor() {
    this.bridge = new Bridge((msg) => this.handleServerMessage(msg));
    this.controller = this.initializeController();
    this.setupEventListeners();
    this.bridge.log('Diagram application initialized', 'INFO');
  }

  private initializeController(): DiagramController {
    return new DiagramController(
        'app',
        (tableName, x, y, width) => this.bridge.send({
          type: 'UPDATE_TABLE_POS',
          tableName,
          x,
          y,
          width
        }),
        (_transform) => { /* reserved */
        }
    );
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'UPDATE_GLOBAL_SETTINGS':
        this.updateSettings({
          lineStyle: message.lineStyle,
          showGrid: message.showGrid,
          gridSize: message.gridSize,
          showTableNotes: message.showTableNotes,
          showFieldNotes: message.showFieldNotes,
          tableNoteMaxLines: message.tableNoteMaxLines,
          fieldNoteMaxLines: message.fieldNoteMaxLines,
        });
        break;
      case 'UPDATE_SCHEMA_PAYLOAD':
        if (message.settings) this.updateSettings(message.settings);
        this.controller.loadSchema(message.payload, this.viewSettings);
        break;
      case 'UPDATE_THEME':
        document.body.classList.toggle('dark', message.theme === 'dark');
        break;
    }
  }

  private updateSettings(settings: ViewSettings): void {
    this.viewSettings = settings;
    this.controller.updateVisuals(settings);
  }

  private setupEventListeners(): void {
    const app = document.getElementById('app');
    if (!app) return;

    // Note drag/resize position saved to YAML
    app.addEventListener('note-position-changed', (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d) this.bridge.send({
        type: 'UPDATE_NOTE_POS',
        name: d.name,
        x: d.x,
        y: d.y,
        width: d.width,
        height: d.height
      });
    });

    // Table colour changed via colour picker — save to YAML
    app.addEventListener('table-color-changed', (e: Event) => {
      const d = (e as CustomEvent<{ tableName: string; color: string }>).detail;
      if (d) this.bridge.send({type: 'UPDATE_TABLE_COLOR', tableName: d.tableName, color: d.color});
    });

    // Note colour changed via colour picker — save to YAML
    app.addEventListener('note-color-changed', (e: Event) => {
      const d = (e as CustomEvent<{ noteId: string; color: string }>).detail;
      if (d) this.bridge.send({type: 'UPDATE_NOTE_COLOR', noteId: d.noteId, color: d.color});
    });
  }
}

new DiagramApplication();