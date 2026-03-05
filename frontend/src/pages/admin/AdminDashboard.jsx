/**
 * Admin Dashboard
 * 
 * Admin-only view for system statistics and user management.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from "../../services/api"
import "./AdminDashboard.css"


function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
    <div className="admin-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={stats?.total_users || 0}
          subtitle={`${stats?.active_users || 0} active`}
          color="blue"
        />
        <StatCard 
          title="Screenings" 
          value={stats?.total_screenings || 0}
          subtitle={`${stats?.completed_screenings || 0} completed`}
          color="green"
        />
        <StatCard 
          title="Journal Entries" 
          value={stats?.total_journal_entries || 0}
          color="purple"
        />
        <StatCard 
          title="Task Sessions" 
          value={stats?.total_task_sessions || 0}
          subtitle={`${stats?.completed_task_sessions || 0} completed`}
          color="orange"
        />
      </div>

      {/* Users by Role */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h2>
          <div className="space-y-3">
            {stats?.users_by_role && Object.entries(stats.users_by_role).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="capitalize text-gray-700">{role}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Level Distribution</h2>
          <div className="space-y-3">
            {stats?.risk_distribution && Object.keys(stats.risk_distribution).length > 0 ? (
              Object.entries(stats.risk_distribution).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="capitalize text-gray-700">{level}</span>
                  <span className={`font-semibold ${getRiskColor(level)}`}>{count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No screening data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity (Last {recentActivity?.period_days || 7} Days)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{recentActivity?.new_users || 0}</div>
            <div className="text-sm text-gray-600">New Users</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{recentActivity?.screenings || 0}</div>
            <div className="text-sm text-gray-600">Screenings</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{recentActivity?.journal_entries || 0}</div>
            <div className="text-sm text-gray-600">Journal Entries</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{recentActivity?.task_sessions || 0}</div>
            <div className="text-sm text-gray-600">Task Sessions</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link 
            to="/admin/users"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Manage Users
          </Link>
          <Link 
            to="/admin/resources"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage Resources
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
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <p className={`text-3xl font-bold ${valueColors[color]} mt-2`}>{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function getRiskColor(level) {
  const colors = {
    low: 'text-green-600',
    moderate: 'text-yellow-600',
    high: 'text-red-600'
  }
  return colors[level?.toLowerCase()] || 'text-gray-600'
}

export default AdminDashboard
