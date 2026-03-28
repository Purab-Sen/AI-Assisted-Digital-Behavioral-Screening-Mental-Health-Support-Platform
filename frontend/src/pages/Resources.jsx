import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import NavBar from '../components/NavBar'
import './Resources.css'

const TYPE_ICONS = {
  article: '📄',
  video: '🎥',
  exercise: '🏃',
  guide: '📖',
  tool: '🛠️',
}

const RISK_COLORS = {
  low: 'badge-success',
  moderate: 'badge-warning',
  high: 'badge-error',
}

export default function Resources() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => { fetchResources() }, [])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const res = await api.get('/resources')
      setResources(res.data || [])
    } catch (err) {
      setError('Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  const filtered = filter
    ? resources.filter(r => r.type === filter)
    : resources

  const types = [...new Set(resources.map(r => r.type).filter(Boolean))]

  return (
    <div className="resources-user-page">
      <NavBar />

      <div className="page-content">
        <div className="resources-header-row">
          <div>
            <h1 className="page-title">Resources</h1>
            <p className="page-subtitle">Curated guides, articles, and tools to support your journey</p>
          </div>
          {types.length > 0 && (
            <div className="type-filters">
              <button className={`type-filter-btn ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
              {types.map(t => (
                <button key={t} className={`type-filter-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                  {TYPE_ICONS[t] || '📎'} {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💡</span>
            <p>No resources available yet.</p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Check back later for guides and materials.</p>
          </div>
        ) : (
          <div className="resources-grid">
            {filtered.map(resource => (
              <div key={resource.id} className="resource-card">
                <div className="resource-card-header">
                  <span className="resource-type-icon">{TYPE_ICONS[resource.type] || '📎'}</span>
                  <div className="resource-card-badges">
                    {resource.type && <span className="resource-type-badge">{resource.type}</span>}
                    {resource.target_risk_level && (
                      <span className={`badge ${RISK_COLORS[resource.target_risk_level] || 'badge-info'}`}>
                        {resource.target_risk_level}
                      </span>
                    )}
                    {resource.patient_id && <span className="assigned-badge">Assigned to you</span>}
                  </div>
                </div>
                <h3 className="resource-card-title">{resource.title}</h3>
                {resource.description && (
                  <p className="resource-card-desc">{resource.description}</p>
                )}
                {resource.content_or_url && (
                  <div className="resource-card-footer">
                    {resource.content_or_url.startsWith('http') ? (
                      <a href={resource.content_or_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                        Open Resource →
                      </a>
                    ) : (
                      <p className="resource-content-text">{resource.content_or_url}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
