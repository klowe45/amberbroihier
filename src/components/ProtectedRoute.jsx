import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

export default function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        Loading…
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />
  }

  return children
}
