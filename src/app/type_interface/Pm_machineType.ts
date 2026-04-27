export type Machine = {
    machine_id: number;
    machine_code: string;
    machine_name: string;
    machine_description: string | null;
    manufacturer: string | null;
    purchase_date: string | null;
    purchase_price: number | null;
    useful_life_years: number | null;
    working_hours_per_day: number | null;
    status: string;
    is_active: boolean;
    machine_type?: { type_name: string } | null;
    created_by: string | null;
    updated_by: string | null;
    created_date: string;
    updated_date: string;
}

export type PmMachine = {
    maintenance_id: number;
    machine_id: number;
    maintenance_date: string;
    maintenance_type: string; // Preventive, Corrective
    description: string | null;
    performed_by: string | null;
    machine?: Machine;
    created_date: string;
    updated_date: string;
}