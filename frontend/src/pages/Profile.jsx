import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NavBar from '../components/NavBar'
import api from '../services/api'
import './Profile.css'

const ETHNICITY_OPTIONS = [
  'Asian', 'Middle Eastern', 'White European', 'Hispanic', 'Latino',
  'South Asian', 'Mixed', 'Native Indian', 'Pacifica', 'Others'
]
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']

function getAgeCategory(dob) {
  if (!dob) return null
  const d = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
  if (age <= 11) return { label: 'Child (4–11)', cls: 'age-child' }
  if (age <= 15) return { label: 'Adolescent (12–15)', cls: 'age-adolescent' }
  return { label: 'Adult (16+)', cls: 'age-adult' }
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    ethnicity: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        ethnicity: user.ethnicity || '',
      })
    }
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await updateUser(form)
      setMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  const ageCat = getAgeCategory(form.date_of_birth)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="profile-page">
      <NavBar />
      <div className="profile-content">
        <h1 className="page-title">Profile Management</h1>
        <p className="page-subtitle">Update your personal details and screening preferences</p>

        <form onSubmit={handleSave} className="profile-form section-card">
          <div className="profile-avatar-row">
            <div className="profile-avatar-lg">{user?.first_name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="profile-name">{user?.first_name} {user?.last_name}</div>
              <div className="profile-email">{user?.email}</div>
              <div className="profile-role">{user?.role}</div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label>First Name</label>
              <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label>Last Name</label>
              <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} max={today} required />
              {ageCat && <span className={`age-category-badge ${ageCat.cls}`}>{ageCat.label}</span>}
            </div>
            <div className="form-field">
              <label>Gender</label>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} required>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Ethnicity</label>
              <select value={form.ethnicity} onChange={e => setForm(p => ({ ...p, ethnicity: e.target.value }))} required>
                <option value="">Select ethnicity</option>
                {ETHNICITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {msg && (
            <div className={`profile-msg ${msg.type}`}>{msg.text}</div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/change-password')} style={{ marginLeft: 12 }}>
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
