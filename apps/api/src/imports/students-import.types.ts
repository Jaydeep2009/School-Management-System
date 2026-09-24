/**
 * Students Import Types
 */

/**
 * Student import row structure (from Excel)
 */
export interface StudentImportRow {
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;  // YYYY-MM-DD format
  phone?: string;
  email?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
}

/**
 * Options for students import
 */
export interface StudentsImportOptions {
  academic_year?: string;     // If provided, students will be enrolled
  classroom_code?: string;     // If provided with academic_year, students enrolled in classroom
}
