/**
 * Timetable Image Upload Page
 * Simple interface for principals to upload timetable images by classroom
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiService } from '../services/api';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';

export function TimetableUpload() {
  const { user, logout } = useAuth();
  const { selectedYear } = useAcademicYear();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [timetableName, setTimetableName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, [selectedYear]);

  const loadClassrooms = async () => {
    if (!selectedYear) return;
    try {
      const response = await apiService.getClassrooms({ academic_year_id: selectedYear.id });
      setClassrooms(response.data);
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setError(null);
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedClassroom) {
      setError('Please select a classroom');
      return;
    }

    if (!timetableName.trim()) {
      setError('Please enter a timetable name');
      return;
    }

    if (!imageFile || !imagePreview) {
      setError('Please upload a timetable image');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        academic_year_id: selectedYear!.id,
        classroom_id: selectedClassroom,
        name: timetableName,
        image_url: imagePreview, // Base64 encoded image
        status: 'published', // Automatically publish
      };

      await apiService.createTimetable(data);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/timetable');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload timetable');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  if (!selectedYear) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Please select an academic year</p>
          <p style={{ fontSize: '14px' }}>Use the dropdown in the header to select a year</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/timetable')}
            style={{ marginBottom: '16px' }}
          >
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Back to Timetables
          </Button>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Upload Timetable Image
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Upload a timetable image for {selectedYear.label}
          </p>
        </div>

        {success && (
          <div style={{
            padding: '16px',
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            marginBottom: '24px',
            color: '#166534',
          }}>
            ✓ Timetable uploaded successfully! Redirecting...
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Classroom Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}>
                Select Classroom *
              </label>
              <select
                value={selectedClassroom}
                onChange={(e) => {
                  setSelectedClassroom(e.target.value);
                  const classroom = classrooms.find(c => c.id === e.target.value);
                  if (classroom) {
                    setTimetableName(`${classroom.classroom_code} Timetable`);
                  }
                }}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#0f172a',
                }}
                required
              >
                <option value="">-- Select a classroom --</option>
                {classrooms.map(classroom => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.classroom_code} - {classroom.grade_name} {classroom.division_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Timetable Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}>
                Timetable Name *
              </label>
              <input
                type="text"
                value={timetableName}
                onChange={(e) => setTimetableName(e.target.value)}
                placeholder="e.g., 11 A Timetable"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#0f172a',
                }}
                required
              />
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '8px',
              }}>
                Timetable Image *
              </label>
              
              {!imagePreview ? (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  transition: 'all 0.2s',
                }}>
                  <Upload size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
                  <p style={{ fontSize: '14px', color: '#475569', marginBottom: '4px', fontWeight: 500 }}>
                    Click to upload or drag and drop
                  </p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    PNG, JPG or JPEG (max 2MB)
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageSelect}
                    disabled={isSubmitting}
                    style={{ display: 'none' }}
                  />
                </label>
              ) : (
                <div style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={imagePreview}
                    alt="Timetable preview"
                    style={{ width: '100%', display: 'block' }}
                  />
                  {!isSubmitting && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '8px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <X size={16} />
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/timetable')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <ImageIcon size={16} style={{ marginRight: '8px' }} />
                {isSubmitting ? 'Uploading...' : 'Upload Timetable'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
