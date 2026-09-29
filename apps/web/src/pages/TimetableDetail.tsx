/**
 * Timetable Detail Page - View and Edit Timetable Entries
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Edit, Save, CheckCircle, Archive, Upload, Image as ImageIcon } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Period 8'];

export function TimetableDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const [timetableRes, entriesRes, subjectsRes, teachersRes] = await Promise.all([
        apiService.getTimetable(id),
        apiService.getTimetableEntries(id),
        apiService.getSubjects(),
        apiService.getTeachers(),
      ]);
      
      setTimetable(timetableRes.data);
      setEntries(entriesRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  const getEntry = (day: string, period: string) => {
    return entries.find(e => e.day_of_week === day && e.period_name === period);
  };

  const updateEntry = (day: string, period: string, field: string, value: any) => {
    setEntries(prev => {
      const existing = prev.find(e => e.day_of_week === day && e.period_name === period);
      if (existing) {
        return prev.map(e =>
          e.day_of_week === day && e.period_name === period
            ? { ...e, [field]: value }
            : e
        );
      } else {
        return [...prev, { day_of_week: day, period_name: period, [field]: value }];
      }
    });
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await apiService.updateTimetableEntries(id, entries);
      await loadData();
      setIsEditing(false);
      alert('Timetable saved successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save timetable');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !confirm('Publish this timetable? It will become active for students and teachers.')) return;
    setIsActionLoading(true);
    try {
      await apiService.publishTimetable(id);
      await loadData();
      alert('Timetable published successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish timetable');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!id || !confirm('Archive this timetable? It will no longer be active.')) return;
    setIsActionLoading(true);
    try {
      await apiService.archiveTimetable(id);
      await loadData();
      alert('Timetable archived successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive timetable');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Invalid file type. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!id || !selectedImage) return;
    
    setIsUploadingImage(true);
    try {
      await apiService.uploadTimetableImage(id, selectedImage);
      await loadData();
      setSelectedImage(null);
      setImagePreview(null);
      alert('Image uploaded successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="500px" />
        </div>
      </Layout>
    );
  }

  if (error || !timetable) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Timetable not found'} onRetry={loadData} />
        </div>
      </Layout>
    );
  }

  const status = timetable.status || 'draft';
  const isDraft = status === 'draft';
  const isPublished = status === 'published';

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/timetable')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                  {timetable.name}
                </h1>
                {isDraft && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#f1f5f9',
                    color: '#64748b',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Draft
                  </span>
                )}
                {isPublished && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#dcfce7',
                    color: '#166534',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Published
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {timetable.classroom_name}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isEditing && isDraft && (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                <Edit size={16} style={{ marginRight: '8px' }} />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="secondary" onClick={() => { setIsEditing(false); loadData(); }}>
                  Cancel
                </Button>
              </>
            )}
            {isDraft && !isEditing && (
              <Button onClick={handlePublish} disabled={isActionLoading}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                Publish
              </Button>
            )}
            {isPublished && (
              <Button variant="secondary" onClick={handleArchive} disabled={isActionLoading}>
                <Archive size={16} style={{ marginRight: '8px' }} />
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Image Display/Upload Section */}
        {timetable?.image_url && user.role !== 'principal' && (
          <Card>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Timetable Image
              </h3>
              <div style={{ textAlign: 'center' }}>
                <a 
                  href={`https://sms-api.nmvpmsms.workers.dev${timetable.image_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block' }}
                >
                  <img 
                    src={`https://sms-api.nmvpmsms.workers.dev${timetable.image_url}`}
                    alt="Timetable" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '600px', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  />
                </a>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                  Click image to view full size in new tab
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Image Upload Section - Principal Only */}
        {user.role === 'principal' && (
          <Card>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Timetable Image
              </h3>
              
              {timetable?.image_url ? (
                <div style={{ marginBottom: '16px' }}>
                  <img 
                    src={`https://sms-api.nmvpmsms.workers.dev${timetable.image_url}`}
                    alt="Timetable" 
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
                    Current timetable image (click to view full size)
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  No image uploaded yet
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label 
                    htmlFor="image-upload" 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#0f172a',
                    }}
                  >
                    <ImageIcon size={16} style={{ marginRight: '8px' }} />
                    Select Image
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                  />
                  <span style={{ marginLeft: '12px', fontSize: '14px', color: '#64748b' }}>
                    {selectedImage ? selectedImage.name : 'JPEG, PNG, or WebP (max 5MB)'}
                  </span>
                </div>

                {imagePreview && (
                  <div>
                    <img 
                      src={imagePreview}
                      alt="Preview" 
                      style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                )}

                {selectedImage && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button onClick={handleImageUpload} disabled={isUploadingImage}>
                      <Upload size={16} style={{ marginRight: '8px' }} />
                      {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div style={{ padding: '24px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 600, color: '#64748b', background: '#f8fafc' }}>
                    Period / Day
                  </th>
                  {DAYS.map(day => (
                    <th key={day} style={{ padding: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 600, color: '#64748b', background: '#f8fafc' }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(period => (
                  <tr key={period}>
                    <td style={{ padding: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 500, color: '#0f172a', background: '#f8fafc' }}>
                      {period}
                    </td>
                    {DAYS.map(day => {
                      const entry = getEntry(day, period);
                      return (
                        <td key={`${day}-${period}`} style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <select
                                value={entry?.subject_id || ''}
                                onChange={(e) => updateEntry(day, period, 'subject_id', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  fontSize: '12px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                }}
                              >
                                <option value="">-</option>
                                {subjects.map(s => (
                                  <option key={s.id} value={s.id}>{s.subject_name}</option>
                                ))}
                              </select>
                              <select
                                value={entry?.teacher_id || ''}
                                onChange={(e) => updateEntry(day, period, 'teacher_id', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  fontSize: '12px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                }}
                              >
                                <option value="">-</option>
                                {teachers.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div style={{ fontSize: '13px' }}>
                              {entry?.subject_name && (
                                <div style={{ fontWeight: 500, color: '#0f172a' }}>{entry.subject_name}</div>
                              )}
                              {entry?.teacher_name && (
                                <div style={{ color: '#64748b', fontSize: '12px' }}>{entry.teacher_name}</div>
                              )}
                              {!entry?.subject_name && <div style={{ color: '#cbd5e1' }}>—</div>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}





