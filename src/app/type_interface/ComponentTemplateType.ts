// ─── Section Types ───────────────────────────────────────────
export type SectionType =
    | 'header'
    | 'table'
    | 'key_value'
    | 'checkbox_group'
    | 'image_select'
    | 'signature'
    | 'note'
    | 'spacer';

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
    type: 'table';
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

// ─── Spacer Section ──────────────────────────────────────────
export interface SpacerSection {
    type: 'spacer';
    key: string;
    height?: number;
}

// ─── Union Type ──────────────────────────────────────────────
export type TemplateSection =
    | HeaderSection
    | TableSection
    | KeyValueSection
    | CheckboxGroupSection
    | ImageSelectSection
    | SignatureSection
    | NoteSection
    | SpacerSection;

// ─── Template ────────────────────────────────────────────────
export interface ComponentTemplate {
    component_template_id: number;
    name: string;
    sections: TemplateSection[];
    created_date?: string;
    updated_date?: string;
    created_by?: string;
    updated_by?: string;
}
