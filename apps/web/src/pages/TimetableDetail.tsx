/**
 * Timetable Detail Page - View Timetable Image
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
import { ArrowLeft, CheckCircle, Archive, Upload, Image as ImageIcon } from 'lucide-react';

export function TimetableDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const timetableRes = await apiService.getTimetable(id);
      setTimetable(timetableRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetable');
    } finally {
      setIsLoading(false);
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
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {timetable.name}
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {timetable.classroom_name} • {timetable.academic_year_name}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              background: isPublished ? '#dcfce7' : '#f1f5f9',
              color: isPublished ? '#166534' : '#64748b',
            }}>
              {status}
            </span>
            {isDraft && (
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

        {/* Timetable Image */}
        {timetable.image_url ? (
          <Card>
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
                Timetable
              </h2>
              <div style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                overflow: 'hidden',
                background: '#f8fafc'
              }}>
                <img
                  src={timetable.image_url}
                  alt="Timetable"
                  style={{ 
                    width: '100%', 
                    display: 'block',
                    maxHeight: '800px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = timetable.image_url;
                    link.download = `${timetable.name}.png`;
                    link.click();
                  }}
                >
                  Download Image
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/timetable/upload?edit=${id}`)}
                >
                  <Upload size={16} style={{ marginRight: '8px' }} />
                  Replace Image
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div style={{ 
              padding: '48px', 
              textAlign: 'center',
              color: '#64748b'
            }}>
              <ImageIcon size={64} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No Timetable Image
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '24px' }}>
                Upload a timetable image for this class
              </p>
              <Button onClick={() => navigate(`/timetable/upload?edit=${id}`)}>
                <Upload size={16} style={{ marginRight: '8px' }} />
                Upload Image
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
