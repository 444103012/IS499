import { Navigate } from 'react-router-dom';

/** Legacy path → error handling (bookmark-safe). */
export default function AdminOperationsPage() {
  return <Navigate to="/admin/dashboard/error-handling" replace />;
}
