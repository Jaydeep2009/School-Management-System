/**
 * Students Import Page - Bulk Import Students from Excel
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, XCircle, Download } from 'lucide-react';

export function StudentsImport() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [classroomCode, setClassroomCode] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const options: any = {};
      if (academicYear) options.academic_year = academicYear;
      if (classroomCode) options.classroom_code = classroomCode;

      const response = await apiService.previewStudentsImport(file, options);
      setPreview(response.data);
      
      if (response.data.errors && response.data.errors.length > 0) {
        setError('Validation errors found. Please review and fix the file.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview import');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview || !preview.import_id) {
      setError('No preview available to commit');
      return;
    }

    const enrollMsg = classroomCode 
      ? ` and enrolled in classroom ${classroomCode}`
      : '';

    if (!confirm(`Commit this import? This will create ${preview.valid_rows} student(s)${enrollMsg}.`)) return;

    setIsCommitting(true);
    setError(null);

    try {
      await apiService.commitStudentsImport(preview.import_id);
      alert('Students imported successfully!');
      navigate('/students');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit import');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create a sample Excel template
    const csvContent = `admission_number,first_name,middle_name,last_name,gender,date_of_birth,phone,email,address,parent_name,parent_phone,parent_email
S001,John,Michael,Doe,male,2010-05-15,1234567890,john.doe@example.com,123 Main St,Jane Doe,0987654321,jane.doe@example.com
S002,Sarah,Ann,Smith,female,2011-03-22,2345678901,sarah.smith@example.com,456 Oak Ave,Bob Smith,8765432109,bob.smith@example.com`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  const hasErrors = preview?.errors && preview.errors.length > 0;
  const hasWarnings = preview?.warnings && preview.warnings.length > 0;
  const canCommit = preview && !hasErrors;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/students')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                Import Students from Excel
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Bulk import student records with optional enrollment
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download size={16} style={{ marginRight: '8px' }} />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <Card>
          <div style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Step 1: Configure Import
            </h2>

            {/* Enrollment Options */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                Enrollment Options (Optional)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g., 2024-2025"
                    disabled={isUploading || isCommitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                    Classroom Code
                  </label>
                  <input
                    type="text"
                    value={classroomCode}
                    onChange={(e) => setClassroomCode(e.target.value)}
                    placeholder="e.g., 1A"
                    disabled={isUploading || isCommitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                If provided, students will be enrolled in the specified classroom
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isCommitting}
              >
                <Upload size={16} style={{ marginRight: '8px' }} />
                Choose Excel File
              </Button>
              {file && (
                <span style={{ marginLeft: '12px', fontSize: '14px', color: '#64748b' }}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>

            {file && !preview && (
              <Button onClick={handlePreview} disabled={isUploading}>
                {isUploading ? 'Validating...' : 'Preview Import'}
              </Button>
            )}

            {error && !preview && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}
          </div>
        </Card>

        {/* Preview Results */}
        {preview && (
          <>
            <div style={{ marginTop: '24px' }}>
              <Card>
                <div style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                    Step 2: Review Preview
                  </h2>

                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>
                        {preview.total_rows || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Total Rows</div>
                    </div>
                    <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#166534' }}>
                        {preview.valid_rows || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: '#166534' }}>Valid</div>
                    </div>
                    <div style={{ padding: '16px', background: hasErrors ? '#fee2e2' : '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: hasErrors ? '#dc2626' : '#0f172a' }}>
                        {preview.error_rows || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: hasErrors ? '#dc2626' : '#64748b' }}>Errors</div>
                    </div>
                    <div style={{ padding: '16px', background: hasWarnings ? '#fef3c7' : '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: hasWarnings ? '#92400e' : '#0f172a' }}>
                        {preview.warning_rows || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: hasWarnings ? '#92400e' : '#64748b' }}>Warnings</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {hasErrors && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <XCircle size={20} style={{ color: '#dc2626' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626' }}>
                          Errors ({preview.errors.length})
                        </h3>
                      </div>
                      <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                        {preview.errors.map((err: any, i: number) => (
                          <div key={i} style={{ fontSize: '14px', color: '#dc2626', marginBottom: i < preview.errors.length - 1 ? '8px' : 0 }}>
                            • Row {err.row}: {err.message}
                            {err.field && <span style={{ fontWeight: 600 }}> ({err.field})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {hasWarnings && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <AlertTriangle size={20} style={{ color: '#92400e' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e' }}>
                          Warnings ({preview.warnings.length})
                        </h3>
                      </div>
                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                        {preview.warnings.map((warn: any, i: number) => (
                          <div key={i} style={{ fontSize: '14px', color: '#92400e', marginBottom: i < preview.warnings.length - 1 ? '8px' : 0 }}>
                            • Row {warn.row}: {warn.message}
                            {warn.field && <span style={{ fontWeight: 600 }}> ({warn.field})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {canCommit && !hasWarnings && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                      <CheckCircle size={20} style={{ color: '#166534' }} />
                      <span style={{ fontSize: '14px', color: '#166534', fontWeight: 500 }}>
                        Validation passed! Ready to import {preview.valid_rows} student(s).
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <Button
                      onClick={handleCommit}
                      disabled={!canCommit || isCommitting}
                    >
                      <CheckCircle size={16} style={{ marginRight: '8px' }} />
                      {isCommitting ? 'Importing...' : 'Commit Import'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      disabled={isCommitting}
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Instructions */}
        {!preview && (
          <div style={{ marginTop: '24px' }}>
            <Card>
              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                  File Format Instructions
                </h3>
                <ul style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8', paddingLeft: '20px' }}>
                  <li><strong>Required columns:</strong> admission_number, first_name, last_name</li>
                  <li><strong>Optional columns:</strong> middle_name, gender, date_of_birth, phone, email, address, parent_name, parent_phone, parent_email</li>
                  <li>Date of birth format: YYYY-MM-DD (e.g., 2010-05-15)</li>
                  <li>Gender values: male, female, or other</li>
                  <li>Admission numbers must be unique across the school</li>
                  <li>If Academic Year and Classroom Code are provided, students will be automatically enrolled</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
