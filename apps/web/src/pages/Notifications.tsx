/**
 * Notifications Page - View and Manage Notifications
 * 
 * For Principals: View all sent notifications with stats
 * For Teachers/Students: View received notifications
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Bell, Plus, Users, BookOpen, GraduationCap, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Notification } from '../types/notification';

export function Notifications() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'scheduled'>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (user?.role === 'principal') {
        // Principal sees all sent notifications
        const params: any = { page: 1, page_size: 100 };
        if (filter !== 'all') {
          params.status = filter;
        }
        
        const response = await apiService.getNotifications(params);
        setNotifications(response.data || []);
      } else {
        // Teachers/Students see their received notifications
        const response = await apiService.getMyNotifications({ page: 1, page_size: 100 });
        setNotifications(response.data || []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'all': return <Users size={16} />;
      case 'teachers': return <BookOpen size={16} />;
      case 'students': return <GraduationCap size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all': return 'All Users';
      case 'teachers': return 'Teachers';
      case 'students': return 'Students';
      default: return audience;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'normal': return '#3b82f6';
      case 'low': return '#64748b';
      default: return '#64748b';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return { label: 'Sent', color: '#10b981', bg: '#d1fae5', icon: <CheckCircle2 size={14} /> };
      case 'scheduled':
        return { label: 'Scheduled', color: '#3b82f6', bg: '#dbeafe', icon: <Clock size={14} /> };
      case 'failed':
        return { label: 'Failed', color: '#ef4444', bg: '#fee2e2', icon: <AlertCircle size={14} /> };
      default:
        return { label: status, color: '#64748b', bg: '#f1f5f9', icon: null };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) return null;

  const isPrincipal = user.role === 'principal';

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout} role={user.role}>
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          marginBottom: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell size={32} color="#3b82f6" />
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
                Notifications
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                {isPrincipal 
                  ? 'Manage and send notifications to your school'
                  : 'View notifications from your school'}
              </p>
            </div>
          </div>

          {isPrincipal && (
            <Button onClick={() => navigate('/notifications/new')}>
              <Plus size={16} style={{ marginRight: '8px' }} />
              Send Notification
            </Button>
          )}
        </div>

        {/* Filters (Principal only) */}
        {isPrincipal && (
          <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'sent' ? 'primary' : 'secondary'}
              onClick={() => setFilter('sent')}
            >
              Sent
            </Button>
            <Button
              variant={filter === 'scheduled' ? 'primary' : 'secondary'}
              onClick={() => setFilter('scheduled')}
            >
              Scheduled
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              Loading notifications...
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#ef4444', fontSize: '16px' }}>{error}</p>
              <Button onClick={loadNotifications} style={{ marginTop: '16px' }}>
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && notifications.length === 0 && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Bell size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '8px' }}>
                No notifications yet
              </p>
              {isPrincipal && (
                <>
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
                    Send your first notification to keep everyone informed
                  </p>
                  <Button onClick={() => navigate('/notifications/new')}>
                    <Plus size={16} style={{ marginRight: '8px' }} />
                    Send Notification
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Notifications List */}
        {!isLoading && !error && notifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((notification) => {
              const statusBadge = getStatusBadge(notification.status);
              const priorityColor = getPriorityColor(notification.priority);

              return (
                <Card key={notification.id}>
                  <div style={{ padding: '20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {/* Priority Indicator */}
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: priorityColor,
                          }} />
                          
                          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                            {notification.title}
                          </h3>
                        </div>

                        {/* Metadata */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          {/* Audience */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#64748b' }}>
                            {getAudienceIcon(notification.target_audience)}
                            <span>{getAudienceLabel(notification.target_audience)}</span>
                          </div>

                          {/* Date */}
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            {notification.sent_at 
                              ? formatDate(notification.sent_at)
                              : notification.scheduled_at 
                                ? `Scheduled: ${formatDate(notification.scheduled_at)}`
                                : formatDate(notification.created_at)}
                          </div>

                          {/* Sender (for non-principals) */}
                          {!isPrincipal && notification.sender_name && (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              by {notification.sender_name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        fontSize: '12px',
                        fontWeight: 500,
                      }}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </div>
                    </div>

                    {/* Message */}
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#475569',
                      lineHeight: '1.6',
                      marginBottom: isPrincipal ? '12px' : '0',
                    }}>
                      {notification.message}
                    </p>

                    {/* Stats (Principal only) */}
                    {isPrincipal && notification.status === 'sent' && (
                      <div style={{ 
                        display: 'flex',
                        gap: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid #e2e8f0',
                        fontSize: '13px',
                        color: '#64748b',
                      }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{notification.recipient_count || 0}</strong> recipients
                        </div>
                        <div>
                          <strong style={{ color: '#10b981' }}>{notification.read_count || 0}</strong> read
                        </div>
                        <div>
                          <strong style={{ color: '#64748b' }}>{notification.unread_count || 0}</strong> unread
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
