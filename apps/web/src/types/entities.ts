/**
 * Entity Types for Principal Frontend
 * Based on existing backend API contracts
 */

export interface Student {
  id: string;
  user_id: string;
  school_id: string;
  login_id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  religion?: string;
  caste?: string;
  nationality?: string;
  mother_tongue?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  guardian_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
  guardian_email?: string;
  admission_number?: string;
  admission_date?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  school_id: string;
  login_id: string;
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  joining_date?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  section?: string;
  capacity?: number;
  academic_year_label?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  student_id: string;
  roll_number?: string;
  status: 'active' | 'promoted' | 'retained' | 'left';
  student_name?: string;
  classroom_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TeachingAssignment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  teacher_id: string;
  is_class_teacher: boolean;
  teacher_name?: string;
  classroom_name?: string;
  subject_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id?: string;
  teacher_id: string;
  session_date: string;
  session_type: 'full_day' | 'morning' | 'afternoon' | 'subject_period';
  status: 'draft' | 'submitted' | 'locked';
  present_count?: number;
  absent_count?: number;
  total_students?: number;
  classroom_name?: string;
  subject_name?: string;
  teacher_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  enrollment_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  student_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  name: string;
  assessment_type: 'exam' | 'test' | 'assignment' | 'project' | 'practical';
  max_marks: number;
  weightage?: number;
  assessment_date?: string;
  status: 'draft' | 'published' | 'locked';
  classroom_name?: string;
  subject_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Mark {
  id: string;
  assessment_id: string;
  student_id: string;
  enrollment_id: string;
  marks_obtained?: number;
  is_absent: boolean;
  remarks?: string;
  student_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  school_id: string;
  academic_year_id: string;
  classroom_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  due_date?: string;
  max_marks?: number;
  attachment_url?: string;
  classroom_name?: string;
  subject_name?: string;
  teacher_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeCategory {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  description?: string;
  amount: number;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeCharge {
  id: string;
  school_id: string;
  academic_year_id: string;
  student_id: string;
  category_id: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'paid' | 'partial' | 'void';
  student_name?: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FeePayment {
  id: string;
  school_id: string;
  academic_year_id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_mode: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card';
  reference_number?: string;
  receipt_number: string;
  remarks?: string;
  status: 'active' | 'void';
  student_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionBatch {
  id: string;
  school_id: string;
  from_academic_year_id: string;
  to_academic_year_id: string;
  status: 'draft' | 'planned' | 'applied' | 'cancelled';
  planned_at?: string;
  applied_at?: string;
  from_year_label?: string;
  to_year_label?: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionDecision {
  id: string;
  batch_id: string;
  student_id: string;
  from_classroom_id: string;
  to_classroom_id?: string;
  decision: 'promote' | 'retain' | 'graduate' | 'leave';
  remarks?: string;
  student_name?: string;
  from_classroom_name?: string;
  to_classroom_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TimetableVersion {
  id: string;
  school_id: string;
  academic_year_id: string;
  version_number: number;
  label: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TimetableEntry {
  id: string;
  version_id: string;
  classroom_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  classroom_name?: string;
  subject_name?: string;
  teacher_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Birthday {
  user_id: string;
  role: 'teacher' | 'student';
  full_name: string;
  date_of_birth: string;
  upcoming_date?: string;
  days_until?: number;
}

export interface AuditLog {
  id: string;
  school_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
