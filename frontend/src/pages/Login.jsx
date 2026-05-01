import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/authService'
import { useForm } from '../hooks/useForm'
import './Auth.css'

const validateLogin = (values) => {
  const errors = {}
  
  if (!values.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Invalid email address'
  }
  
  if (!values.password) {
    errors.password = 'Password is required'
  }
  
  return errors
}

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const justReset = searchParams.get('reset') === '1'
  const { login } = useAuth()
  const [serverError, setServerError] = useState('')
  const [isEmailUnverified, setIsEmailUnverified] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useForm(
    { email: '', password: '' },
    validateLogin
  )
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (formValues) => {
    setIsLoading(true)
    setServerError('')
    setIsEmailUnverified(false)
    setResendMessage('')
    
    try {
      const userData = await login(formValues.email, formValues.password)
      if (userData.role === 'admin') {
        navigate('/admin')
      } else if (userData.role === 'professional') {
        navigate('/professional')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      const detail = error.response?.data?.detail || ''
      const isUnverified =
        error.response?.status === 403 &&
        detail.toLowerCase().includes('verify your email')

      if (isUnverified) {
        setIsEmailUnverified(true)
        setUnverifiedEmail(formValues.email)
      } else {
        setServerError(detail || 'Login failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!unverifiedEmail || isResending) return
    setIsResending(true)
    setResendMessage('')
    try {
      await authService.resendOtp(unverifiedEmail)
      navigate(`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`)
    } catch {
      setResendMessage('Failed to send a new code. Please try again.')
    } finally {
      setIsResending(false)
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
          <h2>Your behavioral health — understood.</h2>
          <p>Evidence-based screening, cognitive tasks, and professional support all in one place.</p>
        </div>
        <div className="auth-brand-features">
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">📋</div>
            AQ-10 validated screening questionnaire
          </div>
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">🎯</div>
            Interactive cognitive assessment tasks
          </div>
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">👨‍⚕️</div>
            Connect with verified professionals
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-header-icon">👋</div>
            <h1>Welcome back</h1>
            <p>Sign in to continue to your dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {justVerified && !serverError && !isEmailUnverified && (
              <div className="server-error" style={{ background: '#F0FDF4', borderColor: '#22C55E', color: '#166534' }}>
                ✓ Email verified! You can now sign in.
              </div>
            )}

            {justReset && !serverError && !isEmailUnverified && (
              <div className="server-error" style={{ background: '#F0FDF4', borderColor: '#22C55E', color: '#166534' }}>
                ✓ Password reset! Sign in with your new password.
              </div>
            )}

            {serverError && <div className="server-error">⚠ {serverError}</div>}

            {isEmailUnverified && (
              <div className="server-error" style={{ background: '#FFF7ED', borderColor: '#F59E0B', color: '#92400E' }}>
                <div>
                  <strong>Email not verified.</strong> Please verify your email before logging in.
                </div>
                <div style={{ marginTop: 8 }}>
                  {resendMessage && <span style={{ display: 'block', marginBottom: 6 }}>{resendMessage}</span>}
                  <button
                    type="button"
                    className="link-btn"
                    style={{ color: '#B45309', fontWeight: 700 }}
                    onClick={handleResendOtp}
                    disabled={isResending}
                  >
                    {isResending ? 'Sending…' : 'Send verification code →'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@example.com"
              />
              {touched.email && errors.email && (
                <span className="error-message">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(s => !s)} aria-label="Toggle password visibility">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {touched.password && errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
            </div>

            <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '4px' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary, #4F46E5)' }}>Forgot password?</Link>
            </div>

            <button type="submit" className="btn-auth" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register">Create one free</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
