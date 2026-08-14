import { Navigate, useParams } from 'react-router-dom';

export default function ProjectRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${projectId}/overview`} replace />;
}