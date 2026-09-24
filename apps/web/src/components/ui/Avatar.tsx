/**
 * Avatar Component
 */

import { cn, getInitials } from '../../lib/utils';
import './Avatar.css';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Avatar({ name, src, size = 'medium', className }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className={cn('avatar', `avatar-${size}`, className)}>
      {src ? (
        <img src={src} alt={name} className="avatar-image" />
      ) : (
        <span className="avatar-initials">{initials}</span>
      )}
    </div>
  );
}
