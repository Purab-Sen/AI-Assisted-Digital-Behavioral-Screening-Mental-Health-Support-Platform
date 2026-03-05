/**
 * AQ-10 Screening Page
 * 
 * Main screening questionnaire interface with progress tracking and results.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import screeningService from '../services/screeningService'
import './Screening.css'

function Screening() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [startTime, setStartTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  // Start screening on mount
  useEffect(() => {
    startScreening()
  }, [])

  const startScreening = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await screeningService.startScreening()
      setSession({ id: data.session_id, started_at: data.started_at })
      setQuestions(data.questions)
      setStartTime(Date.now())
    } catch (err) {
      setError('Failed to start screening. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = useCallback((questionId, optionId) => {
    const responseTime = Date.now() - startTime
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        selected_option_id: optionId,
        response_time_ms: responseTime
      }
    }))
    setStartTime(Date.now()) // Reset timer for next question
  }, [startTime])

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const goToQuestion = (index) => {
    setCurrentIndex(index)
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const answersArray = Object.values(answers)
      const resultData = await screeningService.submitScreening(session.id, answersArray)
      setResult(resultData)
    } catch (err) {
      setError('Failed to submit screening. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const currentQuestion = questions[currentIndex]
  const isAnswered = currentQuestion && answers[currentQuestion.id]
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length
  const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0

  // Loading state
  if (loading) {
    return (
      <div className="screening-container">
        <div className="screening-loading">
          <div className="spinner"></div>
          <p>Loading questionnaire...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !session) {
    return (
      <div className="screening-container">
        <div className="screening-error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={startScreening} className="btn btn-primary">
            Try Again
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Results view
  if (result) {
    return <ScreeningResult result={result} onNewScreening={() => {
      setResult(null)
      setAnswers({})
      setCurrentIndex(0)
      startScreening()
    }} />
  }

  return (
    <div className="screening-container">
      <div className="screening-header">
        <h1>AQ-10 Screening</h1>
        <p className="screening-subtitle">
          Answer the following questions based on how you typically behave or feel.
        </p>
      </div>

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="progress-text">
          {Object.keys(answers).length} of {questions.length} answered
        </span>
      </div>

      {/* Question navigation dots */}
      <div className="question-nav">
        {questions.map((q, index) => (
          <button
            key={q.id}
            className={`nav-dot ${index === currentIndex ? 'active' : ''} ${answers[q.id] ? 'answered' : ''}`}
            onClick={() => goToQuestion(index)}
            title={`Question ${index + 1}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      {currentQuestion && (
        <div className="question-card">
          <div className="question-number">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <h2 className="question-text">{currentQuestion.text}</h2>
          
          <div className="options-list">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                className={`option-button ${answers[currentQuestion.id]?.selected_option_id === option.id ? 'selected' : ''}`}
                onClick={() => handleAnswer(currentQuestion.id, option.id)}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="navigation-buttons">
        <button 
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="btn btn-secondary"
        >
          ← Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button 
            onClick={goToNext}
            disabled={!isAnswered}
            className="btn btn-primary"
          >
            Next →
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="btn btn-success"
          >
            {submitting ? 'Submitting...' : 'Submit Screening'}
          </button>
        )}
      </div>

      {/* Back to dashboard link */}
      <div className="screening-footer">
        <button 
          onClick={() => navigate('/dashboard')}
          className="link-button"
        >
          Save & Exit (you can resume later)
        </button>
      </div>
    </div>
  )
}


/**
 * Screening Result Component
 */
function ScreeningResult({ result, onNewScreening }) {
  const navigate = useNavigate()

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'green'
      case 'moderate': return 'yellow'
      case 'high': return 'red'
      default: return 'gray'
    }
  }

  const riskColor = getRiskColor(result.risk_level)

  return (
    <div className="screening-container">
      <div className="result-card">
        <div className="result-header">
          <h1>Screening Complete</h1>
          <p className="result-date">
            Completed on {new Date(result.completed_at).toLocaleDateString()}
          </p>
        </div>

        {/* Score display */}
        <div className={`score-display score-${riskColor}`}>
          <div className="score-circle">
            <span className="score-value">{result.raw_score}</span>
            <span className="score-max">/{result.max_score}</span>
          </div>
          <div className="risk-label">
            Risk Level: <strong className="capitalize">{result.risk_level}</strong>
          </div>
        </div>

        {/* Risk description */}
        <div className="result-description">
          <p>{result.risk_description}</p>
        </div>

        {/* Recommendations */}
        <div className="recommendations">
          <h3>Recommendations</h3>
          <ul>
            {result.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer">
          <strong>Important:</strong> This screening tool is not a diagnostic instrument. 
          It is designed to help identify traits that may warrant further professional evaluation. 
          Only a qualified healthcare professional can provide a diagnosis.
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
          <button 
            onClick={() => navigate('/screening/history')}
            className="btn btn-secondary"
          >
            View History
          </button>
          <button 
            onClick={onNewScreening}
            className="btn btn-outline"
          >
            Take Another Screening
          </button>
        </div>
      </div>
    </div>
  )
}

export default Screening
