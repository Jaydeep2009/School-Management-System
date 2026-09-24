/**
 * Attendance Overview Component - Donut Chart
 */

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { ClipboardCheck } from 'lucide-react';
import './AttendanceOverview.css';

interface AttendanceData {
  present: number;
  absent: number;
  notMarked: number;
}

interface AttendanceOverviewProps {
  data?: AttendanceData;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  notMarked: '#94a3b8',
};

export function AttendanceOverview({ data, loading, error, onRetry }: AttendanceOverviewProps) {
  if (loading) {
    return (
      <Card title="Today's Attendance">
        <div style={{ padding: '24px' }}>
          <Skeleton height={200} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Today's Attendance">
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!data || (data.present === 0 && data.absent === 0 && data.notMarked === 0)) {
    return (
      <Card title="Today's Attendance">
        <EmptyState
          icon={<ClipboardCheck size={32} />}
          title="No attendance data"
          description="No attendance has been recorded today"
        />
      </Card>
    );
  }

  const total = data.present + data.absent + data.notMarked;
  const presentPercentage = total > 0 ? ((data.present / total) * 100).toFixed(1) : '0';

  const chartData = [
    { name: 'Present', value: data.present, color: COLORS.present },
    { name: 'Absent', value: data.absent, color: COLORS.absent },
    { name: 'Not Marked', value: data.notMarked, color: COLORS.notMarked },
  ].filter(item => item.value > 0);

  return (
    <Card title="Today's Attendance">
      <div className="attendance-overview">
        <div className="attendance-chart">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="attendance-chart-center">
            <div className="attendance-percentage">{presentPercentage}%</div>
            <div className="attendance-label">Present</div>
          </div>
        </div>

        <div className="attendance-legend">
          <div className="attendance-legend-item">
            <div 
              className="attendance-legend-color" 
              style={{ background: COLORS.present }}
            />
            <div className="attendance-legend-info">
              <div className="attendance-legend-label">Present</div>
              <div className="attendance-legend-value">{data.present}</div>
            </div>
          </div>

          <div className="attendance-legend-item">
            <div 
              className="attendance-legend-color" 
              style={{ background: COLORS.absent }}
            />
            <div className="attendance-legend-info">
              <div className="attendance-legend-label">Absent</div>
              <div className="attendance-legend-value">{data.absent}</div>
            </div>
          </div>

          <div className="attendance-legend-item">
            <div 
              className="attendance-legend-color" 
              style={{ background: COLORS.notMarked }}
            />
            <div className="attendance-legend-info">
              <div className="attendance-legend-label">Not Marked</div>
              <div className="attendance-legend-value">{data.notMarked}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
