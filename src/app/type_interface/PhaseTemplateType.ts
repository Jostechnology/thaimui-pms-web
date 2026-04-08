export type MachineTypeItem = {
    machine_type_id: number;
    type_name: string;
    type_description: string | null;
    is_active: boolean;
    created_date: string;
    updated_date: string;
    created_by: string | null;
    updated_by: string | null;
};

export type MachineTypeListResponse = {
    items: MachineTypeItem[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
};

export type PhaseTemplateItem = {
    phase_template_item_id: number;
    phase_template_id: number;
    phase_name: string;
    sort_order: number;
    machine_type_id: number | null;
    machine_type: MachineTypeItem | null;
};

export type PhaseTemplate = {
    phase_template_id: number;
    template_name: string;
    is_active: boolean;
    items: PhaseTemplateItem[];
    item_count: number;
    created_date: string;
    updated_date: string;
    created_by: string | null;
    updated_by: string | null;
};

export type PhaseTemplateListResponse = {
    items: PhaseTemplate[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
};
