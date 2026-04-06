// ─── Section Types ───────────────────────────────────────────
export type SectionType =
    | 'header'
    | 'material_table'
    | 'key_value'
    | 'checkbox_group'
    | 'image_select'
    | 'signature'
    | 'note'
    | 'spacer'
    | 'fixed_row_table'
    | 'image_upload';

// ─── Header Section ──────────────────────────────────────────
export interface HeaderField {
    key: string;
    label: string;
    type: 'text' | 'date' | 'number';
    defaultValue?: string;
    colspan?: number;
}

export interface HeaderSection {
    type: 'header';
    key: string;
    title: string;
    fields: HeaderField[];
    columns?: number; // grid columns (default 4)
}

// ─── Table Section ───────────────────────────────────────────
export interface TableColumn {
    key: string;
    label: string;
    width?: string;
    type: 'text' | 'number' | 'select';
    options?: string[]; // for select type
}

export interface TableSection {
    type: 'material_table';
    key: string;
    title: string;
    columns: TableColumn[];
    defaultRows?: number;
}

// ─── Key-Value Section ───────────────────────────────────────
export interface KeyValueField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
    unit?: string;
    defaultValue?: string;
    colspan?: number;
}

export interface KeyValueSection {
    type: 'key_value';
    key: string;
    title: string;
    fields: KeyValueField[];
    columns?: number;
}

// ─── Checkbox Group Section ──────────────────────────────────
export interface CheckboxItem {
    key: string;
    label: string;
    defaultChecked?: boolean;
    hasTextField?: boolean;
    textFieldLabel?: string;
}

export interface CheckboxGroupSection {
    type: 'checkbox_group';
    key: string;
    title: string;
    items: CheckboxItem[];
    columns?: number;
}

// ─── Image Select Section ────────────────────────────────────
export interface ImageOption {
    key: string;
    label: string;
    imageUrl?: string;
}

export interface ImageSelectSection {
    type: 'image_select';
    key: string;
    title: string;
    options: ImageOption[];
    multiple?: boolean;
}

// ─── Signature Section ───────────────────────────────────────
export interface SignatureField {
    key: string;
    label: string;
    role?: string;
}

export interface SignatureSection {
    type: 'signature';
    key: string;
    title: string;
    fields: SignatureField[];
}

// ─── Note Section ────────────────────────────────────────────
export interface NoteSection {
    type: 'note';
    key: string;
    title: string;
    placeholder?: string;
}

// ─── Fixed Row Table Section ─────────────────────────────────
export interface FixedRowTableColumn {
    key: string;
    label: string;
    width?: string;
}

export type FixedRowCellType = 'checkbox' | 'text';

export interface FixedRowCell {
    columnKey: string;
    cellType: FixedRowCellType;
}

export interface FixedRowTableRow {
    key: string;
    label: string;
    cells: FixedRowCell[];
}

export interface FixedRowTableSection {
    type: 'fixed_row_table';
    key: string;
    title: string;
    columns: FixedRowTableColumn[];
    rows: FixedRowTableRow[];
}

// ─── Image Upload Section ───────────────────────────────────
export interface ImageUploadSection {
    type: 'image_upload';
    key: string;
    title: string;
    maxImages?: number;
    description?: string;
}

// ─── Spacer Section ──────────────────────────────────────────
export interface SpacerSection {
    type: 'spacer';
    key: string;
    height?: number;
}

// ─── Union Type ──────────────────────────────────────────────
export type TemplateSection =
    | HeaderSection
    | TableSection // material_table
    | KeyValueSection
    | CheckboxGroupSection
    | ImageSelectSection
    | SignatureSection
    | NoteSection
    | SpacerSection
    | FixedRowTableSection
    | ImageUploadSection;

// ─── Layout Tree (recursive row/column/section containers) ───
// The PDF generator walks this tree top-down:
//   - `row` nodes → horizontal container; children are columns laid out side-by-side.
//   - `col` nodes → vertical container with a bootstrap-style `span` (1..12 of parent row).
//                   Children can be rows (for further nesting) OR section leaves.
//   - `section` nodes → leaf that holds a single legacy `TemplateSection`.
// Every node may carry an optional `NodeStyle` used to tweak text size / alignment
// / padding in both the web preview and PDF output.

/** Styling applied to a layout node (and inherited visually by its rendered content). */
export interface NodeStyle {
    fontSize?: 'sm' | 'md' | 'lg';        // sm≈0.75rem, md≈0.9rem, lg≈1.1rem
    align?: 'left' | 'center' | 'right';  // text-align
    padding?: number;                     // px, applied as inner padding
    bold?: boolean;
}

export interface LayoutRowNode {
    kind: 'row';
    key: string;
    children: LayoutColNode[];            // a row's direct children are always columns
    gap?: number;                         // px gap between columns (default 8)
    style?: NodeStyle;
}

export interface LayoutColNode {
    kind: 'col';
    key: string;
    span: number;                         // 1..12 (bootstrap grid units within parent row)
    children: LayoutColChild[];           // a column holds rows and/or sections, stacked vertically
    style?: NodeStyle;
}

export interface LayoutSectionNode {
    kind: 'section';
    key: string;
    section: TemplateSection;             // leaf — the legacy section definition to render
    style?: NodeStyle;
}

/** What a column can contain: further rows (nesting) or section leaves. */
export type LayoutColChild = LayoutRowNode | LayoutSectionNode;

/** Any node in the layout tree. */
export type LayoutNode = LayoutRowNode | LayoutColNode | LayoutSectionNode;

/** Max number of row-nesting layers allowed (row > col > row > col > row > col > section). */
export const MAX_LAYOUT_DEPTH = 3;

// ─── Template ────────────────────────────────────────────────
export interface ComponentTemplate {
    component_template_id: number;
    name: string;
    /** Legacy flat section list — still populated on save for back-compat. */
    sections: TemplateSection[];
    /** New recursive layout tree. If present, prefer this over `sections` when rendering. */
    layout?: LayoutRowNode;
    created_date?: string;
    updated_date?: string;
    created_by?: string;
    updated_by?: string;
}
