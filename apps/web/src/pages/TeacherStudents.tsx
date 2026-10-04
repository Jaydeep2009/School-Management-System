/**
 * Teacher Students Page
 * Class teachers can view all students in their class
 * Subject teachers can view students in their assigned classrooms
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { useIsClassTeacher } from '../hooks/useIsClassTeacher';
import { apiService } from '../services/api';
import { Users, Search, Eye } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  student_code: string;
  roll_number?: string;
  email?: string;
  phone?: string;
  status: string;
}

export function TeacherStudents() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isClassTeacher } = useIsClassTeacher();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [myClassrooms, setMyClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only load data when user is available
    if (user && user.id) {
      loadData();
    }
  }, [selectedClassroom, user]);

  const loadData = async () => {
    // Don't load if user is not available yet
    if (!user || !user.id) {
      console.log('User not loaded yet, skipping data load');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading teacher data...');
      console.log('Current user ID:', user.id);
      console.log('Current user:', user);
      
      // Get classrooms where this teacher is the class teacher
      let classTeacherClassrooms: any[] = [];
      try {
        const allClassroomsRes = await apiService.getClassrooms();
        console.log('All classrooms loaded:', allClassroomsRes.data?.length || 0);
        console.log('Sample classroom:', allClassroomsRes.data?.[0]);
        
        classTeacherClassrooms = (allClassroomsRes.data || []).filter(
          (c: any) => {
            console.log(`Checking classroom ${c.classroom_name}: class_teacher_id="${c.class_teacher_id}" vs user.id="${user.id}"`);
            return c.class_teacher_id === user.id;
          }
        );
        console.log('Classrooms where user is class teacher:', classTeacherClassrooms);
      } catch (err) {
        console.warn('Failed to check class teacher status:', err);
      }
      
      // Get teacher's teaching assignments
      let assignments: any[] = [];
      try {
        const assignmentsRes = await apiService.getMyTeaching();
        assignments = assignmentsRes.data || [];
        console.log('Got teaching assignments:', assignments);
      } catch (err) {
        console.warn('Failed to get /me/teaching, trying fallback:', err);
        try {
          const allAssignmentsRes = await apiService.getTeachingAssignments({
            teacher_id: user.id
          });
          assignments = allAssignmentsRes.data || [];
          console.log('Got assignments from fallback:', assignments);
        } catch (err2) {
          console.error('Failed to get teaching assignments:', err2);
        }
      }
      
      // Set class teacher flag
      const hasClassTeacherRole = classTeacherClassrooms.length > 0 || 
                                  assignments.some((a: any) => a.is_class_teacher);
      // isClassTeacher is now from the hook
      console.log('Is class teacher:', hasClassTeacherRole);
      
      // Combine classrooms from both sources
      const assignmentClassrooms = Array.from(
        new Map(assignments.map((a: any) => [
          a.classroom_id,
          {
            id: a.classroom_id,
            name: a.classroom_name || a.classroom_code || `Classroom ${a.classroom_id.substring(0, 8)}`,
            is_class_teacher: a.is_class_teacher
          }
        ])).values()
      );
      
      const classTeacherClassroomsList = classTeacherClassrooms.map((c: any) => ({
        id: c.id,
        name: c.classroom_name || c.classroom_code || `Classroom ${c.id.substring(0, 8)}`,
        is_class_teacher: true
      }));
      
      // Merge and deduplicate
      const allClassroomsMap = new Map();
      [...assignmentClassrooms, ...classTeacherClassroomsList].forEach((c: any) => {
        if (!allClassroomsMap.has(c.id)) {
          allClassroomsMap.set(c.id, c);
        } else if (c.is_class_teacher) {
          // Update to show class teacher status if true
          allClassroomsMap.set(c.id, { ...allClassroomsMap.get(c.id), is_class_teacher: true });
        }
      });
      
      const uniqueClassrooms = Array.from(allClassroomsMap.values());
      
      console.log('All unique classrooms:', uniqueClassrooms);
      setMyClassrooms(uniqueClassrooms as any[]);
      
      if (uniqueClassrooms.length === 0) {
        console.log('No classrooms found - teacher needs to be set as class teacher or have teaching assignments');
        setStudents([]);
        setIsLoading(false);
        return;
      }
      
      // Load students from enrollments (includes student data)
      const allStudents: Student[] = [];
      const classroomsToLoad = selectedClassroom === 'all' 
        ? Array.from(uniqueClassrooms)
        : uniqueClassrooms.filter((c: any) => c.id === selectedClassroom);
      
      console.log('Loading students for classrooms:', classroomsToLoad);
      
      for (const classroom of classroomsToLoad) {
        try {
          console.log(`Fetching enrollments for classroom ID: ${(classroom as any).id}, Name: ${(classroom as any).name}`);
          const enrollmentsRes = await apiService.getEnrollments({
            classroom_id: (classroom as any).id
          });
          
          console.log(`Enrollments response:`, enrollmentsRes);
          console.log(`Enrollments for classroom ${(classroom as any).name}:`, enrollmentsRes.data?.length || 0);
          
          if (enrollmentsRes.data && enrollmentsRes.data.length > 0) {
            console.log('Sample enrollment with student data:', enrollmentsRes.data[0]);
            
            // Map enrollment data to Student interface
            for (const enrollment of enrollmentsRes.data) {
              // Skip if student data is missing
              if (!enrollment.student_name) {
                console.warn(`Skipping enrollment ${enrollment.id} - missing student data`);
                continue;
              }
              
              allStudents.push({
                id: enrollment.student_id,
                full_name: enrollment.student_name,
                student_code: enrollment.student_code || '-',
                roll_number: enrollment.roll_number || undefined,
                email: enrollment.email || undefined,
                phone: enrollment.phone || undefined,
                status: enrollment.student_status || 'active',
              });
            }
          }
        } catch (err) {
          console.error(`Failed to load enrollments for classroom ${(classroom as any).id}:`, err);
        }
      }
      
      console.log('Total students loaded:', allStudents.length);
      setStudents(allStudents);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.student_code.toLowerCase().includes(query) ||
      student.roll_number?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  });

  if (!user) return null;

  return (
    <Layout
      schoolName={'SMS'}
      principalName={user.loginId || 'Teacher'}
      onLogout={logout}
      role="teacher"
      isClassTeacher={isClassTeacher}
    >
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              My Students
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isClassTeacher 
                ? 'View all students in your class' 
                : 'View students in your assigned classrooms'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Classroom
              </label>
              <select
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="all">All My Classrooms</option>
                {myClassrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} {classroom.is_class_teacher ? '(Class Teacher)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Search
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by name, code, roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 40px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Card>
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', background: '#dbeafe', borderRadius: '8px' }}>
                <Users size={20} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  {filteredStudents.length}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {searchQuery ? 'Search Results' : 'Total Students'}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Students List */}
        <Card>
          <div style={{ padding: '24px' }}>
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} height="60px" />)}
              </div>
            )}

            {error && !isLoading && <ErrorState message={error} onRetry={loadData} />}

            {!isLoading && !error && filteredStudents.length === 0 && myClassrooms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Users size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  No Teaching Assignments
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                  You don't have any teaching assignments yet. Please contact your administrator to assign you to classes and subjects.
                </p>
                <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'left' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                    What needs to be done:
                  </p>
                  <ol style={{ fontSize: '13px', color: '#64748b', paddingLeft: '20px', margin: 0 }}>
                    <li>Principal needs to create teaching assignments in Academic Structure</li>
                    <li>Link you (teacher) to specific classroom(s) and subject(s)</li>
                    <li>Students need to be enrolled in those classrooms</li>
                  </ol>
                </div>
              </div>
            )}

            {!isLoading && !error && filteredStudents.length === 0 && myClassrooms.length > 0 && (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Users size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  No students found
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  {searchQuery ? 'Try adjusting your search' : 'No students enrolled in your classrooms yet'}
                </p>
              </div>
            )}

            {!isLoading && !error && filteredStudents.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        Roll No.
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        Student Name
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        Student Code
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        Contact
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        Status
                      </th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '13px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', color: '#64748b', fontSize: '14px' }}>
                          {student.roll_number || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '14px' }}>
                            {student.full_name}
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#64748b', fontSize: '14px' }}>
                          {student.student_code}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <div style={{ color: '#64748b' }}>{student.email || '-'}</div>
                          <div style={{ color: '#94a3b8', fontSize: '13px' }}>{student.phone || '-'}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: student.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: student.status === 'active' ? '#166534' : '#dc2626',
                          }}>
                            {student.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            <Eye size={14} style={{ marginRight: '4px' }} />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
