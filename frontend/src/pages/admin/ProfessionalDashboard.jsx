import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from "../../services/api"
import "./ProfessionalDashboard.css"

function ProfessionalDashboard() {
  const [stats, setStats] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProfessionalData()
  }, [])

  const fetchProfessionalData = async () => {
    try {
      setLoading(true)
      const [statsRes, patientsRes] = await Promise.all([
        api.get('/professional/stats'),
        api.get('/professional/patients')
      ])
      setStats(statsRes.data)
      setPatients(patientsRes.data)
    } catch (err) {
      setError('Failed to load professional data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="professional-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Professional Dashboard</h1>
        <p className="mt-2 text-gray-600">Patient data and professional actions</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-8">
        <StatCard 
          title="Total Patients" 
          value={stats?.total_patients || 0}
          subtitle={stats?.active_patients ? `${stats.active_patients} active` : null}
          color="green"
        />
        <StatCard 
          title="Screenings" 
          value={stats?.total_screenings || 0}
          subtitle={stats?.completed_screenings ? `${stats.completed_screenings} completed` : null}
          color="blue"
        />
        <StatCard 
          title="Journal Entries" 
          value={stats?.total_journal_entries || 0}
          color="purple"
        />
        <StatCard 
          title="Task Sessions" 
          value={stats?.total_task_sessions || 0}
          subtitle={stats?.completed_task_sessions ? `${stats.completed_task_sessions} completed` : null}
          color="orange"
        />
      </div>

      {/* Patient List */}
      <div className="card-section mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Shared Patients</h2>
        <div className="patient-list">
          {patients.length > 0 ? (
            patients.map(patient => (
              <div key={patient.id} className="patient-item">
                <span>{patient.first_name} {patient.last_name}</span>
                <Link to={`/professional/patients/${patient.id}`} className="text-green-700 hover:underline">View Details</Link>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No shared patients yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-section">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="quick-actions">
          <Link 
            to="/professional/profile"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Edit Profile
          </Link>
          <Link 
            to="/professional/consultations"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage Consultations
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  }

  const valueColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700',
  }

  return (
    <div className={`stat-card rounded-lg border p-6 ${colorClasses[color]}`}>
      <h3 className="stat-title">{title}</h3>
      <p className={`stat-value ${valueColors[color]} mt-2`}>{value}</p>
      {subtitle && <p className="stat-subtitle mt-1">{subtitle}</p>}
    </div>
  )
}

export default ProfessionalDashboard
