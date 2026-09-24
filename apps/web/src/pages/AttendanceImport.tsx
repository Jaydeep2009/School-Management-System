/**
 * Attendance Import Page - Bulk Import Attendance from Excel
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, XCircle, Download } from 'lucide-react';

export function AttendanceImport() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await apiService.previewAttendanceImport(file);
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

    if (!confirm(`Commit this import? This will create/update attendance for ${preview.valid_rows} entry(ies).`)) return;

    setIsCommitting(true);
    setError(null);

    try {
      await apiService.commitAttendanceImport(preview.import_id);
      alert('Attendance imported successfully!');
      navigate('/attendance');
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
    const csvContent = `academic_year,classroom_code,subject_code,session_date,period_no,student_admission_number,status
2024-2025,1A,MATH,2024-09-15,1,S001,present
2024-2025,1A,MATH,2024-09-15,1,S002,absent
2024-2025,1A,MATH,2024-09-15,1,S003,present`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_import_template.csv';
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
            <Button variant="secondary" onClick={() => navigate('/attendance')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                Import Attendance from Excel
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Bulk import attendance records for multiple sessions
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
              Step 1: Select File
            </h2>

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
                        {preview.errors.slice(0, 50).map((err: any, i: number) => (
                          <div key={i} style={{ fontSize: '14px', color: '#dc2626', marginBottom: i < Math.min(preview.errors.length, 50) - 1 ? '8px' : 0 }}>
                            • Row {err.row}: {err.message}
                            {err.field && <span style={{ fontWeight: 600 }}> ({err.field})</span>}
                          </div>
                        ))}
                        {preview.errors.length > 50 && (
                          <div style={{ fontSize: '14px', color: '#dc2626', marginTop: '8px', fontStyle: 'italic' }}>
                            ... and {preview.errors.length - 50} more errors
                          </div>
                        )}
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
                        Validation passed! Ready to import {preview.valid_rows} attendance entry(ies).
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
                  <li><strong>Required columns:</strong> academic_year, classroom_code, subject_code, session_date, period_no, student_admission_number, status</li>
                  <li>Session date format: YYYY-MM-DD (e.g., 2024-09-15)</li>
                  <li>Period number: 1-10</li>
                  <li>Status values: present or absent</li>
                  <li>Students must be enrolled in the specified classroom</li>
                  <li>Sessions will be created automatically if they don't exist</li>
                  <li>Existing attendance entries will be updated</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
