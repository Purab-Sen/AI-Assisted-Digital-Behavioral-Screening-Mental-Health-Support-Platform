import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/authService'
import './Auth.css'

const OTP_LENGTH = 6

function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const inputRefs = useRef([])

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  if (!email) {
    return (
      <div className="auth-page">
        <div className="auth-form-panel" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="auth-card">
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              No email address provided.{' '}
              <Link to="/register">Register again</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleOtpChange = (index, value) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    setError('')

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...otp]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < OTP_LENGTH) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await authService.verifyEmail(email, code)
      setSuccess('Email verified! Redirecting to login…')
      setTimeout(() => navigate('/login?verified=1'), 1800)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Please try again.')
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setError('')
    try {
      await authService.resendOtp(email)
      setResendCooldown(60)
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + b.replace(/./g, '*') + c
  )

  return (
    <div className="auth-page">
      {/* Left branding */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-logo-icon">🧠</div>
          <span>MindBridge</span>
        </div>
        <div className="auth-brand-body">
          <h2>One last step.</h2>
          <p>Verify your email address to activate your account and start your wellbeing journey.</p>
        </div>
        <div className="auth-brand-features">
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">🔒</div>
            Your account is secured with email verification
          </div>
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">⏱</div>
            Code expires in 10 minutes
          </div>
          <div className="auth-brand-feature">
            <div className="auth-brand-feature-icon">📩</div>
            Check spam if you don't see the email
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-header-icon">✉️</div>
            <h1>Verify your email</h1>
            <p>
              We sent a 6-digit code to<br />
              <strong style={{ color: 'var(--primary)' }}>{maskedEmail}</strong>
            </p>
          </div>

          <form onSubmit={handleVerify} className="auth-form">
            {error && <div className="server-error">⚠ {error}</div>}
            {success && (
              <div className="server-error" style={{ background: '#F0FDF4', borderColor: '#22C55E', color: '#166534' }}>
                ✓ {success}
              </div>
            )}

            {/* OTP digit inputs */}
            <div className="otp-input-group" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`otp-digit${digit ? ' filled' : ''}`}
                  autoComplete="one-time-code"
                  aria-label={`Digit ${i + 1}`}
                  disabled={isLoading || !!success}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn-auth"
              disabled={isLoading || otp.join('').length < OTP_LENGTH || !!success}
            >
              {isLoading ? 'Verifying…' : 'Verify Email →'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Didn't receive the code?{' '}
              <button
                className="link-btn"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
              >
                {isResending
                  ? 'Sending…'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend code'}
              </button>
            </p>
            <p>
              Wrong email? <Link to="/register">Register again</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
