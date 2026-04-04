import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../utils/adminAuth';

interface ProtectedAdminRouteProps {
  children: ReactElement;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
