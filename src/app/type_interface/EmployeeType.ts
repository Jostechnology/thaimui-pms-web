export interface EmployeeShift {
  employee_shift_id?: number;
  employee_id?: number;
  start_time?: string;
  end_time?: string;
  work_days?: string;
}

export interface Employee {
  employee_id: number;
  employee_first_name: string;
  employee_last_name: string;
  phone_number: string;
  email: string;
  address: string;
  status: string;
  citizen_id?: string;
  user_id?: number;
  is_active?: boolean;
  base_salary?: number;
  day_rate?: number;
  ot_hourly_rate?: number;
  shift_override?: EmployeeShift | null;
  created_date?: string;
  updated_date?: string;
}

export interface EmployeeSalaryHistory {
  salary_history_id: number;
  employee_id: number;
  old_base_salary: number;
  new_base_salary: number;
  old_day_rate: number;
  new_day_rate: number;
  old_ot_hourly_rate: number;
  new_ot_hourly_rate: number;
  effective_date: string;
  remark: string;
  created_by: number;
  update_by: number;
  created_date: string;
  updated_date: string;
}

export enum EmployeeStatus {
  UNEMPLOYED = 'UNEMPLOYED',
  ACTIVE = 'Active',
  ONLEAVE = 'ONLEAVE',
  SUSPENDED = 'SUSPENDED'
}

export const EmployeeStatusLabel: Record<EmployeeStatus, string> = {
  [EmployeeStatus.UNEMPLOYED]: 'ว่างงาน',
  [EmployeeStatus.ACTIVE]: 'ทำงานอยู่',
  [EmployeeStatus.ONLEAVE]: 'หยุดงาน',
  [EmployeeStatus.SUSPENDED]: 'ลางาน'
};

export interface Shift {
  shift_id: number;
  name: string;
  start_time: string;
  end_time: string;
  work_days: string;
  ot_multiplier: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  is_default: boolean;
}

export interface Holiday {
  holiday_id: number;
  holiday_date: string;
  name: string;
  is_active: boolean;
  source: string;
}
