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

// Material item type categories (from THMUI ItemTypes reference)
export type MaterialItemType =
    | 'SLING' | 'CHAIN' | 'FERRULE'
    | 'BRILUBE' | 'CLAMP' | 'CLIP' | 'CONNECTING' | 'EYEBOLT' | 'FITTING'
    | 'HOOK' | 'MASTERLINK' | 'PIPE' | 'ROPE' | 'SHACKLE' | 'HOIST'
    | 'LATCHKIT' | 'BELT' | 'LOADBINDER' | 'SPELTER' | 'SWAGE' | 'THIMBLE'
    | 'TURNBUCKLE' | 'WEBBING' | 'WEDGE' | 'WIRELOCK' | 'SWIVELS' | 'OTHER';

export const MATERIAL_ITEM_TYPES: { value: MaterialItemType; label: string; nameTh: string }[] = [
    { value: 'SLING', label: 'SLING', nameTh: 'ลวดสลิง' },
    { value: 'CHAIN', label: 'CHAIN', nameTh: 'โซ่' },
    { value: 'FERRULE', label: 'FERRULE', nameTh: 'ปลอก' },
    { value: 'BRILUBE', label: 'BRILUBE', nameTh: 'เคลือบกันสนิม' },
    { value: 'CLAMP', label: 'CLAMP', nameTh: 'ตัวจับชิ้นงาน' },
    { value: 'CLIP', label: 'CLIP', nameTh: 'กิ๊บจับ' },
    { value: 'CONNECTING', label: 'CONNECTING', nameTh: 'แฮมเมอร์ล็อค' },
    { value: 'EYEBOLT', label: 'EYEBOLT', nameTh: 'ห่วงมีเกลียว' },
    { value: 'FITTING', label: 'FITTING', nameTh: 'อุปกรณ์ท่อ' },
    { value: 'HOOK', label: 'HOOK', nameTh: 'ตะขอ, snatch blocks' },
    { value: 'MASTERLINK', label: 'MASTERLINK', nameTh: 'มาสเตอร์ลิ้งค์' },
    { value: 'PIPE', label: 'PIPE', nameTh: 'ท่อ' },
    { value: 'ROPE', label: 'ROPE', nameTh: 'เชือก' },
    { value: 'SHACKLE', label: 'SHACKLE', nameTh: 'สะเก็น' },
    { value: 'HOIST', label: 'HOIST', nameTh: 'รอก, อุปกรณ์รอก, เครนบล็อก' },
    { value: 'LATCHKIT', label: 'LATCHKIT', nameTh: 'อุปกรณ์ตะขอ' },
    { value: 'BELT', label: 'BELT', nameTh: 'สายพาน' },
    { value: 'LOADBINDER', label: 'LOADBINDER', nameTh: 'สเตย์รัดโซ่' },
    { value: 'SPELTER', label: 'SPELTER', nameTh: 'หัวหล่อ' },
    { value: 'SWAGE', label: 'SWAGE', nameTh: 'สตัด' },
    { value: 'THIMBLE', label: 'THIMBLE', nameTh: 'หัวใจ' },
    { value: 'TURNBUCKLE', label: 'TURNBUCKLE', nameTh: 'เกลียวเร่ง' },
    { value: 'WEBBING', label: 'WEBBING', nameTh: 'สลิงผ้าใบ, สายรัด, round sling' },
    { value: 'WEDGE', label: 'WEDGE', nameTh: 'ตัวล็อคสลิง' },
    { value: 'WIRELOCK', label: 'WIRELOCK', nameTh: 'น้ำยาหล่อหัวสลิง' },
    { value: 'SWIVELS', label: 'SWIVELS', nameTh: 'ตัวต่อแบบหมุน' },
    { value: 'OTHER', label: 'OTHER', nameTh: 'สินค้าที่ไม่เข้ากลุ่ม' },
];

// One material row in the template — pre-defines the item type for that slot.
// Actual material/value is filled in later at work-order time.
export interface MaterialRow {
    key: string;
    itemType: MaterialItemType;
    slingLegs?: number; // only used when itemType === 'SLING'
}

export interface TableSection {
    type: 'material_table';
    key: string;
    title: string;
    columns: TableColumn[]; // legacy; kept for back-compat rendering
    rows?: MaterialRow[];   // new: mixed-type predefined rows
    // legacy (pre-mixed-rows), kept so old templates still load:
    defaultRows?: number;
    itemType?: MaterialItemType;
    slingLegs?: number;
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
