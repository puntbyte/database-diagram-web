// web/src/models/types.ts

export interface DbProject {
  zoom?: number; panX?: number; panY?: number;
  databaseType?: string; note?: string;
  [key: string]: any;
}

export interface DbTable {
  id: string; schema: string; name: string;
  alias?: string; fields: DbField[];
  note?: string; color?: string; width?: number;
  horizontal?: number; vertical?: number;
  settings?: Record<string, string>;
  indexes?: DbIndex[];
}

export interface DbField {
  name: string; type: string;
  isPrimaryKey: boolean; isForeignKey: boolean;
  isUnique: boolean; isNotNull: boolean;
  note?: string; default?: string;
  enumValues?: string[];
  reference?: DbReference;
  typeCategory?: string;
}

export interface DbReference {
  symbol: string; toSchema: string; toTable: string; toColumn: string;
}

export type Cardinality = '1:1' | '1:n' | 'n:1' | 'm:n';

export interface WayPoint {
  x: number; y: number; from: 'source' | 'target';
}

export interface DbRelationship {
  fromSchema: string; fromTable: string; fromColumns: string[];
  toSchema: string;   toTable: string;   toColumns: string[];
  type: Cardinality;
  settings?: Record<string, string>;
  sourceAnchor?: 'left' | 'right';
  targetAnchor?: 'left' | 'right';
  waypoints?: WayPoint[];
}

export interface DbIndex {
  columns: string[]; settings?: Record<string, string>; raw?: string;
}

export interface DbNote {
  id: string;
  name: string;
  content: string;
  horizontal: number;
  vertical: number;
  width: number;
  height?: number;
  color?: string;
  /** Optional callout target: "table.column" or just "table" */
  target?: string;
  /** Side of the target element to anchor the callout arrow */
  targetAnchor?: 'left' | 'right' | 'top' | 'bottom';
}