/**
 * Main App Component with Routing
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Activate } from './pages/Activate';
import { RoleBasedDashboard } from './components/RoleBasedDashboard';
import { Students } from './pages/Students';
import { StudentDetail } from './pages/StudentDetail';
import { StudentForm } from './pages/StudentForm';
import { Teachers } from './pages/Teachers';
import { TeacherDetail } from './pages/TeacherDetail';
import { TeacherForm } from './pages/TeacherForm';
import { AcademicStructure } from './pages/AcademicStructure';
import { ClassroomDetail } from './pages/ClassroomDetail';
import { ClassroomForm } from './pages/ClassroomForm';
import { Attendance } from './pages/Attendance';
import { AttendanceSessionNew } from './pages/AttendanceSessionNew';
import { AttendanceSessionDetail } from './pages/AttendanceSessionDetail';
import { Marks } from './pages/Marks';
import { AssessmentForm } from './pages/AssessmentForm';
import { AssessmentDetail } from './pages/AssessmentDetail';
import { Assignments } from './pages/Assignments';
// AssignmentForm and AssignmentDetail removed - principals don't have access to assignments
import { Fees } from './pages/Fees';
import { FeeCategoriesList } from './pages/FeeCategoriesList';
import { FeeCategoryForm } from './pages/FeeCategoryForm';
import { FeeChargeForm } from './pages/FeeChargeForm';
import { Promotions } from './pages/Promotions';
import { Timetable } from './pages/Timetable';
import { PeriodSetup } from './pages/PeriodSetup';
import { TimetableUploadSimple } from './pages/TimetableUploadSimple';
import { TimetableForm } from './pages/TimetableForm';
import { TimetableDetail } from './pages/TimetableDetail';
import { TimetableView } from './pages/TimetableView';
import { StudentsImport } from './pages/StudentsImport';
import { AttendanceImport } from './pages/AttendanceImport';
import { MarksImport } from './pages/MarksImport';
import { FeeChargesImport } from './pages/FeeChargesImport';
import { FeePaymentsImport } from './pages/FeePaymentsImport';
import { PromotionImport } from './pages/PromotionImport';
import { Birthdays } from './pages/Birthdays';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherTimetable } from './pages/TeacherTimetable';
import { TeacherAttendance } from './pages/TeacherAttendance';
import { TeacherStudentAttendance } from './pages/TeacherStudentAttendance';
import { TeacherClassOverview } from './pages/TeacherClassOverview';
import { TeacherStudents } from './pages/TeacherStudents';
import { ClassroomAttendanceReport } from './pages/ClassroomAttendanceReport';
import { ClassroomMarksReport } from './pages/ClassroomMarksReport';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentTimetable } from './pages/StudentTimetable';
import { StudentAttendance } from './pages/StudentAttendance';
import { StudentMarks } from './pages/StudentMarks';
import { StudentAssignments } from './pages/StudentAssignments';
import { StudentFees } from './pages/StudentFees';
import { StudentProfile } from './pages/StudentProfile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { AcademicYearProvider } from './contexts/AcademicYearContext';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SchoolsList } from './pages/SchoolsList';
import { SchoolDetails } from './pages/SchoolDetails';
import { CreateSchool } from './pages/CreateSchool';
import { EditSchool } from './pages/EditSchool';

function App() {
  return (
    <BrowserRouter>
      <AcademicYearProvider>
        <Routes>
        {/* School User Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<Activate />} />
        
        {/* Super Admin Login */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        
        {/* Super Admin Routes */}
        <Route
          path="/super-admin"
          element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/super-admin/schools"
          element={
            <SuperAdminRoute>
              <SchoolsList />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/super-admin/schools/new"
          element={
            <SuperAdminRoute>
              <CreateSchool />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/super-admin/schools/:id"
          element={
            <SuperAdminRoute>
              <SchoolDetails />
            </SuperAdminRoute>
          }
        />
        <Route
          path="/super-admin/schools/:id/edit"
          element={
            <SuperAdminRoute>
              <EditSchool />
            </SuperAdminRoute>
          }
        />
        
        {/* School User Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleBasedDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Students />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <StudentsImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <StudentForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <StudentDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <StudentForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/teachers"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Teachers />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TeacherForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TeacherDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TeacherForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/academic-structure"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AcademicStructure />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <ClassroomDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <ClassroomForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classrooms/:classroomId/marks"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <ClassroomMarksReport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic-years"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AcademicStructure />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic-years/:id"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Academic Year Details" />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Attendance />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AttendanceImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AttendanceSessionNew />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AttendanceSessionDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/marks"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Marks />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <MarksImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AssessmentForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AssessmentDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <AssessmentForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        {/* Assignments - Removed for Principal, only Teachers and Students */}
        
        <Route
          path="/fees"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Fees />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/charges/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeChargesImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/payments/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeePaymentsImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeCategoriesList />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeCategoryForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeCategoryForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/charges/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeChargeForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Timetable />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/period-setup"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <PeriodSetup />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/upload"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TimetableUploadSimple />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TimetableForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/view/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TimetableView />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TimetableDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <TimetableForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/promotions"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Promotions />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <PromotionImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fees"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Fees />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeCategoriesList />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeCategoryForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeCategoryForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/charges/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeChargeForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/charges/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeeChargesImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/payments/import"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <FeePaymentsImport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/birthdays"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="principal">
                <Birthdays />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <TeacherDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <TeacherStudents />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <TeacherAttendance />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <AttendanceSessionNew />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <AttendanceSessionDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/attendance/students"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <TeacherStudentAttendance />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/marks"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <Marks />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/marks/new"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <AssessmentForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/marks/:id"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <AssessmentDetail />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/marks/:id/edit"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <AssessmentForm />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/assignments"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <Assignments />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/timetable"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <TeacherTimetable />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/class-overview"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <TeacherClassOverview />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classroom/:classroomId/attendance"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <ClassroomAttendanceReport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classroom/:classroomId/marks"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <ClassroomMarksReport />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/birthdays"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <Birthdays />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/fees"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="teacher">
                <Fees />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/timetable"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentTimetable />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentAttendance />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/marks"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentMarks />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentAssignments />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/fees"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentFees />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles="student">
                <StudentProfile />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/imports"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Imports" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <PlaceholderPage title="Audit Logs" />
            </ProtectedRoute>
          }
        />
      </Routes>
      </AcademicYearProvider>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <h1 style={{ fontSize: '24px', color: '#1e293b' }}>{title}</h1>
      <p style={{ color: '#64748b' }}>This page will be implemented</p>
    </div>
  );
}

export default App;
