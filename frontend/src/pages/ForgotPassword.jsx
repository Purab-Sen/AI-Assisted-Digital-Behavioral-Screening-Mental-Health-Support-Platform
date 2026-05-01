import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import './Auth.css'

export default function ForgotPassword() {
  const navigate = useNavigate()

  // step: 'email' | 'reset'
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'error'|'success', text }

  // ── Step 1: request OTP ────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }
    setIsLoading(true)
    try {
      await authService.forgotPassword(email)
      setStep('reset')
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: verify OTP + set new password ──────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (otp.trim().length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit code from your email.' })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setIsLoading(true)
    try {
      await authService.resetPassword(email, otp, newPassword)
      navigate('/login?reset=1')
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Reset failed. Please try again.',
      })
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
          <h2>Regain access to your account.</h2>
          <p>Enter your email and we'll send you a 6-digit code to reset your password.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">

          {step === 'email' && (
            <>
              <div className="auth-header">
                <div className="auth-header-icon">🔐</div>
                <h1>Forgot password?</h1>
                <p>We'll email you a reset code</p>
              </div>

              <form onSubmit={handleRequestOtp} className="auth-form">
                {message && (
                  <div
                    className="server-error"
                    style={
                      message.type === 'success'
                        ? { background: '#F0FDF4', borderColor: '#22C55E', color: '#166534' }
                        : undefined
                    }
                  >
                    {message.type === 'success' ? '✓ ' : '⚠ '}
                    {message.text}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="fp-email">Email Address</label>
                  <input
                    type="email"
                    id="fp-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <button type="submit" className="btn-auth" disabled={isLoading}>
                  {isLoading ? 'Sending…' : 'Send Reset Code →'}
                </button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="auth-header">
                <div className="auth-header-icon">✉️</div>
                <h1>Check your email</h1>
                <p>
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleReset} className="auth-form">
                {message && (
                  <div
                    className="server-error"
                    style={
                      message.type === 'success'
                        ? { background: '#F0FDF4', borderColor: '#22C55E', color: '#166534' }
                        : undefined
                    }
                  >
                    {message.type === 'success' ? '✓ ' : '⚠ '}
                    {message.text}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="fp-otp">6-Digit Reset Code</label>
                  <input
                    type="text"
                    id="fp-otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    style={{ letterSpacing: '0.3em', fontSize: '1.25rem', textAlign: 'center' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fp-new-pw">New Password</label>
                  <div className="password-field">
                    <input
                      type={showNew ? 'text' : 'password'}
                      id="fp-new-pw"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNew((s) => !s)}
                      aria-label="Toggle password visibility"
                    >
                      {showNew ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="fp-confirm-pw">Confirm New Password</label>
                  <div className="password-field">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      id="fp-confirm-pw"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirm((s) => !s)}
                      aria-label="Toggle password visibility"
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-auth" disabled={isLoading}>
                  {isLoading ? 'Resetting…' : 'Reset Password →'}
                </button>

                <div style={{ marginTop: 10, textAlign: 'center' }}>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6B7280)' }}
                    onClick={() => { setStep('email'); setMessage(null); setOtp(''); setNewPassword(''); setConfirmPassword('') }}
                  >
                    ← Use a different email
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
