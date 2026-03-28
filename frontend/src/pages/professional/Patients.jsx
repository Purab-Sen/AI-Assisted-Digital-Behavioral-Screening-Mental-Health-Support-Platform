import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import NavBar from '../../components/NavBar'
import './Patients.css'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { fetchPatients() }, [])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const res = await api.get('/professional/patients')
      setPatients(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div className="patients-page">
      <NavBar />

      <div className="page-content">
        <h1 className="page-title">Shared Patients</h1>
        <p className="page-subtitle">Patients who have shared their data with you</p>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>{error}</div>
        ) : (
          <div className="section-card">
            {patients.length === 0 ? (
              <div className="empty-patients">
                <span style={{ fontSize: 48 }}>👤</span>
                <p>No shared patients yet.</p>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Patients will appear here once they share their data with you.</p>
              </div>
            ) : (
              <div className="patient-list">
                {patients.map(p => (
                  <div key={p.user_id} className="patient-row">
                    <div className="patient-avatar">{(p.first_name?.[0] || '?').toUpperCase()}</div>
                    <div className="patient-info">
                      <div className="patient-name">{p.first_name} {p.last_name}</div>
                      <div className="patient-email">{p.email}</div>
                    </div>
                    <Link to={`/professional/patients/${p.user_id}`} className="patient-link">View Details →</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
