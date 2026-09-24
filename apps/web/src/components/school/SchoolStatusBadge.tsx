/**
 * School Status Badge Component
 */

import { Badge } from '../ui/Badge';
import type { SchoolStatus } from '../../types/super-admin';

interface SchoolStatusBadgeProps {
  status: SchoolStatus;
}

export function SchoolStatusBadge({ status }: SchoolStatusBadgeProps) {
  const variant =
    status === 'active' ? 'success' : status === 'suspended' ? 'warning' : 'default';

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <Badge variant={variant}>{label}</Badge>;
}
