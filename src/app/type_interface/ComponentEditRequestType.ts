// ─── Component Edit Request ──────────────────────────────────
// A locked ItemComponent (one that already produced a document version) can only
// be edited again after Sales/Production approves an edit request for it.
//
// PENDING   → waiting for a reviewer
// APPROVED  → reviewer said yes, the component is unlocked for one more save
// REJECTED  → reviewer said no (review_remark is mandatory)
// CONSUMED  → the approved request was used up by a save (consumed_version_id set)
// CANCELLED → the requester withdrew it before review
export type ComponentEditRequestStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CONSUMED'
    | 'CANCELLED';

export interface ComponentEditRequest {
    edit_request_id: number;
    item_component_id: number;
    work_order_id: number;
    /** doc_version of the component at the time the request was raised */
    base_version_no: number | null;
    reason: string;
    status: ComponentEditRequestStatus;
    reviewed_by: string | null;
    reviewed_date: string | null;
    review_remark: string | null;
    /** version_id produced by the save that consumed this request */
    consumed_version_id: number | null;
    branch_id: number | null;
    created_by: string | null;
    created_date: string;
    // ── Denormalised display fields — only the list/detail endpoints return these ──
    component_name?: string | null;
    work_order_code?: string | null;
}
