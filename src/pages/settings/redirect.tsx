import { Navigate } from 'react-router-dom';

export default function SettingsRedirect() {
  return <Navigate to="/settings/profile" replace />;
}