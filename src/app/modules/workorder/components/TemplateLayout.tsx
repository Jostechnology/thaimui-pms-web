// ─────────────────────────────────────────────────────────────
// TemplateLayout.tsx
//
// Recursive layout tree utilities + editor + preview for the
// Template Builder.  A template's visual structure is a tree of
// rows → columns → (rows | sections). The PDF generator service
// is expected to walk this same tree (see ComponentTemplateType.ts
// for the node shapes) so keep the rendering rules documented here
// in sync with the backend renderer.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import type {
    LayoutNode,
    LayoutRowNode,
    LayoutColNode,
    LayoutColChild,
    LayoutSectionNode,
    NodeStyle,
    TemplateSection,
    SectionType,
} from '../../../type_interface/ComponentTemplateType';
import { MAX_LAYOUT_DEPTH } from '../../../type_interface/ComponentTemplateType';

// ─── Key generator (module-local; mirrors TemplateBuilder's) ──
let _k = 0;
export const genLayoutKey = (p: string) => `${p}_${Date.now()}_${++_k}`;

// ─── Factory helpers ─────────────────────────────────────────

/** Create a column with a given span wrapping an (optional) initial child. */
export function makeCol(span = 12, child?: LayoutColChild): LayoutColNode {
    return {
        kind: 'col',
        key: genLayoutKey('col'),
        span,
        children: child ? [child] : [],
    };
}

/** Create an empty row with one full-width column. */
export function makeRow(): LayoutRowNode {
    return {
        kind: 'row',
        key: genLayoutKey('row'),
        children: [makeCol(12)],
    };
}

/** Wrap a legacy TemplateSection into a layout section leaf. */
export function makeSectionNode(section: TemplateSection): LayoutSectionNode {
    return { kind: 'section', key: genLayoutKey('sec'), section };
}

/**
 * Migrate a legacy flat `TemplateSection[]` into a layout tree.
 * Each section becomes one full-width column under the root row so
 * old templates render identically to before.
 */
export function migrateSectionsToLayout(sections: TemplateSection[]): LayoutRowNode {
    return {
        kind: 'row',
        key: genLayoutKey('root'),
        children: sections.map(s => makeCol(12, makeSectionNode(s))),
    };
}

/**
 * Flatten a layout tree back into a `TemplateSection[]` (depth-first).
 * Used so older consumers / legacy save payloads keep working.
 */
export function flattenLayoutToSections(root: LayoutNode): TemplateSection[] {
    const out: TemplateSection[] = [];
    const walk = (n: LayoutNode) => {
        if (n.kind === 'section') { out.push(n.section); return; }
        if (n.kind === 'row') { n.children.forEach(walk); return; }
        // col
        n.children.forEach(walk);
    };
    walk(root);
    return out;
}

// ─── Path-based immutable tree helpers ───────────────────────
// A path is an array of child indices from the root, e.g. [0,1,0]
// means root.children[0].children[1].children[0].

export type Path = number[];

/** Return a deep-ish clone of `root` with the node at `path` replaced by `updater(node)`. */
export function updateAtPath(
    root: LayoutRowNode,
    path: Path,
    updater: (n: LayoutNode) => LayoutNode,
): LayoutRowNode {
    const recur = (node: LayoutNode, depth: number): LayoutNode => {
        if (depth === path.length) return updater(node);
        const idx = path[depth];
        if (node.kind === 'section') return node; // nothing to descend into
        const children = [...(node.children as LayoutNode[])];
        children[idx] = recur(children[idx], depth + 1);
        return { ...node, children } as LayoutNode;
    };
    return recur(root, 0) as LayoutRowNode;
}

/** Remove the node at `path`. If the path is empty, returns root unchanged. */
export function removeAtPath(root: LayoutRowNode, path: Path): LayoutRowNode {
    if (path.length === 0) return root;
    const parentPath = path.slice(0, -1);
    const idx = path[path.length - 1];
    return updateAtPath(root, parentPath, parent => {
        if (parent.kind === 'section') return parent;
        const children = (parent.children as LayoutNode[]).filter((_, i) => i !== idx);
        return { ...parent, children } as LayoutNode;
    });
}

/** Append a child node at the end of the container at `path`. */
export function appendChildAtPath(
    root: LayoutRowNode,
    path: Path,
    child: LayoutNode,
): LayoutRowNode {
    return updateAtPath(root, path, parent => {
        if (parent.kind === 'section') return parent;
        return {
            ...parent,
            children: [...(parent.children as LayoutNode[]), child],
        } as LayoutNode;
    });
}

/**
 * Count how many `row` ancestors wrap the node at `path` (including the
 * root).  Used to enforce MAX_LAYOUT_DEPTH when offering a "+ Row" button.
 */
export function rowDepthAtPath(root: LayoutRowNode, path: Path): number {
    let depth = 0;
    let node: LayoutNode = root;
    if (node.kind === 'row') depth += 1;
    for (const idx of path) {
        if (node.kind === 'section') break;
        node = (node.children as LayoutNode[])[idx];
        if (node.kind === 'row') depth += 1;
    }
    return depth;
}

// ─── Style → CSS conversion ──────────────────────────────────

/** Convert a NodeStyle into an inline CSS style object (shared by editor + preview). */
export function styleToCss(style?: NodeStyle): React.CSSProperties {
    if (!style) return {};
    const fs =
        style.fontSize === 'sm' ? '0.75rem' :
        style.fontSize === 'lg' ? '1.1rem' :
        style.fontSize === 'md' ? '0.9rem' : undefined;
    return {
        fontSize: fs,
        textAlign: style.align,
        padding: style.padding ? `${style.padding}px` : undefined,
        fontWeight: style.bold ? 700 : undefined,
    };
}

// ─── Style popover (tiny inline editor) ──────────────────────

const StylePopover: React.FC<{
    style?: NodeStyle;
    onChange: (s: NodeStyle) => void;
    onClose: () => void;
}> = ({ style, onChange, onClose }) => {
    const s = style || {};
    return (
        <div className='border rounded bg-white shadow-sm p-3 mb-2' style={{ fontSize: '0.8rem' }}>
            <div className='d-flex justify-content-between align-items-center mb-2'>
                <span className='fw-bold'>สไตล์</span>
                <button className='btn btn-sm btn-icon btn-light' onClick={onClose}>
                    <i className='bi bi-x-lg'></i>
                </button>
            </div>
            <div className='d-flex flex-wrap gap-2'>
                <select className='form-select form-select-sm w-auto'
                    value={s.fontSize || ''}
                    onChange={e => onChange({ ...s, fontSize: (e.target.value || undefined) as NodeStyle['fontSize'] })}>
                    <option value=''>ขนาด (default)</option>
                    <option value='sm'>เล็ก</option>
                    <option value='md'>กลาง</option>
                    <option value='lg'>ใหญ่</option>
                </select>
                <select className='form-select form-select-sm w-auto'
                    value={s.align || ''}
                    onChange={e => onChange({ ...s, align: (e.target.value || undefined) as NodeStyle['align'] })}>
                    <option value=''>จัดชิด (default)</option>
                    <option value='left'>ซ้าย</option>
                    <option value='center'>กลาง</option>
                    <option value='right'>ขวา</option>
                </select>
                <input type='number' className='form-control form-control-sm' placeholder='padding' min={0} max={60}
                    style={{ width: 90 }}
                    value={s.padding ?? ''}
                    onChange={e => onChange({ ...s, padding: e.target.value ? parseInt(e.target.value) : undefined })} />
                <div className='form-check form-check-sm align-self-center'>
                    <input className='form-check-input' type='checkbox' checked={!!s.bold}
                        onChange={e => onChange({ ...s, bold: e.target.checked || undefined })} />
                    <label className='form-check-label ms-1'>หนา</label>
                </div>
            </div>
        </div>
    );
};

// ─── Editor recursive components ─────────────────────────────
// These components only manage the layout tree structure and
// style.  The leaf `section` editor (header, table, …) is passed
// in via `renderSectionEditor` so this file stays decoupled from
// the section-specific forms in TemplateBuilder.tsx.

export interface LayoutEditorProps {
    root: LayoutRowNode;
    onChange: (next: LayoutRowNode) => void;
    /** Renders the inline editor UI for a given leaf TemplateSection. */
    renderSectionEditor: (s: TemplateSection, onChange: (next: TemplateSection) => void) => React.ReactNode;
    /** Factory for a default section of a given type (reused from TemplateBuilder). */
    createDefaultSection: (type: SectionType) => TemplateSection;
    sectionTypeLabels: Record<SectionType, string>;
    sectionTypeIcons: Record<SectionType, string>;
}

export const LayoutEditor: React.FC<LayoutEditorProps> = (props) => {
    // The root is always a row — render it straight away.
    return (
        <RowEditor
            node={props.root}
            path={[]}
            depth={1}
            root={props.root}
            onChange={props.onChange}
            renderSectionEditor={props.renderSectionEditor}
            createDefaultSection={props.createDefaultSection}
            sectionTypeLabels={props.sectionTypeLabels}
            sectionTypeIcons={props.sectionTypeIcons}
        />
    );
};

// Internal shared shape threaded down through the recursive editor.
// `root` is always the current layout so that path-based updates compose.
type CommonProps = {
    root: LayoutRowNode;
    onChange: (next: LayoutRowNode) => void;
    renderSectionEditor: LayoutEditorProps['renderSectionEditor'];
    createDefaultSection: LayoutEditorProps['createDefaultSection'];
    sectionTypeLabels: LayoutEditorProps['sectionTypeLabels'];
    sectionTypeIcons: LayoutEditorProps['sectionTypeIcons'];
    path: Path;
    depth: number;
};

// ── Row editor ──
const RowEditor: React.FC<{ node: LayoutRowNode } & CommonProps> = (p) => {
    const { node, path, depth, onChange } = p;
    const [showStyle, setShowStyle] = useState(false);
    const isRoot = path.length === 0;

    const update = (updater: (n: LayoutNode) => LayoutNode) =>
        onChange(updateAtPath(p.root, path, updater));

    const addColumn = () => {
        onChange(appendChildAtPath(p.root, path, makeCol(Math.max(1, Math.floor(12 / (node.children.length + 1))))));
    };

    return (
        <div className='border border-primary border-opacity-25 rounded p-2 mb-2 bg-primary bg-opacity-5'
            style={styleToCss(node.style)}>
            <div className='d-flex align-items-center justify-content-between mb-2'>
                <span className='fs-8 fw-bold text-primary'>
                    <i className='bi bi-layout-three-columns me-1'></i>Row (depth {depth})
                </span>
                <div className='d-flex gap-1'>
                    <button className='btn btn-sm btn-icon btn-light' title='สไตล์'
                        onClick={() => setShowStyle(s => !s)}>
                        <i className='bi bi-palette'></i>
                    </button>
                    {!isRoot && (
                        <button className='btn btn-sm btn-icon btn-light-danger' title='ลบ Row'
                            onClick={() => onChange(removeAtPath(p.root, path))}>
                            <i className='bi bi-trash'></i>
                        </button>
                    )}
                </div>
            </div>
            {showStyle && (
                <StylePopover style={node.style} onClose={() => setShowStyle(false)}
                    onChange={s => update(n => ({ ...(n as LayoutRowNode), style: s }))} />
            )}
            <div className='d-flex flex-wrap' style={{ gap: node.gap ?? 8 }}>
                {node.children.map((col, idx) => (
                    <div key={col.key} style={{ flex: `0 0 calc(${(col.span / 12) * 100}% - ${node.gap ?? 8}px)` }}>
                        <ColEditor
                            node={col}
                            path={[...path, idx]}
                            depth={depth}
                            root={p.root}
                            onChange={p.onChange}
                            renderSectionEditor={p.renderSectionEditor}
                            createDefaultSection={p.createDefaultSection}
                            sectionTypeLabels={p.sectionTypeLabels}
                            sectionTypeIcons={p.sectionTypeIcons}
                        />
                    </div>
                ))}
            </div>
            <button className='btn btn-sm btn-light-primary mt-2' onClick={addColumn}>
                <i className='bi bi-plus me-1'></i>เพิ่ม Column
            </button>
        </div>
    );
};

// ── Column editor ──
const ColEditor: React.FC<{ node: LayoutColNode } & CommonProps> = (p) => {
    const { node, path, depth, onChange } = p;
    const [showStyle, setShowStyle] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const update = (updater: (n: LayoutNode) => LayoutNode) =>
        onChange(updateAtPath(p.root, path, updater));

    const canAddRow = depth < MAX_LAYOUT_DEPTH;

    const addRow = () => {
        onChange(appendChildAtPath(p.root, path, makeRow()));
    };
    const addSection = (t: SectionType) => {
        onChange(appendChildAtPath(p.root, path, makeSectionNode(p.createDefaultSection(t))));
        setShowAddMenu(false);
    };

    return (
        <div className='border rounded p-2 bg-white h-100' style={styleToCss(node.style)}>
            <div className='d-flex align-items-center justify-content-between mb-2'>
                <div className='d-flex align-items-center gap-1'>
                    <span className='fs-8 text-muted'>Col</span>
                    <select className='form-select form-select-sm py-0'
                        style={{ width: 82, height: 24, fontSize: '0.75rem' }}
                        value={node.span}
                        onChange={e => update(n => ({ ...(n as LayoutColNode), span: parseInt(e.target.value) }))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(v =>
                            <option key={v} value={v}>{v}/12</option>
                        )}
                    </select>
                </div>
                <div className='d-flex gap-1'>
                    <button className='btn btn-sm btn-icon btn-light' title='สไตล์'
                        onClick={() => setShowStyle(s => !s)}>
                        <i className='bi bi-palette'></i>
                    </button>
                    <button className='btn btn-sm btn-icon btn-light-danger' title='ลบ Column'
                        disabled={p.path.length === 0} // col directly under root row — path length==1, still allowed
                        onClick={() => onChange(removeAtPath(p.root, path))}>
                        <i className='bi bi-trash'></i>
                    </button>
                </div>
            </div>
            {showStyle && (
                <StylePopover style={node.style} onClose={() => setShowStyle(false)}
                    onChange={s => update(n => ({ ...(n as LayoutColNode), style: s }))} />
            )}
            <div>
                {node.children.map((child, idx) => {
                    const childPath = [...path, idx];
                    const common = {
                        root: p.root,
                        onChange: p.onChange,
                        renderSectionEditor: p.renderSectionEditor,
                        createDefaultSection: p.createDefaultSection,
                        sectionTypeLabels: p.sectionTypeLabels,
                        sectionTypeIcons: p.sectionTypeIcons,
                    };
                    if (child.kind === 'row') {
                        return (
                            <RowEditor key={child.key}
                                node={child}
                                path={childPath}
                                depth={depth + 1}
                                {...common}
                            />
                        );
                    }
                    return (
                        <SectionNodeEditor key={child.key}
                            node={child}
                            path={childPath}
                            depth={depth}
                            {...common}
                        />
                    );
                })}
            </div>
            <div className='d-flex gap-1 mt-2 flex-wrap'>
                {canAddRow && (
                    <button className='btn btn-sm btn-light-primary' onClick={addRow}>
                        <i className='bi bi-plus me-1'></i>Row
                    </button>
                )}
                <button className='btn btn-sm btn-light-success' onClick={() => setShowAddMenu(s => !s)}>
                    <i className='bi bi-plus me-1'></i>Section
                </button>
            </div>
            {showAddMenu && (
                <div className='border rounded p-2 mt-2 bg-light d-flex flex-wrap gap-1'>
                    {(Object.keys(p.sectionTypeLabels) as SectionType[]).map(t => (
                        <button key={t}
                            className='btn btn-sm btn-outline btn-outline-dashed btn-outline-primary'
                            onClick={() => addSection(t)}>
                            <i className={`bi ${p.sectionTypeIcons[t]} me-1`}></i>
                            {p.sectionTypeLabels[t]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Section leaf editor ──
const SectionNodeEditor: React.FC<{ node: LayoutSectionNode } & CommonProps> = (p) => {
    const { node, path, onChange } = p;
    const [expanded, setExpanded] = useState(false);
    const [showStyle, setShowStyle] = useState(false);

    const update = (updater: (n: LayoutNode) => LayoutNode) =>
        onChange(updateAtPath(p.root, path, updater));

    const updateSection = (s: TemplateSection) =>
        update(n => ({ ...(n as LayoutSectionNode), section: s }));

    const title =
        'title' in node.section && (node.section as any).title
            ? (node.section as any).title
            : p.sectionTypeLabels[node.section.type];

    return (
        <div className='card shadow-sm mb-2' style={styleToCss(node.style)}>
            <div className='card-header py-2 px-3 d-flex align-items-center justify-content-between'
                style={{ cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
                <div>
                    <i className={`bi ${p.sectionTypeIcons[node.section.type]} me-2 text-primary`}></i>
                    <span className='fw-bold fs-8'>{p.sectionTypeLabels[node.section.type]}</span>
                    <span className='text-muted fs-8 ms-2'>— {title}</span>
                </div>
                <div className='d-flex gap-1' onClick={e => e.stopPropagation()}>
                    <button className='btn btn-sm btn-icon btn-light' title='สไตล์'
                        onClick={() => setShowStyle(s => !s)}>
                        <i className='bi bi-palette'></i>
                    </button>
                    <button className='btn btn-sm btn-icon btn-light-danger' title='ลบ'
                        onClick={() => onChange(removeAtPath(p.root, path))}>
                        <i className='bi bi-trash'></i>
                    </button>
                </div>
            </div>
            {showStyle && (
                <div className='px-3 pt-2'>
                    <StylePopover style={node.style} onClose={() => setShowStyle(false)}
                        onChange={s => update(n => ({ ...(n as LayoutSectionNode), style: s }))} />
                </div>
            )}
            {expanded && (
                <div className='card-body border-top pt-3'>
                    {p.renderSectionEditor(node.section, updateSection)}
                </div>
            )}
        </div>
    );
};

// ─── Preview recursive components ────────────────────────────

export interface LayoutPreviewProps {
    root: LayoutRowNode;
    renderSectionPreview: (s: TemplateSection) => React.ReactNode;
}

export const LayoutPreview: React.FC<LayoutPreviewProps> = ({ root, renderSectionPreview }) => {
    const renderNode = (node: LayoutNode): React.ReactNode => {
        if (node.kind === 'section') {
            return (
                <div key={node.key} style={styleToCss(node.style)}>
                    {renderSectionPreview(node.section)}
                </div>
            );
        }
        if (node.kind === 'row') {
            return (
                <div key={node.key}
                    className='d-flex flex-wrap'
                    style={{ gap: node.gap ?? 8, ...styleToCss(node.style) }}>
                    {node.children.map((col, i) => (
                        <div key={col.key}
                            style={{ flex: `0 0 calc(${(col.span / 12) * 100}% - ${node.gap ?? 8}px)` }}>
                            {renderNode(col)}
                        </div>
                    ))}
                </div>
            );
        }
        // col
        return (
            <div key={node.key} style={styleToCss(node.style)}>
                {node.children.map(child => (
                    <div key={child.key} className='mb-3'>{renderNode(child)}</div>
                ))}
            </div>
        );
    };
    return <>{renderNode(root)}</>;
};
