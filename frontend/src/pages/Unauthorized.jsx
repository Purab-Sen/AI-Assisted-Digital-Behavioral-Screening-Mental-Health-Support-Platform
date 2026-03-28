import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Unauthorized.css'

function Unauthorized() {
  const { user } = useAuth()

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <span className="unauthorized-icon">🔒</span>
        <h1>Access Denied</h1>
        <p>Sorry, you don't have permission to access this page.</p>
        {user && (
          <div style={{ margin: '12px 0' }}>
            Your current role: <span className="role-pill">{user.role}</span>
          </div>
        )}
        <div className="unauthorized-actions">
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
        </div>
        <p className="unauthorized-note">If you believe this is an error, please contact support.</p>
      </div>
    </div>
  )
}

export default Unauthorized
