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
    params_schema: {
        params: Record<string, ReportParamSpec>;
    };
}

export interface ReportPreviewResult<TRow = Record<string, unknown>, TSummary = Record<string, unknown>> {
    summary: TSummary;
    rows: TRow[];
    total: number;
    page: number;
    pages: number;
    per_page: number;
    // Extra top-level keys passed through from compose() (breakdown/gantt/...)
    // computed over the full result set, not paginated.
    breakdown?: Record<string, unknown>;
    [key: string]: unknown;
}
