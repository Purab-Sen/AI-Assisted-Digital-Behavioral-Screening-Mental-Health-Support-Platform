import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import api from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const { user, logout, isAdmin, isProfessional, ROLES } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])

  useEffect(() => {
    api.get('/users/my-notes')
      .then(res => setNotes(res.data || []))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="dashboard">
      <NavBar />

      <main className="dashboard-main">
        <div className="container">
          <section className="welcome-section">
            <h2>Good day, {user?.first_name} 👋</h2>
            <p>Here's your behavioral health dashboard</p>
          </section>

          {isAdmin && (
            <section className="admin-section">
              <div className="admin-banner">
                <span className="admin-badge">Admin</span>
                <p>You have full administrative access to the platform.</p>
                <Link to="/admin" className="btn btn-sm">Go to Admin Dashboard</Link>
              </div>
            </section>
          )}

          {isProfessional && !isAdmin && (
            <section className="professional-section">
              <div className="professional-banner">
                <span className="professional-badge">Professional</span>
                <p>Access your shared patients, notes, and consultation requests.</p>
                <Link to="/professional/patients" className="btn btn-sm">View Patients</Link>
              </div>
            </section>
          )}

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-icon-wrapper">
                <span className="card-icon">📋</span>
              </div>
              <h3>ASD Screening</h3>
              <p>Take the AQ-10 screening questionnaire to assess behavioral patterns and track results over time.</p>
              <Link to="/screening" className="btn btn-primary">Start Screening</Link>
            </div>

            <div className="dashboard-card">
              <div className="card-icon-wrapper">
                <span className="card-icon">✅</span>
              </div>
              <h3>Task Tracking</h3>
              <p>Complete interactive cognitive and behavioral tasks to assess your abilities.</p>
              <Link to="/tasks" className="btn btn-primary">Go to Tasks</Link>
            </div>

            <div className="dashboard-card">
              <div className="card-icon-wrapper">
                <span className="card-icon">📔</span>
              </div>
              <h3>Journal</h3>
              <p>Record your daily thoughts, mood, and stress levels for longitudinal insights.</p>
              <Link to="/journal" className="btn btn-primary">Open Journal</Link>
            </div>

            <div className="dashboard-card">
              <div className="card-icon-wrapper">
                <span className="card-icon">📊</span>
              </div>
              <h3>Analysis</h3>
              <p>View your behavioral analysis, trends, and AI-powered personalized insights.</p>
              <button className="btn btn-secondary" disabled>Coming Soon</button>
            </div>

            <div className="dashboard-card">
              <div className="card-icon-wrapper">
                <span className="card-icon">💡</span>
              </div>
              <h3>Resources</h3>
              <p>Access curated resources, guides, and support materials tailored to your needs.</p>
              <Link to="/resources" className="btn btn-primary">View Resources</Link>
            </div>

            <div className="dashboard-card">
              <div className="card-icon-wrapper">
                <span className="card-icon">👨‍⚕️</span>
              </div>
              <h3>Professional Support</h3>
              <p>Connect with verified mental health professionals and share your screening data.</p>
              <Link to="/connect-professional" className="btn btn-primary">Find a Professional</Link>
            </div>
          </div>

          {/* Professional Notes */}
          {notes.length > 0 && (
            <section className="notes-section">
              <h3 className="notes-title">Notes from Your Professional</h3>
              <div className="notes-list">
                {notes.map(note => (
                  <div key={note.id} className="note-card">
                    <div className="note-header">
                      <span className="note-professional">{note.professional_name}</span>
                      <span className="note-date">{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="note-content">{note.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
