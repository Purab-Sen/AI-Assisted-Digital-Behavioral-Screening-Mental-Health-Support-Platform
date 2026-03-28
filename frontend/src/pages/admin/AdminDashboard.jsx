/**
 * Admin Dashboard
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from "../../services/api"
import NavBar from "../../components/NavBar"
import "./AdminDashboard.css"


function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const [statsRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/stats/recent-activity?days=7')
      ])
      setStats(statsRes.data)
      setRecentActivity(activityRes.data)
    } catch (err) {
      setError('Failed to load admin data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => { await logout(); navigate('/login') }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <p>Loading dashboard…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-loader">
        <p style={{ color: 'var(--error)' }}>{error}</p>
        <button onClick={fetchAdminData} className="btn btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <NavBar />

      <div className="page-content">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System overview and management</p>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard title="Total Users" value={stats?.total_users || 0} sub={`${stats?.active_users || 0} active`} color="blue" />
          <StatCard title="Screenings" value={stats?.total_screenings || 0} sub={`${stats?.completed_screenings || 0} completed`} color="green" />
          <StatCard title="Journal Entries" value={stats?.total_journal_entries || 0} color="purple" />
          <StatCard title="Task Sessions" value={stats?.total_task_sessions || 0} sub={`${stats?.completed_task_sessions || 0} completed`} color="orange" />
        </div>

        {/* Users by Role + Risk Distribution */}
        <div className="two-col">
          <div className="section-card">
            <h2>Users by Role</h2>
            <div>
              {stats?.users_by_role && Object.entries(stats.users_by_role).map(([role, count]) => (
                <div key={role} className="role-row">
                  <span>{role}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section-card">
            <h2>Risk Distribution</h2>
            <div>
              {stats?.risk_distribution && Object.keys(stats.risk_distribution).length > 0 ? (
                Object.entries(stats.risk_distribution).map(([level, count]) => (
                  <div key={level} className="risk-row">
                    <span>{level}</span>
                    <span className={`risk-${level}`}>{count}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No screening data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="section-card">
          <h2>Recent Activity — Last {recentActivity?.period_days || 7} Days</h2>
          <div className="activity-grid">
            <div className="activity-item">
              <span className="activity-count">{recentActivity?.new_users || 0}</span>
              <span className="activity-label">New Users</span>
            </div>
            <div className="activity-item">
              <span className="activity-count">{recentActivity?.screenings || 0}</span>
              <span className="activity-label">Screenings</span>
            </div>
            <div className="activity-item">
              <span className="activity-count">{recentActivity?.journal_entries || 0}</span>
              <span className="activity-label">Journal Entries</span>
            </div>
            <div className="activity-item">
              <span className="activity-count">{recentActivity?.task_sessions || 0}</span>
              <span className="activity-label">Task Sessions</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="section-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link to="/admin/users" className="btn btn-primary">Manage Users</Link>
            <Link to="/admin/resources" className="btn btn-secondary">Manage Resources</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, color }) {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

export default AdminDashboard

