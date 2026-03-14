// web/src/core/communication/protocol.ts

import type {DbTable, DbRelationship, DbProject, DbNote} from '../../models/types.ts';

export interface SchemaPayload {
  tables: DbTable[];
  relationships: DbRelationship[];
  projectSettings: DbProject;
  notes: DbNote[];
}

export interface ViewSettings {
  lineStyle: string;
  showGrid: boolean;
  gridSize: number;
  showTableNotes: boolean;
  showFieldNotes: boolean;
  tableNoteMaxLines: number;
  fieldNoteMaxLines: number;
}

export type ServerMessage =
    | SchemaUpdateMessage
    | ThemeUpdateMessage
    | SettingsUpdateMessage;

export interface SchemaUpdateMessage {
  type: 'UPDATE_SCHEMA_PAYLOAD';
  payload: SchemaPayload;
  settings?: ViewSettings;
}

export interface ThemeUpdateMessage {
  type: 'UPDATE_THEME';
  theme: 'dark' | 'light';
}

export interface SettingsUpdateMessage {
  type: 'UPDATE_GLOBAL_SETTINGS';
  lineStyle: string;
  showGrid: boolean;
  gridSize: number;
  showTableNotes: boolean;
  showFieldNotes: boolean;
  tableNoteMaxLines: number;
  fieldNoteMaxLines: number;
}

export type ClientMessage =
    | LogMessage
    | ReadyMessage
    | TablePositionUpdateMessage
    | NotePositionUpdateMessage
    | TableColorUpdateMessage
    | NoteColorUpdateMessage;

export interface LogMessage {
  type: 'LOG';
  level: string;
  message: string;
}

export interface ReadyMessage {
  type: 'READY';
}

export interface TablePositionUpdateMessage {
  type: 'UPDATE_TABLE_POS';
  tableName: string;
  x: number;
  y: number;
  width?: number;
}

export interface NotePositionUpdateMessage {
  type: 'UPDATE_NOTE_POS';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TableColorUpdateMessage {
  type: 'UPDATE_TABLE_COLOR';
  /** The table's raw SQL name (same as data-table-name on the DOM element). */
  tableName: string;
  color: string;
}

export interface NoteColorUpdateMessage {
  type: 'UPDATE_NOTE_COLOR';
  /** The note's `id` field from the YAML. */
  noteId: string;
  color: string;
}