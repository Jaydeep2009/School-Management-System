/**
 * Notification Bell Component
 * 
 * Displays a bell icon with unread count badge in the header
 * Shows a dropdown with recent notifications when clicked
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Eye } from 'lucide-react';
import { apiService } from '../../services/api';
import type { UserNotification } from '../../types/notification';

export function NotificationBell() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load unread count on mount and periodically
  useEffect(() => {
    loadUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load notifications when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      loadRecentNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      setUnreadCount(response.count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadRecentNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getMyNotifications({
        page: 1,
        page_size: 10,
      });
      setNotifications(response.data || []);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      await apiService.markNotificationsAsRead({ notification_ids: [notificationId] });
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markNotificationsAsRead({ mark_all: true });
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '8px',
          background: 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f1f5f9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Bell size={20} color="#475569" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '400px',
          maxHeight: '500px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {unreadCount} unread
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#3b82f6',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '400px',
          }}>
            {isLoading && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                Loading...
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <Bell size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  No notifications yet
                </p>
              </div>
            )}

            {!isLoading && notifications.length > 0 && (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      background: notification.is_read ? 'transparent' : '#eff6ff',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = notification.is_read ? '#f8fafc' : '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notification.is_read ? 'transparent' : '#eff6ff';
                    }}
                    onClick={() => handleViewAll()}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {/* Priority Indicator */}
                      <div style={{
                        width: '4px',
                        borderRadius: '2px',
                        background: getPriorityColor(notification.priority),
                        flexShrink: 0,
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title and Time */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{
                            fontSize: '14px',
                            fontWeight: notification.is_read ? 500 : 600,
                            color: '#0f172a',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {notification.title}
                          </h4>
                          <span style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            flexShrink: 0,
                          }}>
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <p style={{
                          fontSize: '13px',
                          color: '#64748b',
                          margin: '0 0 8px 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.4',
                        }}>
                          {notification.message}
                        </p>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {notification.sender_name && (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              by {notification.sender_name}
                            </span>
                          )}

                          {!notification.is_read && (
                            <button
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              style={{
                                padding: '2px 8px',
                                fontSize: '11px',
                                color: '#3b82f6',
                                background: 'transparent',
                                border: '1px solid #3b82f6',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginLeft: 'auto',
                              }}
                            >
                              <Check size={12} />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e2e8f0',
            }}>
              <button
                onClick={handleViewAll}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#3b82f6',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Eye size={14} />
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
