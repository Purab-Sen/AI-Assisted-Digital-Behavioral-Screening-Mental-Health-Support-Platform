import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import './Dashboard.css'

function Dashboard() {
  const { user, logout, isAdmin, isProfessional, ROLES } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <h1 className="logo">ASD Platform</h1>
          <nav className="nav">
            <span className="user-name">Welcome, {user?.first_name}</span>
            {user?.role && (
              <span className="user-role">({user.role})</span>
            )}
            {isAdmin && (
              <Link to="/admin" className="btn btn-secondary admin-link">
                Admin
              </Link>
            )}
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          <section className="welcome-section">
            <h2>Dashboard</h2>
            <p>Welcome to the ASD Screening & Support Platform</p>
          </section>

          {/* Admin Quick Stats - Only visible to admins */}
          {isAdmin && (
            <section className="admin-section">
              <div className="admin-banner">
                <span className="admin-badge">Admin</span>
                <p>You have administrative access.</p>
                <Link to="/admin" className="btn btn-primary">
                  Go to Admin Dashboard
                </Link>
              </div>
            </section>
          )}

          {/* Professional Quick Access - Only visible to professionals */}
          {isProfessional && !isAdmin && (
            <section className="professional-section">
              <div className="professional-banner">
                <span className="professional-badge">Professional</span>
                <p>Access shared patient data and add notes.</p>
                <Link to="/professional/patients" className="btn btn-primary">
                  View Patients
                </Link>
              </div>
            </section>
          )}

          <div className="dashboard-grid">
            <div className="card dashboard-card">
              <div className="card-icon">📋</div>
              <h3>ASD Screening</h3>
              <p>Take the AQ-10 screening questionnaire to assess behavioral patterns.</p>
              <Link to="/screening" className="btn btn-primary">Start Screening</Link>
            </div>

            <div className="card dashboard-card">
              <div className="card-icon">✅</div>
              <h3>Task Tracking</h3>
              <p>Complete behavioral tasks and track your progress over time.</p>
              <Link to="/tasks" className="btn btn-primary">Go to Tasks</Link>
            </div>

            <div className="card dashboard-card">
              <div className="card-icon">📔</div>
              <h3>Journal</h3>
              <p>Record your daily thoughts, mood, and stress levels.</p>
              <button className="btn btn-primary" disabled>Coming Soon</button>
            </div>

            <div className="card dashboard-card">
              <div className="card-icon">📊</div>
              <h3>Analysis</h3>
              <p>View your behavioral analysis and personalized insights.</p>
              <button className="btn btn-primary" disabled>Coming Soon</button>
            </div>

            <div className="card dashboard-card">
              <div className="card-icon">💡</div>
              <h3>Resources</h3>
              <p>Access recommended resources and support materials.</p>
              <button className="btn btn-primary" disabled>Coming Soon</button>
            </div>

            <div className="card dashboard-card">
              <div className="card-icon">👨‍⚕️</div>
              <h3>Professional Support</h3>
              <p>Connect with mental health professionals for guidance.</p>
              <button className="btn btn-primary" disabled>Coming Soon</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
