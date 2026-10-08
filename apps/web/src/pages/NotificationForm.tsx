/**
 * Notification Form Page - Create and Send Notifications
 * 
 * Principal can send notifications to:
 * - All users (principals, teachers, students)
 * - Teachers only
 * - Students only
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Send, Users, GraduationCap, BookOpen, AlertCircle, Info } from 'lucide-react';
import type { TargetAudience } from '../types/notification';

interface FormData {
  title: string;
  message: string;
  target_audience: TargetAudience;
  push_notification_enabled: boolean;
}

export function NotificationForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    message: '',
    target_audience: 'all',
    push_notification_enabled: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.message.trim()) {
      setError('Message is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: any = {
        title: formData.title,
        message: formData.message,
        target_audience: formData.target_audience,
      };

      // Push notifications (for future webapp)
      if (formData.push_notification_enabled) {
        data.push_notification_enabled = true;
      }

      await apiService.createNotification(data);

      setSuccess('Notification sent successfully!');

      // Reset form
      setFormData({
        title: '',
        message: '',
        target_audience: 'all',
        push_notification_enabled: false,
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/notifications');
      }, 2000);
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  const audienceOptions = [
    { value: 'all', label: 'All Users', icon: Users, description: 'Send to principals, teachers, and students' },
    { value: 'teachers', label: 'Teachers Only', icon: BookOpen, description: 'Send to all teachers' },
    { value: 'students', label: 'Students Only', icon: GraduationCap, description: 'Send to all students' },
  ] as const;

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user.role}>
      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/notifications')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              Send Notification
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Create and send a notification to selected audience
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {/* Error Message */}
            {error && (
              <div style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '24px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{
                padding: '12px',
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                color: '#065f46',
                marginBottom: '24px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Info size={16} />
                {success}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Target Audience */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '12px' }}>
                  Target Audience <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                  {audienceOptions.map(option => {
                    const Icon = option.icon;
                    const isSelected = formData.target_audience === option.value;
                    return (
                      <div
                        key={option.value}
                        onClick={() => updateField('target_audience', option.value)}
                        style={{
                          padding: '16px',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isSelected ? '#eff6ff' : '#fff',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <Icon size={20} color={isSelected ? '#3b82f6' : '#64748b'} />
                          <span style={{ fontWeight: 500, color: isSelected ? '#3b82f6' : '#0f172a' }}>
                            {option.label}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', marginLeft: '32px' }}>
                          {option.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., School Holiday Notice"
                  maxLength={200}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {formData.title.length}/200 characters
                </p>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Message <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Write your notification message..."
                  maxLength={2000}
                  rows={6}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {formData.message.length}/2000 characters
                </p>
              </div>

              {/* Push Notifications (Future Feature) */}
              <div style={{
                padding: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.push_notification_enabled}
                    onChange={(e) => updateField('push_notification_enabled', e.target.checked)}
                    disabled={isSubmitting}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                      Enable Push Notifications
                    </span>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Send push notifications when webapp is launched (future feature)
                    </p>
                  </div>
                </label>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Send size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Sending...' : 'Send Notification'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/notifications')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
