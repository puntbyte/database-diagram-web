// web/src/components/widgets/field-widget.ts

import type { DbField } from '../../models/types.ts';
import { Icons } from '../ui/icons.ts';

const CSS = {
  row:            'db-row',
  indexedRow:     'indexed-row',
  mainRow:        'row-main',
  leftSection:    'row-left',
  rightSection:   'row-right',
  keyIcon:        'key-icon',
  pk: 'pk', fk: 'fk', pkFk: 'pk-fk', empty: 'empty',
  fieldName:      'field-name',
  fieldNote:      'field-note',
  typeContainer:  'type-container',
  fieldType:      'field-type',
  fieldDefault:   'field-default',
  constrainedType:'constrained-type',
  badge:          'badge',
} as const;

type KeyType = 'pk' | 'fk' | 'pkFk' | null;

export class FieldWidget {
  static create(field: DbField, tableId: string): HTMLElement {
    const row = document.createElement('div');
    row.className = CSS.row;
    row.id = `col-${tableId}-${field.name}`;
    if (field.isUnique) row.classList.add(CSS.indexedRow);

    const mainRow = document.createElement('div');
    mainRow.className = CSS.mainRow;
    mainRow.append(this.buildLeft(field), this.buildRight(field));
    row.appendChild(mainRow);

    if (field.note) {
      const note = document.createElement('div');
      note.className = CSS.fieldNote;
      note.textContent = field.note;
      row.appendChild(note);
    }

    return row;
  }

  // ── Left: key icon + name (protected from truncation) ─────────────────────

  private static buildLeft(field: DbField): HTMLElement {
    const section = document.createElement('div');
    section.className = CSS.leftSection;
    section.append(this.buildKeyIcon(field), this.buildName(field));
    return section;
  }

  private static buildName(field: DbField): HTMLElement {
    const el = document.createElement('span');
    el.className = CSS.fieldName;
    el.textContent = field.name;
    return el;
  }

  private static buildKeyIcon(field: DbField): HTMLElement {
    const el = document.createElement('span');
    el.className = CSS.keyIcon;
    const kt = this.keyType(field);
    if (kt) {
      el.innerHTML = Icons.key;
      el.classList.add(CSS[kt]);
      el.title = { pk: 'Primary Key', fk: 'Foreign Key', pkFk: 'Primary & Foreign Key' }[kt];
    } else {
      el.classList.add(CSS.empty);
    }
    return el;
  }

  private static keyType(field: DbField): KeyType {
    if (field.isPrimaryKey && field.isForeignKey) return 'pkFk';
    if (field.isPrimaryKey) return 'pk';
    if (field.isForeignKey) return 'fk';
    return null;
  }

  // ── Right: badges + type + default (right side truncates before name) ──────

  private static buildRight(field: DbField): HTMLElement {
    const section = document.createElement('div');
    section.className = CSS.rightSection;
    section.append(
        ...this.buildBadges(field),
        this.buildTypeChip(field),
    );
    // Default chip comes after the type chip, closest to the right edge.
    if (field.default) {
      section.appendChild(this.buildDefaultChip(field.default));
    }
    return section;
  }

  // Type chip — just the type, no default appended.
  private static buildTypeChip(field: DbField): HTMLElement {
    const container = document.createElement('div');
    container.className = CSS.typeContainer;
    const chip = document.createElement('span');
    chip.className = CSS.fieldType;
    if (field.isUnique) chip.classList.add(CSS.constrainedType);
    chip.textContent = field.type;
    container.appendChild(chip);
    return container;
  }

  // FIX: Default gets its own distinct chip instead of being appended with ':'.
  // Shows `= value` with a warm muted background so it reads as an annotation,
  // not as part of the type name.
  private static buildDefaultChip(defaultValue: string): HTMLElement {
    const chip = document.createElement('span');
    chip.className = CSS.fieldDefault;
    chip.textContent = `:${defaultValue}`;
    chip.title = `Default: ${defaultValue}`;
    return chip;
  }

  private static buildBadges(field: DbField): HTMLElement[] {
    const badges: HTMLElement[] = [];

    if (field.typeCategory) {
      const isEnum = field.typeCategory === 'ENUM';
      const b = this.badge(field.typeCategory, isEnum ? 'enum' : 'custom-type');
      b.title = isEnum && field.enumValues?.length
          ? `Values: ${field.enumValues.join(', ')}`
          : `Type: ${field.type}`;
      badges.push(b);
    }

    if (field.isUnique)  badges.push(this.badge('UQ', 'unique'));
    if (field.isNotNull) badges.push(this.badge('NN', 'not-null'));

    return badges;
  }

  private static badge(text: string, cls: string): HTMLElement {
    const el = document.createElement('span');
    el.className = `${CSS.badge} ${cls}`;
    el.textContent = text;
    return el;
  }
}