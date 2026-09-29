/**
 * Quick Actions Component
 */

import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  DollarSign, 
  TrendingUp 
} from 'lucide-react';
import { Card } from '../ui/Card';
import './QuickActions.css';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: UserPlus,
      label: 'Add Student',
      color: '#2563eb',
      path: '/students/new',
    },
    {
      icon: GraduationCap,
      label: 'Add Teacher',
      color: '#7c3aed',
      path: '/teachers/new',
    },
    {
      icon: BookOpen,
      label: 'Create Class',
      color: '#059669',
      path: '/academic-structure/classes/new',
    },
    {
      icon: FileText,
      label: 'Create Assignment',
      color: '#dc2626',
      path: '/assignments/new',
    },
    {
      icon: DollarSign,
      label: 'Manage Fees',
      color: '#ea580c',
      path: '/fees',
    },
    {
      icon: TrendingUp,
      label: 'Run Promotion',
      color: '#0891b2',
      path: '/promotions/new',
    },
  ];

  return (
    <Card title="Quick Actions">
      <div className="quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="quick-action-button"
              onClick={() => navigate(action.path)}
              title={action.label}
            >
              <div 
                className="quick-action-icon"
                style={{ background: `${action.color}15`, color: action.color }}
              >
                <Icon size={20} />
              </div>
              <span className="quick-action-label">{action.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
