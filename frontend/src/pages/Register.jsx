import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useForm } from '../hooks/useForm'
import './Auth.css'

const validateRegister = (values) => {
  const errors = {}

  if (!values.first_name) errors.first_name = 'First name is required'
  if (!values.last_name) errors.last_name = 'Last name is required'

  if (!values.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Invalid email address'
  }

  if (!values.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required'
  }

  if (!values.password) {
    errors.password = 'Password is required'
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  if (!values.confirm_password) {
    errors.confirm_password = 'Please confirm your password'
  } else if (values.password !== values.confirm_password) {
    errors.confirm_password = 'Passwords do not match'
  }

  if (values.is_professional_applicant) {
    if (!values.license_number) errors.license_number = 'License number is required'
    if (!values.specialty) errors.specialty = 'Specialty is required'
  }

  return errors
}

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isProfessional, setIsProfessional] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit, setValues } = useForm(
    {
      first_name: '', last_name: '', email: '', date_of_birth: '',
      password: '', confirm_password: '',
      is_professional_applicant: false,
      license_number: '', specialty: '', institution: ''
    },
    validateRegister
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const toggleProfessional = () => {
    const next = !isProfessional
    setIsProfessional(next)
    setValues(prev => ({ ...prev, is_professional_applicant: next }))
  }

  const onSubmit = async (formValues) => {
    setIsLoading(true)
    setServerError('')
    try {
      const result = await register({
        first_name: formValues.first_name,
        last_name: formValues.last_name,
        email: formValues.email,
        password: formValues.password,
        date_of_birth: formValues.date_of_birth || null,
        is_professional_applicant: formValues.is_professional_applicant,
        license_number: formValues.license_number || null,
        specialty: formValues.specialty || null,
        institution: formValues.institution || null,
      })
      // Redirect to email verification page
      navigate(`/verify-email?email=${encodeURIComponent(result.email || formValues.email)}`)
    } catch (error) {
      setServerError(error.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left branding panel */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-logo-icon">🧠</div>
          <span>MindBridge</span>
        </div>
        <div className="auth-brand-body">
          <h2>Start your wellbeing journey today.</h2>
          <p>Get personalized behavioral insights and connect with mental health professionals.</p>
        </div>
        <div className="auth-brand-features">
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">🔒</div>
            Private & secure — your data is protected
          </div>
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">📊</div>
            Track progress over time
          </div>
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">✨</div>
            Free to get started
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-header-icon">🌱</div>
            <h1>Create account</h1>
            <p>Sign up to get started with ASD screening</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {serverError && <div className="server-error">⚠ {serverError}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input type="text" id="first_name" name="first_name" value={values.first_name} onChange={handleChange} onBlur={handleBlur} placeholder="First name" />
                {touched.first_name && errors.first_name && <span className="error-message">{errors.first_name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input type="text" id="last_name" name="last_name" value={values.last_name} onChange={handleChange} onBlur={handleBlur} placeholder="Last name" />
                {touched.last_name && errors.last_name && <span className="error-message">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" name="email" value={values.email} onChange={handleChange} onBlur={handleBlur} placeholder="you@example.com" />
              {touched.email && errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="date_of_birth">Date of Birth <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(used to personalize your screening)</span></label>
              <input type="date" id="date_of_birth" name="date_of_birth" value={values.date_of_birth} onChange={handleChange} onBlur={handleBlur} max={new Date().toISOString().split('T')[0]} />
              {touched.date_of_birth && errors.date_of_birth && <span className="error-message">{errors.date_of_birth}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={values.password} onChange={handleChange} onBlur={handleBlur} placeholder="At least 8 characters" />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(s => !s)} aria-label="Toggle password visibility">{showPassword ? '🙈' : '👁️'}</button>
              </div>
              {touched.password && errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirm_password">Confirm Password</label>
              <div className="password-field">
                <input type={showConfirm ? 'text' : 'password'} id="confirm_password" name="confirm_password" value={values.confirm_password} onChange={handleChange} onBlur={handleBlur} placeholder="Confirm your password" />
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirm(s => !s)} aria-label="Toggle password visibility">{showConfirm ? '🙈' : '👁️'}</button>
              </div>
              {touched.confirm_password && errors.confirm_password && <span className="error-message">{errors.confirm_password}</span>}
            </div>

            {/* Professional registration toggle */}
            <div className="pro-toggle-row">
              <label className="pro-toggle-label">
                <input type="checkbox" checked={isProfessional} onChange={toggleProfessional} />
                <span>I am a healthcare professional</span>
              </label>
              <span className="pro-toggle-hint">Your profile will be reviewed by an admin before activation.</span>
            </div>

            {isProfessional && (
              <div className="pro-fields">
                <div className="form-group">
                  <label htmlFor="license_number">License / Registration Number *</label>
                  <input type="text" id="license_number" name="license_number" value={values.license_number} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. MH-12345" />
                  {touched.license_number && errors.license_number && <span className="error-message">{errors.license_number}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="specialty">Specialty *</label>
                  <input type="text" id="specialty" name="specialty" value={values.specialty} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Clinical Psychology" />
                  {touched.specialty && errors.specialty && <span className="error-message">{errors.specialty}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="institution">Institution / Hospital <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" id="institution" name="institution" value={values.institution} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. AIIMS, Apollo" />
                </div>
              </div>
            )}

            <button type="submit" className="btn-auth" disabled={isLoading}>
              {isLoading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
