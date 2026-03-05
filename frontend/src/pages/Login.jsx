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
      await login(formValues.email, formValues.password)
      navigate('/dashboard')
    } catch (error) {
      setServerError(error.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue to your dashboard</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          {serverError && <div className="server-error">{serverError}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your email"
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
          
          <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
