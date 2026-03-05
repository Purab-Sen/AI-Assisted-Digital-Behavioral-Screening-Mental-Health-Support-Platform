import { useState, useEffect } from 'react'
import api from '../../services/api'
import './AdminResources.css'

export default function AdminResources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchResources() }, [])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const res = await api.get('/resources')
      setResources(res.data || [])
    } catch (err) {
      console.error('Failed to load resources', err)
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Resources</h1>
        <p className="mt-2 text-gray-600">Create, edit and remove recommended resources.</p>
      </div>

      <div className="card-section">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : resources.length === 0 ? (
          <div className="text-gray-500">No resources found.</div>
        ) : (
          <ul className="space-y-3">
            {resources.map(r => (
              <li key={r.id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-sm text-gray-500">{r.type}</div>
                </div>
                <div className="text-sm text-gray-600">{r.target_risk_level || '—'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
