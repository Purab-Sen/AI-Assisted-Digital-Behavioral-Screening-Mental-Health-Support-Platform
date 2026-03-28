import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
  const { login } = useAuth()
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useForm(
    { email: '', password: '' },
    validateLogin
  )

  const onSubmit = async (formValues) => {
    setIsLoading(true)
    setServerError('')
    
    try {
      const userData = await login(formValues.email, formValues.password)
      // Role-based redirect
      if (userData.role === 'admin') {
        navigate('/admin')
      } else if (userData.role === 'professional') {
        navigate('/professional')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      setServerError(error.response?.data?.detail || 'Login failed. Please try again.')
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
            {serverError && <div className="server-error">⚠ {serverError}</div>}

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
              <input
                type="password"
                id="password"
                name="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your password"
              />
              {touched.password && errors.password && (
                <span className="error-message">{errors.password}</span>
              )}
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
