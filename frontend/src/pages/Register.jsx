import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useForm } from '../hooks/useForm'
import './Auth.css'

const validateRegister = (values) => {
  const errors = {}
  
  if (!values.first_name) {
    errors.first_name = 'First name is required'
  }
  
  if (!values.last_name) {
    errors.last_name = 'Last name is required'
  }
  
  if (!values.email) {
    errors.email = 'Email is required'
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Invalid email address'
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
  
  return errors
}

function Register() {
  const navigate = useNavigate()
  const { register, login } = useAuth()
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { values, errors, touched, handleChange, handleBlur, handleSubmit } = useForm(
    { first_name: '', last_name: '', email: '', password: '', confirm_password: '' },
    validateRegister
  )

  const onSubmit = async (formValues) => {
    setIsLoading(true)
    setServerError('')
    
    try {
      await register({
        first_name: formValues.first_name,
        last_name: formValues.last_name,
        email: formValues.email,
        password: formValues.password
      })
      await login(formValues.email, formValues.password)
      navigate('/dashboard')
    } catch (error) {
      setServerError(error.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Sign up to get started with ASD screening</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          {serverError && <div className="server-error">{serverError}</div>}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={values.first_name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="First name"
              />
              {touched.first_name && errors.first_name && (
                <span className="error-message">{errors.first_name}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={values.last_name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Last name"
              />
              {touched.last_name && errors.last_name && (
                <span className="error-message">{errors.last_name}</span>
              )}
            </div>
          </div>
          
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
              placeholder="Create a password"
            />
            {touched.password && errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirm_password">Confirm Password</label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={values.confirm_password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Confirm your password"
            />
            {touched.confirm_password && errors.confirm_password && (
              <span className="error-message">{errors.confirm_password}</span>
            )}
          </div>
          
          <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
