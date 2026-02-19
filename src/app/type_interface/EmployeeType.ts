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
  salary_base?: number;
  created_date?: string;
  updated_date?: string;
}

export interface EmployeeSalaryHistory {
  salary_history_id: number;
  employee_id: number;
  old_salary: number;
  new_salary: number;
  effective_date: string;
  remark: string;
  created_by: number;
  update_by: number;
  created_date: string;
  updated_date: string;
}

export enum EmployeeStatus {
  UNEMPLOYED = 'Unemployed',
  ACTIVE = 'Active',
  ON_LEAVE = 'On Leave',
  SUSPENDED = 'Suspended'
}