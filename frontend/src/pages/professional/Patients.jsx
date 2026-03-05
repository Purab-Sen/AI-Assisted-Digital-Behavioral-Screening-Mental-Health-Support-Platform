import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './Patients.css'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPatients()
  }, [])

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-red-600">{error}</div>
    </div>
  )

  return (
    <div className="professional-dashboard max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shared Patients</h1>
        <p className="mt-2 text-gray-600">Patients who have shared their data with you</p>
      </div>

      <div className="card-section">
        {patients.length === 0 ? (
          <p className="text-gray-500">No shared patients yet.</p>
        ) : (
          <div className="patient-list">
            {patients.map(p => (
              <div key={p.user_id} className="patient-item">
                <div>
                  <div className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</div>
                  <div className="text-sm text-gray-500">{p.email}</div>
                </div>
                <div>
                  <Link to={`/professional/patients/${p.user_id}`} className="text-green-700 hover:underline">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
