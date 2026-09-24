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
import { Attendance } from './pages/Attendance';
import { AttendanceSessionNew } from './pages/AttendanceSessionNew';
import { AttendanceSessionDetail } from './pages/AttendanceSessionDetail';
import { Marks } from './pages/Marks';
import { AssessmentForm } from './pages/AssessmentForm';
import { AssessmentDetail } from './pages/AssessmentDetail';
import { Assignments } from './pages/Assignments';
import { AssignmentForm } from './pages/AssignmentForm';
import { AssignmentDetail } from './pages/AssignmentDetail';
import { Fees } from './pages/Fees';
import { FeeCategoriesList } from './pages/FeeCategoriesList';
import { FeeCategoryForm } from './pages/FeeCategoryForm';
import { FeeChargeForm } from './pages/FeeChargeForm';
import { Promotions } from './pages/Promotions';
import { PromotionBatchForm } from './pages/PromotionBatchForm';
import { PromotionBatchDetail } from './pages/PromotionBatchDetail';
import { Timetable } from './pages/Timetable';
import { TimetableForm } from './pages/TimetableForm';
import { TimetableDetail } from './pages/TimetableDetail';
import { TimetableImport } from './pages/TimetableImport';
import { StudentsImport } from './pages/StudentsImport';
import { AttendanceImport } from './pages/AttendanceImport';
import { MarksImport } from './pages/MarksImport';
import { FeeChargesImport } from './pages/FeeChargesImport';
import { FeePaymentsImport } from './pages/FeePaymentsImport';
import { PromotionImport } from './pages/PromotionImport';
import { Birthdays } from './pages/Birthdays';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SuperAdminRoute } from './components/SuperAdminRoute';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SchoolsList } from './pages/SchoolsList';
import { SchoolDetails } from './pages/SchoolDetails';
import { CreateSchool } from './pages/CreateSchool';
import { EditSchool } from './pages/EditSchool';

function App() {
  return (
    <BrowserRouter>
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
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/import"
          element={
            <ProtectedRoute>
              <StudentsImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/new"
          element={
            <ProtectedRoute>
              <StudentForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:id"
          element={
            <ProtectedRoute>
              <StudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:id/edit"
          element={
            <ProtectedRoute>
              <StudentForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/teachers"
          element={
            <ProtectedRoute>
              <Teachers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/new"
          element={
            <ProtectedRoute>
              <TeacherForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/:id"
          element={
            <ProtectedRoute>
              <TeacherDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/:id/edit"
          element={
            <ProtectedRoute>
              <TeacherForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/academic-structure"
          element={
            <ProtectedRoute>
              <AcademicStructure />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academic-years"
          element={
            <ProtectedRoute>
              <AcademicStructure />
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
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/import"
          element={
            <ProtectedRoute>
              <AttendanceImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/new"
          element={
            <ProtectedRoute>
              <AttendanceSessionNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/:id"
          element={
            <ProtectedRoute>
              <AttendanceSessionDetail />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/marks"
          element={
            <ProtectedRoute>
              <Marks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/import"
          element={
            <ProtectedRoute>
              <MarksImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/new"
          element={
            <ProtectedRoute>
              <AssessmentForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/:id"
          element={
            <ProtectedRoute>
              <AssessmentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marks/:id/edit"
          element={
            <ProtectedRoute>
              <AssessmentForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <Assignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/new"
          element={
            <ProtectedRoute>
              <AssignmentForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id"
          element={
            <ProtectedRoute>
              <AssignmentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id/edit"
          element={
            <ProtectedRoute>
              <AssignmentForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fees"
          element={
            <ProtectedRoute>
              <Fees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/charges/import"
          element={
            <ProtectedRoute>
              <FeeChargesImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/payments/import"
          element={
            <ProtectedRoute>
              <FeePaymentsImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories"
          element={
            <ProtectedRoute>
              <FeeCategoriesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories/new"
          element={
            <ProtectedRoute>
              <FeeCategoryForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/categories/:id/edit"
          element={
            <ProtectedRoute>
              <FeeCategoryForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fees/charges/new"
          element={
            <ProtectedRoute>
              <FeeChargeForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <Timetable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/import"
          element={
            <ProtectedRoute>
              <TimetableImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/new"
          element={
            <ProtectedRoute>
              <TimetableForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/:id"
          element={
            <ProtectedRoute>
              <TimetableDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable/:id/edit"
          element={
            <ProtectedRoute>
              <TimetableForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/promotions"
          element={
            <ProtectedRoute>
              <Promotions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/import"
          element={
            <ProtectedRoute>
              <PromotionImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/new"
          element={
            <ProtectedRoute>
              <PromotionBatchForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions/:id"
          element={
            <ProtectedRoute>
              <PromotionBatchDetail />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/birthdays"
          element={
            <ProtectedRoute>
              <Birthdays />
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
