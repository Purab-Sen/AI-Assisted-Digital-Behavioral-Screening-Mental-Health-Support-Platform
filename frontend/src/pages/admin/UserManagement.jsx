/**
 * User Management Page
 * 
 * Admin-only page for managing users, roles, and account status.
 */
import { useState, useEffect } from 'react'
import api from '../../services/api'
import './UserManagement.css'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    role: '',
    is_active: '',
    search: ''
  })
  const [assign, setAssign] = useState({ patient_id: '', professional_id: '' })
  const [professionalsList, setProfessionalsList] = useState([])
  const [patientsList, setPatientsList] = useState([])
  const [assignError, setAssignError] = useState(null)
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20
  })

  useEffect(() => {
    fetchUsers()
    fetchAssignLists()
  }, [filters, pagination])

  const fetchAssignLists = async () => {
    try {
      setAssignError(null)
      const profs = await api.get('/admin/users?role=professional&limit=100')
      const pats = await api.get('/admin/users?role=user&limit=100')
      // Log raw responses for debugging
      console.debug('assign lists response', { profs: profs.data, pats: pats.data })
      setProfessionalsList(profs.data.users || [])
      setPatientsList(pats.data.users || [])
      // If both are empty, try a fallback fetch without role filter to check server
      if ((profs.data.users || []).length === 0 && (pats.data.users || []).length === 0) {
        const all = await api.get('/admin/users?limit=100')
        console.debug('fallback users response', all.data)
      }
    } catch (err) {
      console.error('Failed to load assign lists', err)
      // Normalize possible pydantic validation errors (detail can be array of objects)
      const resp = err?.response?.data
      let message = err.message || 'Failed to load assign lists'
      if (resp) {
        if (Array.isArray(resp.detail)) {
          try {
            message = resp.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
          } catch (e) {
            message = JSON.stringify(resp.detail)
          }
        } else if (typeof resp.detail === 'string') {
          message = resp.detail
        } else {
          message = JSON.stringify(resp)
        }
      }
      setAssignError(message)
      setProfessionalsList([])
      setPatientsList([])
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('skip', pagination.skip)
      params.append('limit', pagination.limit)
      if (filters.role) params.append('role', filters.role)
      if (filters.is_active !== '') params.append('is_active', filters.is_active)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/admin/users?${params.toString()}`)
      setUsers(response.data.users)
      setTotal(response.data.total)
    } catch (err) {
      setError('Failed to load users')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole })
      fetchUsers()
    } catch (err) {
      alert('Failed to update role')
      console.error(err)
    }
  }

  const updateUserStatus = async (userId, isActive) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { is_active: isActive })
      fetchUsers()
    } catch (err) {
      alert('Failed to update status')
      console.error(err)
    }
  }

  const deleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return
    }
    try {
      await api.delete(`/admin/users/${userId}`)
      fetchUsers()
    } catch (err) {
      alert('Failed to delete user')
      console.error(err)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, skip: 0 }))
  }

  const totalPages = Math.ceil(total / pagination.limit)
  const currentPage = Math.floor(pagination.skip / pagination.limit) + 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Filters */}
      {/* Quick Assign (Admin) */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Assign Patient to Professional</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
            <select
              value={assign.patient_id}
              onChange={(e) => setAssign(prev => ({ ...prev, patient_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select patient</option>
              {patientsList.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.email}</option>
              ))}
            </select>
            {assignError && <div className="text-sm text-red-600 mt-1">{assignError}</div>}
            {!assignError && patientsList.length === 0 && <div className="text-sm text-gray-500 mt-1">No patients available</div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professional</label>
            <select
              value={assign.professional_id}
              onChange={(e) => setAssign(prev => ({ ...prev, professional_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select professional</option>
              {professionalsList.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.email}</option>
              ))}
            </select>
            {assignError && <div className="text-sm text-red-600 mt-1">{assignError}</div>}
            {!assignError && professionalsList.length === 0 && <div className="text-sm text-gray-500 mt-1">No professionals available</div>}
          </div>
          <div>
            <button
              onClick={async () => {
                if (!assign.patient_id || !assign.professional_id) return alert('Choose both patient and professional')
                try {
                  await api.post('/admin/assign-patient', {
                    patient_id: Number(assign.patient_id),
                    professional_id: Number(assign.professional_id)
                  })
                  alert('Patient assigned to professional')
                  fetchUsers()
                } catch (err) {
                  console.error(err)
                  alert('Failed to assign patient')
                }
              }}
              className="w-full px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="professional">Professional</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ role: '', is_active: '', search: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-700 font-medium">
                              {user.first_name[0]}{user.last_name[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="professional">Professional</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => updateUserStatus(user.id, !user.is_active)}
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {user.role === 'professional' && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Verify professional ${user.first_name} ${user.last_name}?`)) return
                              try {
                                await api.patch(`/admin/professionals/${user.id}/verify`, { is_verified: true })
                                fetchUsers()
                                alert('Professional verified')
                              } catch (err) {
                                console.error(err)
                                alert('Failed to verify professional (profile may be missing)')
                              }
                            }}
                            className="px-3 py-1 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Verify
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                  disabled={pagination.skip === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                  disabled={pagination.skip + pagination.limit >= total}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{pagination.skip + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.skip + pagination.limit, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default UserManagement
