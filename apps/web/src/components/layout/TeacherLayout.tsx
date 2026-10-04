/**
 * Teacher Layout Wrapper
 * Automatically detects if teacher is a class teacher and passes to Layout
 */

import { ReactNode } from 'react';
import { Layout } from './Layout';
import { useIsClassTeacher } from '../../hooks/useIsClassTeacher';

interface TeacherLayoutProps {
  schoolName: string;
  principalName: string;
  onLogout: () => void;
  children: ReactNode;
}

export function TeacherLayout({
  schoolName,
  principalName,
  onLogout,
  children,
}: TeacherLayoutProps) {
  const { isClassTeacher } = useIsClassTeacher();

  return (
    <Layout
      schoolName={schoolName}
      principalName={principalName}
      onLogout={onLogout}
      role="teacher"
      isClassTeacher={isClassTeacher}
    >
      {children}
    </Layout>
  );
}
