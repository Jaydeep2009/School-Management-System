/**
 * Simple Timetable Upload Page
 * Upload Excel file → Parse → Save to database → Display to teachers/students
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Calendar } from 'lucide-react';
import { apiService } from '../services/api';

interface PeriodTiming {
  id: string;
  period_no: number;
  start_time: string;
  end_time: string;
  label: string | null;
  is_break: number;
}

export function TimetableUploadSimple() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [classroom, setClassroom] = useState('');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [periodTimings, setPeriodTimings] = useState<PeriodTiming[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Load classrooms and period timings on mount
  useEffect(() => {
    loadClassrooms();
    loadPeriodTimings();
  }, [selectedYear]);

  const loadClassrooms = async () => {
    try {
      const response = await apiService.getClassrooms();
      setClassrooms(response.data || []);
    } catch (err) {
      console.error('Failed to load classrooms', err);
    }
  };

  const loadPeriodTimings = async () => {
    if (!selectedYear) return;
    
    try {
      const response = await apiService.getPeriodTimings(selectedYear.id);
      setPeriodTimings(response.data.sort((a: PeriodTiming, b: PeriodTiming) => a.period_no - b.period_no));
    } catch (err) {
      console.error('Failed to load period timings', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setMessage('');
      } else {
        alert('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !classroom) {
      alert('Please select a classroom and file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('classroom_id', classroom);
      formData.append('academic_year_id', selectedYear?.id || '');

      // Use apiService's base URL to construct the full API URL
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sms-api.nmvpmsms.workers.dev';
      const token = localStorage.getItem('accessToken') || localStorage.getItem('superAdminToken');
      
      const response = await fetch(`${API_BASE_URL}/timetables/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      setUploadStatus('success');
      setMessage('Timetable uploaded successfully! Students and teachers can now view it.');
      
      // Reset form
      setTimeout(() => {
        navigate('/timetable');
      }, 2000);
      
    } catch (err) {
      setUploadStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to upload timetable');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    if (periodTimings.length === 0) {
      alert('Please set up period timings first by clicking "Period Setup"');
      return;
    }

    // Generate headers dynamically from period timings
    const headers = ['Day'];
    periodTimings.forEach(period => {
      const label = period.label || `Period ${period.period_no}`;
      const timeRange = `${period.start_time}-${period.end_time}`;
      headers.push(`${label} (${timeRange})`);
    });

    // Create sample template content with dynamic periods
    const rows = [
      headers.join(','),
      'Monday,' + periodTimings.map(p => p.is_break ? 'Break' : 'English (Mr. Smith)').join(','),
      'Tuesday,' + periodTimings.map(p => p.is_break ? 'Break' : 'Math (Ms. Johnson)').join(','),
      'Wednesday,' + periodTimings.map(p => p.is_break ? 'Break' : 'Physics (Mr. Brown)').join(','),
      'Thursday,' + periodTimings.map(p => p.is_break ? 'Break' : 'Chemistry (Ms. Davis)').join(','),
      'Friday,' + periodTimings.map(p => p.is_break ? 'Break' : 'History (Mr. Wilson)').join(','),
      'Saturday,' + periodTimings.map(p => p.is_break ? 'Break' : 'Free').join(','),
    ];

    const template = rows.join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
          Upload Timetable
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Upload an Excel or CSV file with your timetable
        </p>

        {/* Instructions Card */}
        <div style={{ marginBottom: '24px' }}>
          <Card>
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                How to upload:
              </h3>
              <ol style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8', paddingLeft: '20px' }}>
                <li><strong>Set up periods first</strong> - Go to Period Setup to configure period timings</li>
                <li>Download the template below (it will include your period timings)</li>
                <li>Fill in your timetable with subjects and teacher names</li>
                <li>Format: "Subject Name (Teacher Name)" in each cell</li>
                <li>Select the classroom this timetable is for</li>
                <li>Upload your completed file</li>
              </ol>
              
              {periodTimings.length === 0 ? (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '6px',
                  color: '#c2410c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={20} />
                  <span>Please set up period timings first</span>
                </div>
              ) : (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <Button 
                    variant="secondary" 
                    onClick={downloadTemplate}
                  >
                    <Download size={16} style={{ marginRight: '8px' }} />
                    Download Template ({periodTimings.length} periods)
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate('/period-setup')}
                  >
                    <Calendar size={16} style={{ marginRight: '8px' }} />
                    Period Setup
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Upload Form */}
        <Card>
          <div style={{ padding: '24px' }}>
            {/* Loading Overlay */}
            {isUploading && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}>
                <div style={{
                  background: 'white',
                  padding: '32px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  minWidth: '300px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    border: '4px solid #e2e8f0',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <style>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                    Uploading Timetable
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>
                    Please wait while we process your file...
                  </p>
                </div>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div style={{
                padding: '12px 16px',
                background: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: '6px',
                color: '#166534',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={20} />
                {message}
              </div>
            )}

            {uploadStatus === 'error' && (
              <div style={{
                padding: '12px 16px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={20} />
                {message}
              </div>
            )}

            {/* Classroom Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Select Classroom <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: 'white'
                }}
              >
                <option value="">Choose a classroom...</option>
                {classrooms.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.grade_name + ' ' + c.division_name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '8px' }}>
                Upload File <span style={{ color: '#dc2626' }}>*</span>
              </label>
              
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '32px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                {selectedFile ? (
                  <div>
                    <FileSpreadsheet size={48} style={{ color: '#3b82f6', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>
                      Click to upload or drag and drop
                    </p>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>
                      Excel (.xlsx, .xls) or CSV files
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !classroom || isUploading}
                style={{ flex: 1 }}
              >
                <Upload size={16} style={{ marginRight: '8px' }} />
                {isUploading ? 'Uploading...' : 'Upload Timetable'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/timetable')}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
