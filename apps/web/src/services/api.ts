/**
 * API Service
 * Centralized API communication layer
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    
    // Initialize tokens from localStorage if available
    const storedAccessToken = localStorage.getItem('accessToken') || localStorage.getItem('superAdminToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    if (storedAccessToken) {
      this.accessToken = storedAccessToken;
    }
    if (storedRefreshToken) {
      this.refreshToken = storedRefreshToken;
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    // If already refreshing, return existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          // Refresh failed - clear tokens and redirect to login
          this.clearTokens();
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        
        // Update tokens
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        return data.accessToken;
      } catch (error) {
        this.clearTokens();
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Clear all tokens and redirect to login
   */
  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {};

    // Don't set Content-Type for FormData - browser will set it automatically
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Only add Authorization header if we have a token AND it's not a public endpoint
    const publicEndpoints = ['/auth/login', '/auth/activate', '/auth/super-admin/login', '/auth/refresh'];
    const isPublicEndpoint = publicEndpoints.some(ep => endpoint.startsWith(ep));
    
    if (this.accessToken && !isPublicEndpoint) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && !isPublicEndpoint && this.refreshToken) {
      try {
        // Try to refresh token
        const newAccessToken = await this.refreshAccessToken();
        
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
          throw new ApiError(retryResponse.status, this.extractErrorMessage(error));
        }

        return retryResponse.json();
      } catch (refreshError) {
        // Refresh failed - user needs to login again
        this.clearTokens();
        throw new ApiError(401, 'Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, this.extractErrorMessage(error));
    }

    return response.json();
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(error: any): string {
    if (typeof error.error === 'string') {
      return error.error;
    } else if (typeof error.message === 'string') {
      return error.message;
    } else if (typeof error.error === 'object') {
      // Check if it's a Zod validation error
      if (error.error.issues && Array.isArray(error.error.issues)) {
        const issues = error.error.issues.map((issue: any) => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        return `Validation error: ${issues}`;
      } else {
        return JSON.stringify(error.error);
      }
    } else if (typeof error === 'string') {
      return error;
    }
    return 'Request failed';
  }

  // Health check
  async health() {
    return this.request<{ status: string; timestamp: string; database: string }>('/health');
  }

  // Auth endpoints
  async login(loginId: string, password: string) {
    const response = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        loginId: string;
        role: string;
        schoolId: string;
        mustChangePassword: boolean;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    });

    // Store tokens
    this.accessToken = response.accessToken;
    this.refreshToken = response.refreshToken;
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Clear tokens regardless of response
      this.clearTokens();
    }
  }

  async activateAccount(data: {
    loginId: string;
    activationCode: string;
    newPassword: string;
  }) {
    return this.request<{ success: boolean; message: string }>('/auth/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<{
      userId: string;
      role: string;
      schoolId: string;
      sessionId: string;
    }>('/auth/me');
  }

  // Dashboard endpoints (to be implemented)
  async getDashboardStats() {
    // For now, return mock data structure
    // TODO: Replace with actual API call when backend endpoint is ready
    throw new Error('Dashboard stats endpoint not yet implemented');
  }

  // Students
  async getStudents(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/students${query}`);
  }

  async getStudent(id: string) {
    return this.request<{ data: any }>(`/students/${id}`);
  }

  async createStudent(data: any) {
    return this.request<{ data: any }>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: any) {
    return this.request<{ data: any }>(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async disableStudent(id: string) {
    return this.request<{ data: any }>(`/students/${id}/disable`, {
      method: 'POST',
    });
  }

  async reactivateStudent(id: string) {
    return this.request<{ data: any }>(`/students/${id}/reactivate`, {
      method: 'POST',
    });
  }

  async resetStudentPassword(id: string) {
    return this.request<{ data: { user_id: string; login_id: string; temporary_password: string } }>(`/students/${id}/reset-password`, {
      method: 'POST',
    });
  }

  // Teachers
  async getTeachers(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/teachers${query}`);
  }

  async getTeacher(id: string) {
    return this.request<{ data: any }>(`/teachers/${id}`);
  }

  async getTeacherAssignments(id: string) {
    return this.request<{ 
      data: { 
        teaching_assignments: any[]; 
        class_teacher_of: any[]; 
      } 
    }>(`/teachers/${id}/assignments`);
  }

  async createTeacher(data: any) {
    return this.request<{ data: any }>('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeacher(id: string, data: any) {
    return this.request<{ data: any }>(`/teachers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async disableTeacher(id: string) {
    return this.request<{ data: any }>(`/teachers/${id}/disable`, {
      method: 'POST',
    });
  }

  async reactivateTeacher(id: string) {
    return this.request<{ data: any }>(`/teachers/${id}/reactivate`, {
      method: 'POST',
    });
  }

  async resetTeacherPassword(id: string) {
    return this.request<{ data: { user_id: string; login_id: string; temporary_password: string } }>(`/teachers/${id}/reset-password`, {
      method: 'POST',
    });
  }

  // Classrooms
  async getClassrooms(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/classrooms${query}`);
  }

  async getClassroom(id: string) {
    return this.request<{ data: any }>(`/classrooms/${id}`);
  }

  async createClassroom(data: any) {
    return this.request<{ data: any }>('/classrooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClassroom(id: string, data: any) {
    return this.request<{ data: any }>(`/classrooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClassroom(id: string) {
    return this.request<{ data: any }>(`/classrooms/${id}`, {
      method: 'DELETE',
    });
  }

  async getClassroomEnrollments(classroomId: string) {
    return this.request<{ data: any[] }>(`/classrooms/${classroomId}/enrollments`);
  }

  // Subjects
  async getSubjects(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/subjects${query}`);
  }

  async getSubject(id: string) {
    return this.request<{ data: any }>(`/subjects/${id}`);
  }

  async createSubject(data: any) {
    return this.request<{ data: any }>('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubject(id: string, data: any) {
    return this.request<{ data: any }>(`/subjects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Academic Years
  async getAcademicYears() {
    return this.request<{ data: any[] }>('/academic-years');
  }

  // Period Timings
  async getPeriodTimings(academicYearId: string) {
    return this.request<{ data: any[] }>(`/period-timings?academic_year_id=${academicYearId}`);
  }

  async getPeriodTiming(id: string) {
    return this.request<{ data: any }>(`/period-timings/${id}`);
  }

  async createPeriodTiming(data: any) {
    return this.request<{ data: any }>('/period-timings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async initializePeriodTimings(academicYearId: string) {
    return this.request<{ data: any[] }>('/period-timings/initialize', {
      method: 'POST',
      body: JSON.stringify({ academic_year_id: academicYearId }),
    });
  }

  async updatePeriodTiming(id: string, data: any) {
    return this.request<{ data: any }>(`/period-timings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePeriodTiming(id: string) {
    return this.request<{ success: boolean }>(`/period-timings/${id}`, {
      method: 'DELETE',
    });
  }

  async getAcademicYear(id: string) {
    return this.request<{ data: any }>(`/academic-years/${id}`);
  }

  async getCurrentAcademicYear() {
    return this.request<{ data: any }>('/academic-years/current');
  }

  async createAcademicYear(data: { label: string; starts_on: string; ends_on: string }) {
    return this.request<{ data: any }>('/academic-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAcademicYear(id: string, data: { label?: string; starts_on?: string; ends_on?: string }) {
    return this.request<{ data: any }>(`/academic-years/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async activateAcademicYear(id: string) {
    return this.request<{ data: any }>(`/academic-years/${id}/activate`, {
      method: 'POST',
    });
  }

  // Birthdays
  async getUpcomingBirthdays(params?: { thisWeek?: boolean; month?: number }) {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return this.request<{ data: any[] }>(`/profiles/birthdays/upcoming${query}`);
  }

  // ========================================
  // ATTENDANCE ENDPOINTS
  // ========================================

  async getAttendanceSessions(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/attendance/sessions${query}`);
  }

  async getAttendanceSession(id: string) {
    return this.request<{ data: any }>(`/attendance/sessions/${id}`);
  }

  async getSessionEntries(id: string) {
    return this.request<{ data: any[] }>(`/attendance/sessions/${id}/entries`);
  }

  async createAttendanceSession(data: {
    academic_year_id: string;
    classroom_id: string;
    subject_id: string;
    session_date: string;
    period_no: number;
  }) {
    return this.request<{ data: any }>('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markAttendance(sessionId: string, entries: Array<{
    student_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    marked_at?: number;
    notes?: string;
  }>) {
    return this.request<{ data: { updated: number } }>(`/attendance/sessions/${sessionId}/entries`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
  }

  async lockAttendanceSession(id: string) {
    return this.request<{ message: string }>(`/attendance/sessions/${id}/lock`, {
      method: 'POST',
    });
  }

  async unlockAttendanceSession(id: string) {
    return this.request<{ message: string }>(`/attendance/sessions/${id}/unlock`, {
      method: 'POST',
    });
  }

  async getStudentAttendanceSummary(studentId: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/attendance/students/${studentId}/summary${query}`);
  }

  async getStudentSubjectWiseAttendance(studentId: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/attendance/students/${studentId}/subject-wise${query}`);
  }

  async getClassroomAttendanceReport(classroomId: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/attendance/classrooms/${classroomId}/report${query}`);
  }

  // ========================================
  // MARKS / ASSESSMENTS ENDPOINTS
  // ========================================

  async getAssessments(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/marks/assessments${query}`);
  }

  async getAssessment(id: string) {
    return this.request<{ data: any }>(`/marks/assessments/${id}`);
  }

  async createAssessment(data: {
    classroom_id: string;
    subject_id: string;
    name: string;
    max_marks: number;
    weightage?: number;
    held_on?: string;
  }) {
    return this.request<{ data: any }>('/marks/assessments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAssessment(id: string, data: any) {
    return this.request<{ data: any }>(`/marks/assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async publishAssessment(id: string) {
    return this.request<{ data: any }>(`/marks/assessments/${id}/publish`, {
      method: 'POST',
    });
  }

  async lockAssessment(id: string) {
    return this.request<{ data: any }>(`/marks/assessments/${id}/lock`, {
      method: 'POST',
    });
  }

  async getMarksEntries(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/marks/entries${query}`);
  }

  async getAssessmentMarks(assessmentId: string) {
    return this.request<{ data: any[] }>(`/marks/assessments/${assessmentId}/marks`);
  }

  async updateAssessmentMarks(assessmentId: string, entries: Array<{
    student_id: string;
    status: 'graded' | 'absent' | 'exempt';
    marks_obtained: number | null;
  }>) {
    return this.request<{ data: any }>(`/marks/assessments/${assessmentId}/marks`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
  }

  async getClassroomMarksReport(classroomId: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/marks/classrooms/${classroomId}/report${query}`);
  }

  async createMarksEntry(data: {
    assessment_id: string;
    student_id: string;
    marks_obtained?: number;
    grade?: string;
    is_absent?: boolean;
    is_exempt?: boolean;
    remarks?: string;
  }) {
    return this.request<{ data: any }>('/marks/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMarksEntry(id: string, data: any) {
    return this.request<{ data: any }>(`/marks/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getStudentMarks(studentId: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/marks/students/${studentId}${query}`);
  }

  // ========================================
  // ASSIGNMENTS ENDPOINTS
  // ========================================

  async getAssignments(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/assignments${query}`);
  }

  async getAssignment(id: string) {
    return this.request<{ data: any }>(`/assignments/${id}`);
  }

  async createAssignment(data: {
    title: string;
    description?: string;
    academic_year_id: string;
    classroom_id: string;
    subject_id: string;
    due_date?: string;
    max_marks?: number;
  }) {
    return this.request<{ data: any }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAssignment(id: string, data: any) {
    return this.request<{ data: any }>(`/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async publishAssignment(id: string) {
    return this.request<{ message: string }>(`/assignments/${id}/publish`, {
      method: 'POST',
    });
  }

  async closeAssignment(id: string) {
    return this.request<{ message: string }>(`/assignments/${id}/close`, {
      method: 'POST',
    });
  }

  async uploadAssignmentAttachment(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/assignments/${id}/attachments`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiError(response.status, error.error || 'Upload failed');
    }

    return response.json();
  }

  async getAssignmentAttachmentUrl(assignmentId: string, attachmentId: string) {
    const url = `${this.baseUrl}/assignments/${assignmentId}/attachments/${attachmentId}`;
    return { data: { url } };
  }

  async deleteAssignmentAttachment(assignmentId: string, attachmentId: string) {
    return this.request<{ message: string }>(`/assignments/${assignmentId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // FEES ENDPOINTS
  // ========================================

  async getFeeCategories(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/fees/categories${query}`);
  }

  async createFeeCategory(data: { code: string; name: string }) {
    return this.request<{ data: any }>('/fees/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFeeCategory(id: string, data: { name?: string; status?: 'active' | 'inactive' }) {
    return this.request<{ data: any }>(`/fees/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getFeeCharges(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/fees/charges${query}`);
  }

  async createFeeCharge(data: {
    fee_category_id?: string;
    academic_year_id: string;
    classroom_id?: string;
    student_id?: string;
    amount: number;
    due_date?: string;
    title: string;
  }) {
    // Convert to backend format
    const backendData: any = {
      student_id: data.student_id,
      academic_year_id: data.academic_year_id,
      kind: 'fee',
      title: data.title,
      amount_paise: Math.round(data.amount * 100), // Convert to paise
    };

    if (data.fee_category_id) {
      backendData.fee_category_id = data.fee_category_id;
    }

    if (data.due_date) {
      backendData.due_on = data.due_date; // Already in YYYY-MM-DD format
    }

    console.log('[API] Creating fee charge with data:', backendData);

    return this.request<{ data: any }>('/fees/charges', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }

  async getStudentFees(studentId: string, params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/fees/students/${studentId}${query}`);
  }

  async recordPayment(data: {
    student_id: string;
    academic_year_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_no?: string;
    remarks?: string;
  }) {
    return this.request<{ data: any }>('/fees/payments', {
      method: 'POST',
      body: JSON.stringify({
        student_id: data.student_id,
        academic_year_id: data.academic_year_id,
        amount_paise: Math.round(data.amount * 100), // Convert to paise
        paid_on: data.payment_date,
        method: data.payment_method,
        reference: data.reference_no,
      }),
    });
  }

  async voidPayment(paymentId: string, reason: string) {
    return this.request<{ data: any }>(`/fees/payments/${paymentId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getFeesStats(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: {
      total_collected_paise: number;
      total_pending_paise: number;
      total_charges_paise: number;
      charge_count: number;
      payment_count: number;
    } }>(`/fees/stats${query}`);
  }

  // ========================================
  // PROMOTION ENDPOINTS
  // ========================================

  async getPromotionBatches(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/promotions/batches${query}`);
  }

  async getPromotionBatch(id: string) {
    return this.request<{ data: any }>(`/promotions/batches/${id}`);
  }

  async createPromotionBatch(data: {
    name: string;
    from_academic_year_id: string;
    to_academic_year_id: string;
  }) {
    return this.request<{ data: any }>('/promotions/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePromotionItems(batchId: string, items: Array<{
    student_id: string;
    action: 'promote' | 'retain' | 'graduate' | 'leave';
    to_classroom_id?: string;
  }>) {
    return this.request<{ data: any }>(`/promotions/batches/${batchId}/items`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    });
  }

  async planPromotionBatch(id: string) {
    return this.request<{ data: any }>(`/promotions/batches/${id}/plan`, {
      method: 'POST',
    });
  }

  async applyPromotionBatch(id: string) {
    return this.request<{ data: any }>(`/promotions/batches/${id}/apply`, {
      method: 'POST',
    });
  }

  async cancelPromotionBatch(id: string) {
    return this.request<{ data: any }>(`/promotions/batches/${id}/cancel`, {
      method: 'POST',
    });
  }

  // ========================================
  // TIMETABLE ENDPOINTS
  // ========================================

  async getTimetables(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/timetables${query}`);
  }

  async getTimetable(id: string) {
    return this.request<{ data: any }>(`/timetables/${id}`);
  }

  async getMyTimetable() {
    return this.request<{ data: { timetable: any | null; entries: any[] } }>('/timetables/me/timetable');
  }

  async createTimetable(data: {
    name: string;
    academic_year_id: string;
    classroom_id: string;
  }) {
    return this.request<{ data: any }>('/timetables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTimetable(id: string, data: { name?: string }) {
    return this.request<{ data: any }>(`/timetables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTimetable(id: string) {
    return this.request<{ message: string }>(`/timetables/${id}`, {
      method: 'DELETE',
    });
  }

  async getTimetableEntries(id: string) {
    return this.request<{ data: any[] }>(`/timetables/${id}/entries`);
  }

  async createTimetableEntry(timetableId: string, entry: any) {
    return this.request<{ data: any }>(`/timetables/${timetableId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateTimetableEntry(timetableId: string, entryId: string, entry: any) {
    return this.request<{ data: any }>(`/timetables/${timetableId}/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteTimetableEntry(timetableId: string, entryId: string) {
    return this.request<{ success: boolean }>(`/timetables/${timetableId}/entries/${entryId}`, {
      method: 'DELETE',
    });
  }

  async updateTimetableEntries(id: string, entries: Array<{
    day: string;
    period_no: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room?: string;
  }>) {
    return this.request<{ data: { created: number; updated: number; conflicts: any[] } }>(
      `/timetables/${id}/entries`,
      {
        method: 'PATCH',
        body: JSON.stringify({ entries }),
      }
    );
  }

  async createTimetableVersion(id: string) {
    return this.request<{ data: any }>(`/timetables/${id}/new-version`, {
      method: 'POST',
    });
  }

  async publishTimetable(id: string) {
    return this.request<{ data: any }>(`/timetables/${id}/publish`, {
      method: 'POST',
    });
  }

  async uploadTimetableImage(id: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.request<{ data: { image_url: string } }>(`/timetables/${id}/image`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart
      headers: {},
    });
  }

  async archiveTimetable(id: string) {
    return this.request<{ data: any }>(`/timetables/${id}/archive`, {
      method: 'POST',
    });
  }

  async getPublishedTimetables(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/timetables/published${query}`);
  }

  // ========================================
  // IMPORTS ENDPOINTS
  // ========================================

  async previewTimetableImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/imports/timetable/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitTimetableImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  async previewStudentsImport(file: File, options?: { academic_year?: string; classroom_code?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    const url = `${this.baseUrl}/imports/students/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitStudentsImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  async previewAttendanceImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/imports/attendance/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitAttendanceImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  async previewMarksImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/imports/marks/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitMarksImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  async previewFeeChargesImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/imports/fee-charges/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitFeeChargesImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  async previewFeePaymentsImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/imports/fee-payments/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitFeePaymentsImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  async previewPromotionImport(file: File, options?: { promotion_batch_id: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }
    
    const url = `${this.baseUrl}/imports/promotion/preview`;
    const headers: Record<string, string> = {};
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Preview failed' }));
      throw new ApiError(response.status, error.error || 'Preview failed');
    }

    return response.json();
  }

  async commitPromotionImport(importId: string) {
    return this.request<{ data: any }>(`/imports/${importId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ confirmed: true }),
    });
  }

  // ========================================
  // TEACHING ASSIGNMENTS ENDPOINTS
  // ========================================

  async getMyTeaching() {
    return this.request<{ data: any[] }>('/teaching-assignments/me/teaching');
  }

  async getTeachingAssignments(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/teaching-assignments${query}`);
  }

  async createTeachingAssignment(data: {
    academic_year_id: string;
    teacher_id: string;
    classroom_id: string;
    subject_id: string;
  }) {
    return this.request<{ data: any }>('/teaching-assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTeachingAssignment(id: string) {
    return this.request<{ message: string }>(`/teaching-assignments/${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // ENROLLMENTS ENDPOINTS
  // ========================================

  async getEnrollments(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any[] }>(`/enrollments${query}`);
  }

  async createEnrollment(data: {
    academic_year_id: string;
    student_id: string;
    classroom_id: string;
    roll_number?: string;
    joined_on?: string;
    status?: string;
  }) {
    return this.request<{ data: any }>('/enrollments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEnrollment(id: string, data: { roll_number?: string }) {
    return this.request<{ data: any }>(`/enrollments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // SUPER ADMIN ENDPOINTS
  // ========================================

  /**
   * Super Admin Login
   * POST /auth/super-admin/login
   */
  async superAdminLogin(loginId: string, password: string) {
    const response = await this.request<{ accessToken: string }>(
      '/auth/super-admin/login',
      {
        method: 'POST',
        body: JSON.stringify({ loginId, password }),
      }
    );

    // Store access token (no refresh token for Super Admin)
    this.accessToken = response.accessToken;
    localStorage.setItem('superAdminToken', response.accessToken);
    // Mark as Super Admin session
    localStorage.setItem('isSuperAdmin', 'true');

    return response;
  }

  /**
   * Super Admin Logout
   */
  async superAdminLogout() {
    try {
      // Note: Super Admin uses same logout endpoint but doesn't have sessions
      // Just clear local tokens
      this.accessToken = null;
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('isSuperAdmin');
    } catch (error) {
      console.error('Super Admin logout error:', error);
    }
  }

  /**
   * Get all schools
   * GET /schools
   */
  async getSchools(filters?: { status?: string; search?: string }) {
    const query = filters
      ? '?' +
        new URLSearchParams(
          Object.entries(filters).reduce((acc, [key, value]) => {
            if (value) acc[key] = value;
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    return this.request<{ data: any[] }>(`/schools${query}`);
  }

  /**
   * Get school by ID
   * GET /schools/:id
   */
  async getSchool(schoolId: string) {
    return this.request<{ data: any }>(`/schools/${schoolId}`);
  }

  /**
   * Create school
   * POST /schools
   */
  async createSchool(data: {
    code: string;
    name: string;
    timezone?: string;
    phone?: string;
    email?: string;
    address?: string;
    settings?: Record<string, unknown>;
  }) {
    return this.request<{ data: any }>('/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update school
   * PUT /schools/:id
   */
  async updateSchool(
    schoolId: string,
    data: {
      name?: string;
      timezone?: string;
      phone?: string;
      email?: string;
      address?: string;
      settings?: Record<string, unknown>;
    }
  ) {
    return this.request<{ data: any }>(`/schools/${schoolId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Suspend school
   * POST /schools/:id/suspend
   */
  async suspendSchool(schoolId: string) {
    return this.request<{ data: any }>(`/schools/${schoolId}/suspend`, {
      method: 'POST',
    });
  }

  /**
   * Activate school
   * POST /schools/:id/activate
   */
  async activateSchool(schoolId: string) {
    return this.request<{ data: any }>(`/schools/${schoolId}/activate`, {
      method: 'POST',
    });
  }

  /**
   * Archive school
   * POST /schools/:id/archive
   */
  async archiveSchool(schoolId: string) {
    return this.request<{ data: any }>(`/schools/${schoolId}/archive`, {
      method: 'POST',
    });
  }

  /**
   * Create Principal for school
   * POST /schools/:id/principal
   */
  async createPrincipal(
    schoolId: string,
    data: {
      full_name: string;
      date_of_birth: string;
      gender: 'male' | 'female' | 'other';
    }
  ) {
    return this.request<{ data: any }>(`/schools/${schoolId}/principal`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // /ME ENDPOINTS (Student/Teacher specific)
  // ========================================

  /**
   * Get current user's profile
   * GET /me/profile
   * Returns profile based on role (teacher, student, or principal)
   */
  async getMyProfile() {
    return this.request<{
      data: {
        type: 'teacher' | 'student' | 'principal';
        profile?: any;
        user_id?: string;
        school_id?: string;
      };
    }>('/me/profile');
  }

  /**
   * Get student's own attendance
   * GET /me/attendance
   * Authorization: Student only
   */
  async getMyAttendance(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/me/attendance${query}`);
  }

  /**
   * Get student's own marks
   * GET /me/marks
   * Authorization: Student only
   */
  async getMyMarks(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/me/marks${query}`);
  }

  /**
   * Get student's own assignments
   * GET /me/assignments
   * Authorization: Student only
   */
  async getMyAssignments(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ data: any }>(`/me/assignments${query}`);
  }

  /**
   * Get student's own fee details for an academic year
   * GET /me/fees/:academicYearId
   * Authorization: Student only
   */
  async getMyFees(academicYearId: string) {
    return this.request<{ data: any }>(`/me/fees/${academicYearId}`);
  }

  // ========================================
  // STUDENT SELF-SERVICE ENDPOINTS
  // ========================================

  // Get current student's profile
  async getStudentMe() {
    return this.request<{ data: any }>('/me/profile');
  }

  // Get current student's attendance summary
  async getStudentMeAttendance() {
    return this.request<{ data: any }>('/me/attendance');
  }

  // Get current student's published marks
  async getStudentMeMarks() {
    return this.request<{ data: any }>('/me/marks');
  }

  // Get assignments for current student's classroom
  async getStudentMeAssignments(params?: { subject_id?: string }) {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    return this.request<{ data: any[] }>(`/me/assignments${query}`);
  }

  // Get fee summary for current student
  async getStudentMeFees(academicYearId?: string) {
    // If no academic year provided, use current/active one
    // The backend will need to handle this
    const yearId = academicYearId || 'current'; // placeholder for now
    return this.request<{ data: any }>(`/me/fees/${yearId}`);
  }

  // Change password for current student
  async changeStudentPassword(data: { current_password: string; new_password: string }) {
    return this.request<{ message: string }>('/students/me/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();

  // ========================================
  // PROMOTION ENDPOINTS
  // ========================================

  /**
   * Get promotion preview for a classroom
   * GET /promotions/preview/:classroomId
   */
  async getPromotionPreview(classroomId: string, academicYearId: string) {
    return this.request<{ data: any }>(`/promotions/preview/${classroomId}?academic_year_id=${academicYearId}`);
  }

  /**
   * Promote single student
   * POST /promotions/single
   */
  async promoteSingleStudent(data: {
    enrollment_id: string;
    action: 'promote' | 'retain' | 'graduate' | 'dropout';
    new_classroom_id?: string;
    new_academic_year_id: string;
    remarks?: string;
  }) {
    return this.request<{ success: boolean; message: string }>('/promotions/single', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Bulk promote students
   * POST /promotions/bulk
   */
  async bulkPromoteStudents(data: {
    classroom_id: string;
    current_academic_year_id: string;
    new_academic_year_id: string;
    action: 'promote' | 'retain' | 'graduate' | 'dropout';
    new_grade?: number;
    student_ids?: string[];
    remarks?: string;
  }) {
    return this.request<{ success: boolean; data: any; message: string }>('/promotions/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
