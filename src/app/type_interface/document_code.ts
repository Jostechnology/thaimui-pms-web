export interface DocumentCode {
    document_code_id: number;
    gen_number_type: string;
    description: string;
}

export interface DocumentCodeConfig {
    gen_number_id?: number;
    gen_number_type: string;
    gen_number_prefix: string;
    gen_number_format: string;
    gen_number_current: number;
    year_buddhist: boolean;
}

export interface DocumentCodeWithConfig extends DocumentCode {
    config?: DocumentCodeConfig;
    isConfigured: boolean;
}

export interface DocumentCodeResponse {
    success: boolean;
    all: DocumentCode[];
    own: DocumentCodeConfig[];
    message?: string;
}
