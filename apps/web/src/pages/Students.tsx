/**
 * Students Management Page - Enhanced with KPIs, Excel Import, Import History, and Login Credentials
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import type { Student } from '../types/entities';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  UserX, 
  School, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Eye, 
  Edit, 
  Key,
  History,
  Info,
  CheckCircle
} from 'lucide-react';

type TabType = 'list' | 'import' | 'history';
type ImportStep = 'template' | 'upload' | 'preview' | 'commit';

export function Students() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('list');
  
  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('template');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Login credentials panel
  const [showCredentials, setShowCredentials] = useState(true);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters: Record<string, string> = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      const [studentsRes, classroomsRes] = await Promise.all([
        apiService.getStudents(filters),
        apiService.getClassrooms()
      ]);
      
      setStudents(studentsRes.data || studentsRes || []);
      setClassrooms(classroomsRes.data || classroomsRes || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      // Set empty arrays to prevent undefined errors
      setStudents([]);
      setClassrooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  // KPI calculations
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const inactiveStudents = students.filter(s => s.status === 'inactive').length;
  const totalClasses = classrooms.length;

  // Filter and paginate students
  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.login_id.toLowerCase().includes(query) ||
      student.admission_number?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedStudents.size === paginatedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(paginatedStudents.map(s => s.id)));
    }
  };

  const handleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  // Import handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportStep('upload');
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) return;

    try {
      setImportLoading(true);
      setImportError(null);

      console.log('Uploading file:', importFile.name);
      const response = await apiService.previewStudentsImport(importFile, {});
      console.log('Preview response:', response);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      setImportPreview(response.data);
      setImportStep('preview');
    } catch (err) {
      console.error('Import error:', err);
      setImportError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview?.import_id) return;

    try {
      setImportLoading(true);
      await apiService.commitStudentsImport(importPreview.import_id);
      setImportStep('commit');
      // Reload students
      await loadData();
      // Reset after 2 seconds
      setTimeout(() => {
        setImportStep('template');
        setImportFile(null);
        setImportPreview(null);
      }, 2000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to commit import');
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportStep('template');
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
  };

  const downloadTemplate = () => {
    // Create template with headers
    const templateData = [
      {
        admission_number: 'ADM001',
        first_name: 'John',
        middle_name: 'M',
        last_name: 'Doe',
        gender: 'male',
        date_of_birth: '2010-01-15',
        phone: '1234567890',
        email: 'john.doe@example.com',
        address: '123 Main St, City',
        parent_name: 'Jane Doe',
        parent_phone: '9876543210',
        parent_email: 'jane.doe@example.com'
      },
      {
        admission_number: 'ADM002',
        first_name: 'Jane',
        middle_name: '',
        last_name: 'Smith',
        gender: 'female',
        date_of_birth: '2010-03-20',
        phone: '',
        email: '',
        address: '',
        parent_name: 'Robert Smith',
        parent_phone: '5551234567',
        parent_email: 'robert.smith@example.com'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // admission_number
      { wch: 15 }, // first_name
      { wch: 15 }, // middle_name
      { wch: 15 }, // last_name
      { wch: 10 }, // gender
      { wch: 15 }, // date_of_birth
      { wch: 15 }, // phone
      { wch: 25 }, // email
      { wch: 30 }, // address
      { wch: 20 }, // parent_name
      { wch: 15 }, // parent_phone
      { wch: 25 }  // parent_email
    ];

    XLSX.writeFile(workbook, 'students-template.xlsx');
  };

  const exportStudents = () => {
    if (filteredStudents.length === 0) {
      alert('No students to export');
      return;
    }

    // Prepare data for export
    const exportData = filteredStudents.map(student => ({
      admission_number: student.admission_number || '',
      login_id: student.login_id || '',
      full_name: student.full_name || '',
      gender: student.gender || '',
      date_of_birth: student.date_of_birth || '',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      status: student.status || '',
      created_at: student.created_at ? new Date(student.created_at).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // admission_number
      { wch: 20 }, // login_id
      { wch: 25 }, // full_name
      { wch: 10 }, // gender
      { wch: 15 }, // date_of_birth
      { wch: 15 }, // phone
      { wch: 25 }, // email
      { wch: 30 }, // address
      { wch: 10 }, // status
      { wch: 15 }  // created_at
    ];

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `students-export-${timestamp}.xlsx`);
  };

  const handleResetPassword = async (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Reset password for this student?')) return;
    
    try {
      const result = await apiService.resetStudentPassword(studentId);
      alert(`Password reset successful!\n\nLogin ID: ${result.data.login_id}\nTemporary Password: ${result.data.temporary_password}\n\nPlease share this with the student.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  if (!user) return null;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', display: 'flex', gap: '24px' }}>
        {/* Main content */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                Students
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Manage student accounts, profiles, and bulk imports
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={exportStudents}>
                <Download size={16} style={{ marginRight: '8px' }} />
                Export to Excel
              </Button>
              <Button onClick={() => navigate('/students/new')}>
                <Plus size={16} style={{ marginRight: '8px' }} />
                Add Student
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} style={{ color: '#2563eb' }} />
                  </div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {totalStudents}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Total Students</div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={20} style={{ color: '#16a34a' }} />
                  </div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {activeStudents}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Active Students</div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserX size={20} style={{ color: '#dc2626' }} />
                  </div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {inactiveStudents}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Inactive Students</div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <School size={20} style={{ color: '#d97706' }} />
                  </div>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {totalClasses}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Classes</div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div style={{ marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              <button
                onClick={() => setActiveTab('list')}
                style={{
                  padding: '12px 4px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === 'list' ? '#2563eb' : '#64748b',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'list' ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Student List
              </button>
              <button
                onClick={() => setActiveTab('import')}
                style={{
                  padding: '12px 4px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === 'import' ? '#2563eb' : '#64748b',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'import' ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Excel Import
              </button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '12px 4px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === 'history' ? '#2563eb' : '#64748b',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Import History
              </button>
            </div>
          </div>

          {/* Student List Tab */}
          {activeTab === 'list' && (
            <Card>
              <div style={{ padding: '24px' }}>
                {/* Filters */}
                <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Search by name, login ID, or admission number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 40px',
                        fontSize: '14px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      outline: 'none',
                      background: 'white',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height="80px" />
                    ))}
                  </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                  <ErrorState message={error} onRetry={loadData} />
                )}

                {/* Empty State */}
                {!isLoading && !error && filteredStudents.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <Users size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                      No students found
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                      {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first student'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => navigate('/students/new')}>
                        Add Student
                      </Button>
                    )}
                  </div>
                )}

                {/* Students Table */}
                {!isLoading && !error && filteredStudents.length > 0 && (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px', width: '40px' }}>
                              <input
                                type="checkbox"
                                checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                                onChange={handleSelectAll}
                                style={{ cursor: 'pointer' }}
                              />
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                              Student
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                              Login ID
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                              Admission No
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                              Gender
                            </th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                              Status
                            </th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStudents.map((student) => (
                            <tr
                              key={student.id}
                              style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                              onClick={() => navigate(`/students/${student.id}`)}
                            >
                              <td style={{ padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.has(student.id)}
                                  onChange={() => handleSelectStudent(student.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: '#e0e7ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#4f46e5',
                                  }}>
                                    {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{student.full_name || 'N/A'}</div>
                                </div>
                              </td>
                              <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>
                                {student.login_id}
                              </td>
                              <td style={{ padding: '16px', color: '#64748b' }}>
                                {student.admission_number || '—'}
                              </td>
                              <td style={{ padding: '16px', color: '#64748b', textTransform: 'capitalize' }}>
                                {student.gender}
                              </td>
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: student.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                  color: student.status === 'active' ? '#166534' : '#64748b',
                                }}>
                                  {student.status}
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => navigate(`/students/${student.id}`)}
                                    style={{
                                      padding: '6px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      background: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="View"
                                  >
                                    <Eye size={16} style={{ color: '#64748b' }} />
                                  </button>
                                  <button
                                    onClick={() => navigate(`/students/${student.id}/edit`)}
                                    style={{
                                      padding: '6px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      background: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Edit"
                                  >
                                    <Edit size={16} style={{ color: '#64748b' }} />
                                  </button>
                                  <button
                                    onClick={(e) => handleResetPassword(student.id, e)}
                                    style={{
                                      padding: '6px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      background: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                    title="Reset Password"
                                  >
                                    <Key size={16} style={{ color: '#64748b' }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '14px',
                              fontWeight: 500,
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              background: currentPage === page ? '#2563eb' : 'white',
                              color: currentPage === page ? 'white' : '#64748b',
                              cursor: 'pointer',
                            }}
                          >
                            {page}
                          </button>
                        ))}
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Excel Import Tab */}
          {activeTab === 'import' && (
            <Card>
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    Import Students from Excel
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>
                    Follow the 4-step workflow to bulk import student data
                  </p>
                </div>

                {/* Step Indicator */}
                <div style={{ marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {['template', 'upload', 'preview', 'commit'].map((step, idx) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: importStep === step ? '#2563eb' : idx < ['template', 'upload', 'preview', 'commit'].indexOf(importStep) ? '#16a34a' : '#e2e8f0',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}>
                        {idx + 1}
                      </div>
                      {idx < 3 && (
                        <div style={{ flex: 1, height: '2px', background: '#e2e8f0', marginLeft: '8px' }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step 1: Download Template */}
                {importStep === 'template' && (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <FileSpreadsheet size={48} style={{ color: '#2563eb', marginBottom: '16px' }} />
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                      Step 1: Download Template
                    </h4>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                      Download the Excel template and fill in your student data
                    </p>
                    <Button onClick={downloadTemplate}>
                      <Download size={16} style={{ marginRight: '8px' }} />
                      Download Template
                    </Button>
                    <div style={{ marginTop: '24px' }}>
                      <Button variant="secondary" onClick={() => setImportStep('upload')}>
                        I have the file ready
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Upload File */}
                {importStep === 'upload' && (
                  <div style={{ padding: '32px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                      Step 2: Upload & Validate
                    </h4>
                    <div
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '48px',
                        textAlign: 'center',
                        background: '#f8fafc',
                      }}
                    >
                      <Upload size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                        {importFile ? importFile.name : 'Drag and drop your Excel file here, or click to browse'}
                      </p>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <span style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'white',
                          background: '#2563eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}>
                          Choose File
                        </span>
                      </label>
                    </div>
                    {importFile && (
                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <Button onClick={handleFileUpload} disabled={importLoading}>
                          {importLoading ? 'Validating...' : 'Validate & Preview'}
                        </Button>
                        <Button variant="secondary" onClick={resetImport}>
                          Cancel
                        </Button>
                      </div>
                    )}
                    {importError && (
                      <div style={{ marginTop: '16px', padding: '12px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', fontSize: '14px' }}>
                        {importError}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Preview Results */}
                {importStep === 'preview' && importPreview && (
                  <div style={{ padding: '32px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                      Step 3: Preview Results
                    </h4>
                    <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#0369a1' }}>
                          {importPreview.total_rows || 0}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Total Rows</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>
                          {importPreview.valid_rows || 0}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Valid Rows</div>
                      </div>
                      <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#b91c1c' }}>
                          {importPreview.error_rows || 0}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b' }}>Invalid Rows</div>
                      </div>
                    </div>

                    {importPreview.errors && importPreview.errors.length > 0 && (
                      <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
                        <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '12px' }}>
                          Validation Errors ({importPreview.errors.length})
                        </h5>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {importPreview.errors.map((err: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '8px' }}>
                              Row {err.row}: {err.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <Button
                        onClick={handleCommitImport}
                        disabled={importLoading || (importPreview.valid_rows || 0) === 0}
                      >
                        {importLoading ? 'Committing...' : `Commit ${importPreview.valid_rows || 0} Students`}
                      </Button>
                      <Button variant="secondary" onClick={resetImport}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Success */}
                {importStep === 'commit' && (
                  <div style={{ textAlign: 'center', padding: '48px' }}>
                    <CheckCircle size={64} style={{ color: '#16a34a', marginBottom: '16px' }} />
                    <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                      Import Successful!
                    </h4>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>
                      Students have been successfully imported
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Import History Tab */}
          {activeTab === 'history' && (
            <Card>
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                  Import History
                </h3>
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <History size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                  <p style={{ fontSize: '14px', color: '#64748b' }}>
                    Import history will appear here after you perform imports
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Student Login Credentials Sidebar */}
        {showCredentials && (
          <div style={{ width: '320px' }}>
            <Card>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={16} />
                  Student Login Info
                </h3>
                <button
                  onClick={() => setShowCredentials(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Username Pattern:</div>
                  <code style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>
                    firstname.lastname
                  </code>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Password Pattern:</div>
                  <code style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>
                    Student@YYYY
                  </code>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    (YYYY = birth year)
                  </div>
                </div>

                <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '4px', fontSize: '12px' }}>Example:</div>
                  <div style={{ fontSize: '12px', color: '#0c4a6e' }}>
                    Username: <code>john.doe</code><br />
                    Password: <code>Student@2010</code>
                  </div>
                </div>

                <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px', fontSize: '12px', color: '#78350f' }}>
                  <strong>First Login:</strong> Students will be prompted to change their password on first login.
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                <strong>Need to reset?</strong> Use the key icon in the student list to generate a new temporary password.
              </div>
            </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}





