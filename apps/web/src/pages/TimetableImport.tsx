/**
 * Timetable Import Page - Upload and Import Timetables from Excel
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export function TimetableImport() {
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
      const response = await apiService.previewTimetableImport(file);
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

    if (!confirm('Commit this import? This will create the timetable and all entries.')) return;

    setIsCommitting(true);
    setError(null);

    try {
      await apiService.commitTimetableImport(preview.import_id);
      alert('Timetable imported successfully!');
      navigate('/timetable');
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

  if (!user) return null;

  const hasErrors = preview?.errors && preview.errors.length > 0;
  const hasWarnings = preview?.warnings && preview.warnings.length > 0;
  const canCommit = preview && !hasErrors;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/timetable')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              Import Timetable from Excel
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              Upload an Excel file to import timetable data
            </p>
          </div>
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
                accept=".xlsx,.xls"
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a' }}>
                        {preview.total_entries || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>Total Entries</div>
                    </div>
                    <div style={{ padding: '16px', background: hasErrors ? '#fee2e2' : '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: hasErrors ? '#dc2626' : '#0f172a' }}>
                        {preview.errors?.length || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: hasErrors ? '#dc2626' : '#64748b' }}>Errors</div>
                    </div>
                    <div style={{ padding: '16px', background: hasWarnings ? '#fef3c7' : '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 600, color: hasWarnings ? '#92400e' : '#0f172a' }}>
                        {preview.warnings?.length || 0}
                      </div>
                      <div style={{ fontSize: '14px', color: hasWarnings ? '#92400e' : '#64748b' }}>Warnings</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {hasErrors && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <XCircle size={20} style={{ color: '#dc2626' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626' }}>Errors</h3>
                      </div>
                      <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px' }}>
                        {preview.errors.map((err: any, i: number) => (
                          <div key={i} style={{ fontSize: '14px', color: '#dc2626', marginBottom: i < preview.errors.length - 1 ? '8px' : 0 }}>
                            • {err.message || err}
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
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400e' }}>Warnings</h3>
                      </div>
                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px' }}>
                        {preview.warnings.map((warn: any, i: number) => (
                          <div key={i} style={{ fontSize: '14px', color: '#92400e', marginBottom: i < preview.warnings.length - 1 ? '8px' : 0 }}>
                            • {warn.message || warn}
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
                        Validation passed! Ready to import.
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
                  <li>Excel file should contain columns for: Day, Period, Subject, Teacher, Start Time, End Time</li>
                  <li>Day should be: Monday, Tuesday, Wednesday, Thursday, Friday, or Saturday</li>
                  <li>Period should be a number (1-8) or name (Period 1, Period 2, etc.)</li>
                  <li>Times should be in HH:MM format (e.g., 09:00, 14:30)</li>
                  <li>Subject and Teacher names should match existing records in the system</li>
                </ul>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}





