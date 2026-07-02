export interface ReportParamSpec {
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: unknown;
}

export interface ReportDefinition {
    code: string;
    name: string;
    description: string;
    category: string;
    params_schema_json: {
        params: Record<string, ReportParamSpec>;
    };
    supported_formats: string[];
    definition_version: number;
}

export interface ReportPagination {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
}

export interface ReportPreviewResult<TRow = Record<string, unknown>, TSummary = Record<string, unknown>> {
    // BE render() default shape: {meta, rows}. preview_run adds `pagination`
    // and passes through any extra top-level keys (breakdown/gantt/...).
    meta: TSummary;
    rows: TRow[];
    pagination?: ReportPagination;
    breakdown?: Record<string, unknown>;
    [key: string]: unknown;
}

export type ReportRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ReportRunDetail {
    run_id: string;
    definition_code: string;
    definition_version: number;
    params_json: Record<string, unknown>;
    status: ReportRunStatus;
    row_count: number | null;
    runtime_ms: number | null;
    error_message: string | null;
    result_json: Record<string, unknown> | null;
    file_object_keys: Record<string, string> | null;
    file_urls: Record<string, string> | null;
}
