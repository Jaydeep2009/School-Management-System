/**
 * Assignment Detail Page with Attachment Management
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TeacherLayout } from '../components/layout/TeacherLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Edit, Upload, Download, Trash2, FileText, CheckCircle, XCircle } from 'lucide-react';

export function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  useEffect(() => {
    loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getAssignment(id);
      setAssignment(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      await apiService.uploadAssignmentAttachment(id, file);
      await loadAssignment();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    if (!id) return;
    try {
      const response = await apiService.getAssignmentAttachmentUrl(id, attachmentId);
      const url = response.data.url;
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id || !confirm('Delete this attachment?')) return;
    
    setDeletingAttachmentId(attachmentId);
    try {
      // Backend delete endpoint: DELETE /assignments/:id/attachments/:attachmentId
      await apiService.deleteAssignmentAttachment(id, attachmentId);
      await loadAssignment();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete attachment');
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handlePublish = async () => {
    if (!id || !confirm('Publish this assignment? Students will be able to see it.')) return;
    setIsActionLoading(true);
    try {
      await apiService.publishAssignment(id);
      await loadAssignment();
      alert('Assignment published successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish assignment');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!id || !confirm('Close this assignment? No further submissions will be accepted.')) return;
    setIsActionLoading(true);
    try {
      await apiService.closeAssignment(id);
      await loadAssignment();
      alert('Assignment closed successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to close assignment');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <TeacherLayout schoolName={'SMS'} principalName="Teacher" onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <Skeleton height="300px" />
        </div>
      </TeacherLayout>
    );
  }

  if (error || !assignment) {
    return (
      <TeacherLayout schoolName={'SMS'} principalName="Teacher" onLogout={logout}>
        <div style={{ padding: '32px' }}>
          <ErrorState message={error || 'Assignment not found'} onRetry={loadAssignment} />
        </div>
      </TeacherLayout>
    );
  }

  const status = assignment.status || 'draft';
  const isDraft = status === 'draft';
  const isPublished = status === 'published';
  const isClosed = status === 'closed';
  const attachments = assignment.attachments || [];

  return (
    <TeacherLayout schoolName={'SMS'} principalName="Teacher" onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <Button variant="secondary" onClick={() => navigate('/teacher/assignments')}>
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                  {assignment.title}
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
                {isClosed && (
                  <span style={{
                    padding: '4px 12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    Closed
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {assignment.classroom_name} • {assignment.subject_name}
                {assignment.due_date && ` • Due: ${new Date(assignment.due_date).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isDraft && (
              <Button variant="secondary" onClick={() => navigate(`/teacher/assignments/${id}/edit`)}>
                <Edit size={16} style={{ marginRight: '8px' }} />
                Edit
              </Button>
            )}
            {isDraft && (
              <Button onClick={handlePublish} disabled={isActionLoading}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                Publish
              </Button>
            )}
            {isPublished && (
              <Button variant="secondary" onClick={handleClose} disabled={isActionLoading}>
                <XCircle size={16} style={{ marginRight: '8px' }} />
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <div style={{ marginBottom: '24px' }}>
            <Card>
              <div style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
                  Description
                </h2>
                <p style={{ fontSize: '14px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {assignment.description}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Attachments */}
        <Card>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                Attachments ({attachments.length})
              </h2>
              {isDraft && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload size={16} style={{ marginRight: '8px' }} />
                    {isUploading ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>
              )}
            </div>

            {attachments.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No attachments yet</p>
                {isDraft && <p style={{ fontSize: '14px', marginTop: '8px' }}>Click "Upload File" to add attachments</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FileText size={20} style={{ color: '#64748b' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                          {attachment.filename || attachment.original_filename || 'Unnamed file'}
                        </div>
                        {attachment.file_size && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="secondary"
                        onClick={() => handleDownload(attachment.id, attachment.filename || attachment.original_filename || 'download')}
                      >
                        <Download size={16} />
                      </Button>
                      {isDraft && (
                        <Button
                          variant="secondary"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          disabled={deletingAttachmentId === attachment.id}
                        >
                          <Trash2 size={16} style={{ color: '#dc2626' }} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </TeacherLayout>
  );
}





