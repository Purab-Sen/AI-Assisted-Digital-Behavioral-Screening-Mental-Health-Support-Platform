/**
 * Analysis Page
 *
 * Shows aggregated behavioral insights: journal mood/stress trends,
 * ASD journal analysis attributes, screening history, task performance,
 * and AI-generated recommendations.
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import NavBar from '../components/NavBar'
import api from '../services/api'
import { formatDateOnlyIST } from '../utils/formatDate'
import './Analysis.css'

export default function Analysis() {
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState(null)
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Read ?tab= from URL on mount (e.g. from notification link)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab) setActiveTab(tab)
  }, [location.search])

  useEffect(() => {
    Promise.all([
      api.get('/analysis/summary'),
      api.get('/recommendations').catch(() => ({ data: { has_recommendations: false, recommendations: [], summary: null } })),
    ])
      .then(([analysisRes, recsRes]) => {
        setData(analysisRes.data)
        setRecs(recsRes.data)
      })
      .catch(() => setError('Failed to load analysis data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="analysis-container">
        <NavBar />
        <div className="analysis-loading">
          <div className="spinner"></div>
          <p>Loading your analysis…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analysis-container">
        <NavBar />
        <div className="analysis-empty">
          <span className="analysis-empty-icon">📊</span>
          <h2>Analysis Unavailable</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  const { journal, screening, tasks, insight, additional_screenings, comorbidity, behavioral_observations, referrals, normative_scores, pillar_composites } = data || {}
  const normScores = tasks?.normative_scores || normative_scores || {}
  const pillarComps = tasks?.pillar_composites || pillar_composites || {}

  const moodColor = (label) => {
    switch (label) {
      case 'Excellent': return 'green'
      case 'Good': return 'teal'
      case 'Neutral': return 'gray'
      case 'Low': case 'Very Low': return 'red'
      default: return 'gray'
    }
  }

  const stressColor = (label) => {
    switch (label) {
      case 'Low': return 'green'
      case 'Moderate': return 'yellow'
      case 'High': return 'red'
      default: return 'gray'
    }
  }

  const riskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'green'
      case 'moderate': return 'yellow'
      case 'high': return 'red'
      default: return 'gray'
    }
  }

  const mlLabelText = (label) => {
    switch (label?.toLowerCase()) {
      case 'low': return 'Low Likelihood'
      case 'moderate': return 'Moderate Likelihood'
      case 'high': return 'High Likelihood'
      case 'very_high': return 'Very High Likelihood'
      default: return 'N/A'
    }
  }

  const mlLabelColor = (label) => {
    switch (label?.toLowerCase()) {
      case 'low': return 'green'
      case 'moderate': return 'yellow'
      case 'high': return 'orange'
      case 'very_high': return 'red'
      default: return 'gray'
    }
  }

  /* ── Pillar icons / colors ── */
  const pillarMeta = {
    executive_function: { icon: '🧠', color: '#6366f1', label: 'Executive Function' },
    social_cognition:   { icon: '🤝', color: '#f59e0b', label: 'Social Cognition' },
    joint_attention:    { icon: '👁️', color: '#10b981', label: 'Joint Attention' },
    sensory_processing: { icon: '🎧', color: '#ec4899', label: 'Sensory Processing' },
  }

  /* ── SVG donut chart component ── */
  const DonutGauge = ({ value, max = 100, color = '#6366f1', size = 72, label }) => {
    const r = (size - 8) / 2
    const circ = 2 * Math.PI * r
    const pct = Math.min(Math.max(value / max, 0), 1)
    const dashOffset = circ * (1 - pct)
    return (
      <div className="donut-gauge" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 1s ease' }} />
          <text x={size/2} y={size/2 - 4} textAnchor="middle" fontSize="14" fontWeight="800" fill="#1e293b">{Math.round(value)}</text>
          {label && <text x={size/2} y={size/2 + 10} textAnchor="middle" fontSize="8" fontWeight="600" fill="#94a3b8">{label}</text>}
        </svg>
      </div>
    )
  }

  /* ── Progression line chart component ── */
  const ProgressionChart = ({ data, color = '#6366f1', height = 120 }) => {
    if (!data || data.length === 0) return null
    const chartId = `grad-${Math.random().toString(36).slice(2, 8)}`
    const pad = { top: 18, right: 20, bottom: 24, left: 40 }
    const W = Math.max(data.length * 70, 240)
    const H = height
    const plotW = W - pad.left - pad.right
    const plotH = H - pad.top - pad.bottom
    const vals = data.map(d => d.avg)
    const maxV = Math.max(...vals, 1)
    const minV = Math.min(...vals, 0)
    const range = maxV - minV || 1
    const pts = data.map((d, i) => ({
      x: pad.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
      y: pad.top + plotH - ((d.avg - minV) / range) * plotH,
    }))
    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const areaD = `${pathD} L${pts[pts.length-1].x},${pad.top + plotH} L${pts[0].x},${pad.top + plotH} Z`
    // Y-axis labels
    const yLabels = [minV, (minV + maxV) / 2, maxV].map(v => ({ v: Math.round(v * 100) / 100, y: pad.top + plotH - ((v - minV) / range) * plotH }))

    return (
      <div className="task-chart-wrapper">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="task-progression-svg">
          <defs>
            <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line x1={pad.left} y1={yl.y} x2={W - pad.right} y2={yl.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '4,3'} />
              <text x={pad.left - 6} y={yl.y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="500">{yl.v}</text>
            </g>
          ))}
          {/* Area fill */}
          <path d={areaD} fill={`url(#${chartId})`} />
          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Data points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2.5" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1e293b">{data[i].avg}</text>
              <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">{data[i].week}</text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  // Simple bar chart — normalised 0–10
  const MiniBar = ({ value, max = 10, color }) => (
    <div className="mini-bar-track">
      <div
        className={`mini-bar-fill mini-bar-${color}`}
        style={{ width: `${Math.max(4, (value / max) * 100)}%` }}
      />
    </div>
  )

  const hasMoodTrend = journal.mood_trend?.length > 1
  const hasStressTrend = journal.stress_trend?.length > 1

  /* ASD attribute friendly names and descriptions */
  const asdAttrMeta = {
    mood_valence:        { label: 'Mood',                 icon: '😊', desc: 'Overall emotional tone from your journal entries', goodHigh: true },
    anxiety_level:       { label: 'Anxiety',              icon: '😰', desc: 'How much worry or stress shows in your writing', goodHigh: false },
    social_engagement:   { label: 'Social Connection',    icon: '🤝', desc: 'How connected you feel to others', goodHigh: true },
    sensory_sensitivity: { label: 'Sensory Sensitivity',  icon: '🎧', desc: 'Mentions of sensory overwhelm or discomfort', goodHigh: false },
    emotional_regulation:{ label: 'Emotional Balance',    icon: '⚖️', desc: 'Your ability to manage emotions effectively', goodHigh: true },
    repetitive_behavior: { label: 'Routine Focus',        icon: '🔄', desc: 'Focus on routines, rituals, or specific interests', goodHigh: false },
  }

  const scoreLabel = (val, goodHigh) => {
    if (val == null) return { text: 'No data', color: 'gray' }
    if (goodHigh) {
      if (val >= 0.7) return { text: 'Good', color: 'green' }
      if (val >= 0.4) return { text: 'Moderate', color: 'yellow' }
      return { text: 'Needs attention', color: 'red' }
    } else {
      if (val <= 0.3) return { text: 'Low', color: 'green' }
      if (val <= 0.6) return { text: 'Moderate', color: 'yellow' }
      return { text: 'High', color: 'red' }
    }
  }

  const completeRec = async (id) => {
    try {
      await api.patch(`/recommendations/${id}/complete`)
      setRecs(prev => ({
        ...prev,
        recommendations: prev.recommendations.map(r =>
          r.id === id ? { ...r, status: 'completed' } : r
        )
      }))
    } catch { /* ignore */ }
  }

  const pendingRecs = recs?.recommendations?.filter(r => r.status === 'pending') || []

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'journal', label: 'Journal Insights', icon: '📔' },
    { key: 'screening', label: 'ASD Screening', icon: '📋' },
    { key: 'tasks', label: 'Tasks', icon: '🧩' },
    { key: 'clinical', label: 'Clinical Profile', icon: '🩺' },
    { key: 'recommendations', label: 'Recommendations', icon: '💡' },
  ]

  return (
    <div className="analysis-container">
      <NavBar />

      <div className="analysis-inner">
        <div className="analysis-header">
          <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
          <h1>Your Progress & Insights</h1>
          <p className="analysis-subtitle">
            A clear picture of your wellbeing based on your journals, screenings, and cognitive exercises.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="analysis-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`analysis-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <>
            {/* Insight Banner — simplified language */}
            <div className="insight-banner">
              <span className="insight-icon">🧠</span>
              <p>{insight}</p>
            </div>

            {/* Quick Status Cards */}
            <div className="overview-cards">
              <div className="overview-card" onClick={() => setActiveTab('journal')}>
                <span className="overview-card-icon">📔</span>
                <div className="overview-card-body">
                  <h3>Journal</h3>
                  <p className="overview-stat">{journal.entry_count_30d} entries</p>
                  {journal.avg_mood != null && (
                    <span className={`stat-badge badge-${moodColor(journal.mood_label)}`}>
                      Mood: {journal.mood_label}
                    </span>
                  )}
                </div>
              </div>

              <div className="overview-card" onClick={() => setActiveTab('screening')}>
                <span className="overview-card-icon">📋</span>
                <div className="overview-card-body">
                  <h3>Screening</h3>
                  <p className="overview-stat">{screening.total_completed} completed</p>
                  {screening.latest_ml_label && (
                    <span className={`stat-badge badge-${mlLabelColor(screening.latest_ml_label)}`}>
                      {mlLabelText(screening.latest_ml_label)}
                    </span>
                  )}
                </div>
              </div>

              <div className="overview-card" onClick={() => setActiveTab('tasks')}>
                <span className="overview-card-icon">🧩</span>
                <div className="overview-card-body">
                  <h3>Cognitive Tasks</h3>
                  <p className="overview-stat">{tasks.total_completed} sessions</p>
                  {tasks.total_completed > 0 && (
                    <span className="stat-badge badge-teal">Active</span>
                  )}
                </div>
              </div>

              {recs?.has_recommendations && (
                <div className="overview-card highlight" onClick={() => setActiveTab('recommendations')}>
                  <span className="overview-card-icon">💡</span>
                  <div className="overview-card-body">
                    <h3>Recommendations</h3>
                    <p className="overview-stat">{recs.recommendations.length} suggestions</p>
                    {pendingRecs.length > 0
                      ? <span className="stat-badge badge-teal">{pendingRecs.length} pending</span>
                      : <span className="stat-badge badge-green">All done</span>
                    }
                  </div>
                </div>
              )}
            </div>

            {/* ASD Attribute Summary (if journal analysis exists) */}
            {journal.asd_analysis?.analyzed_count > 0 && (
              <div className="analysis-card" style={{ marginTop: 24 }}>
                <div className="analysis-card-header">
                  <span className="card-icon-sm">🧬</span>
                  <h2>Behavioral Profile (from Journals)</h2>
                  <span className="card-period">{journal.asd_analysis.analyzed_count} analyzed</span>
                </div>
                <p className="card-explainer">
                  These scores are derived from AI analysis of your journal entries. They help track behavioral patterns over time — not a diagnosis.
                </p>
                <div className="asd-attr-grid">
                  {Object.entries(asdAttrMeta).map(([key, meta]) => {
                    const val = journal.asd_analysis.averages?.[key]
                    const info = scoreLabel(val, meta.goodHigh)
                    return (
                      <div key={key} className="asd-attr-card">
                        <div className="asd-attr-top">
                          <span className="asd-attr-icon">{meta.icon}</span>
                          <span className="asd-attr-name">{meta.label}</span>
                          <span className={`stat-badge badge-${info.color}`}>{info.text}</span>
                        </div>
                        <div className="asd-attr-bar-track">
                          <div
                            className={`asd-attr-bar-fill asd-bar-${info.color}`}
                            style={{ width: val != null ? `${Math.max(4, val * 100)}%` : '0%' }}
                          />
                        </div>
                        <p className="asd-attr-desc">{meta.desc}</p>
                        {val != null && <span className="asd-attr-val">{(val * 100).toFixed(0)}%</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── JOURNAL TAB ─── */}
        {activeTab === 'journal' && (
          <div className="analysis-card">
            <div className="analysis-card-header">
              <span className="card-icon-sm">📔</span>
              <h2>Journal Insights</h2>
              <span className="card-period">Last 30 days</span>
            </div>

            {journal.entry_count_30d === 0 ? (
              <div className="analysis-empty-state">
                <p>No journal entries in the last 30 days. Writing regularly helps track your wellbeing.</p>
                <Link to="/journal" className="btn btn-sm btn-primary">Write Your First Entry</Link>
              </div>
            ) : (
              <>
                <div className="stat-row">
                  <span className="stat-label">Total Entries</span>
                  <span className="stat-value">{journal.entry_count_30d}</span>
                </div>

                {journal.avg_mood != null && (
                  <div className="stat-block">
                    <div className="stat-row">
                      <span className="stat-label">Average Mood</span>
                      <span className={`stat-badge badge-${moodColor(journal.mood_label)}`}>
                        {journal.mood_label} ({journal.avg_mood}/10)
                      </span>
                    </div>
                    <p className="stat-explain">
                      {journal.avg_mood >= 7 ? 'Your mood has been positive lately — that\'s great!' :
                       journal.avg_mood >= 4 ? 'Your mood has been in the moderate range.' :
                       'Your mood has been low recently. Consider talking to someone you trust.'}
                    </p>
                    <MiniBar value={journal.avg_mood} color={moodColor(journal.mood_label)} />
                  </div>
                )}

                {journal.avg_stress != null && (
                  <div className="stat-block">
                    <div className="stat-row">
                      <span className="stat-label">Average Stress</span>
                      <span className={`stat-badge badge-${stressColor(journal.stress_label)}`}>
                        {journal.stress_label} ({journal.avg_stress}/10)
                      </span>
                    </div>
                    <p className="stat-explain">
                      {journal.avg_stress <= 3 ? 'Your stress levels have been manageable.' :
                       journal.avg_stress <= 6 ? 'You\'re experiencing moderate stress — try relaxation techniques.' :
                       'Your stress is high. Breathing exercises or a break might help.'}
                    </p>
                    <MiniBar value={journal.avg_stress} color={stressColor(journal.stress_label)} />
                  </div>
                )}

                {hasMoodTrend && (
                  <div className="trend-section">
                    <h4>How Your Mood Changed Week by Week</h4>
                    <div className="trend-bars">
                      {journal.mood_trend.map((pt, i) => (
                        <div key={i} className="trend-bar-col">
                          <div className="trend-bar-track">
                            <div className="trend-bar-fill trend-bar-blue" style={{ height: `${(pt.avg / 10) * 100}%` }} />
                          </div>
                          <span className="trend-bar-label">{pt.week}</span>
                          <span className="trend-bar-val">{pt.avg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasStressTrend && (
                  <div className="trend-section">
                    <h4>Stress Levels Over Time</h4>
                    <div className="trend-bars">
                      {journal.stress_trend.map((pt, i) => (
                        <div key={i} className="trend-bar-col">
                          <div className="trend-bar-track">
                            <div className="trend-bar-fill trend-bar-orange" style={{ height: `${(pt.avg / 10) * 100}%` }} />
                          </div>
                          <span className="trend-bar-label">{pt.week}</span>
                          <span className="trend-bar-val">{pt.avg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ASD attribute detail */}
                {journal.asd_analysis?.analyzed_count > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                      Behavioral Patterns from Your Journals
                    </h4>
                    <div className="asd-attr-grid">
                      {Object.entries(asdAttrMeta).map(([key, meta]) => {
                        const val = journal.asd_analysis.averages?.[key]
                        const info = scoreLabel(val, meta.goodHigh)
                        const trendData = journal.asd_analysis.trends?.[key] || []
                        return (
                          <div key={key} className="asd-attr-card">
                            <div className="asd-attr-top">
                              <span className="asd-attr-icon">{meta.icon}</span>
                              <span className="asd-attr-name">{meta.label}</span>
                              <span className={`stat-badge badge-${info.color}`}>{info.text}</span>
                            </div>
                            <div className="asd-attr-bar-track">
                              <div className={`asd-attr-bar-fill asd-bar-${info.color}`} style={{ width: val != null ? `${Math.max(4, val * 100)}%` : '0%' }} />
                            </div>
                            <p className="asd-attr-desc">{meta.desc}</p>
                            {val != null && <span className="asd-attr-val">{(val * 100).toFixed(0)}%</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Link to="/journal" className="btn btn-sm btn-secondary analysis-card-link" style={{ marginTop: 12 }}>
                  Go to Journal →
                </Link>
              </>
            )}
          </div>
        )}

        {/* ─── SCREENING TAB ─── */}
        {activeTab === 'screening' && (
          <div className="analysis-card">
            <div className="analysis-card-header">
              <span className="card-icon-sm">📋</span>
              <h2>ASD Screening Results</h2>
              <span className="card-period">Last 5 sessions</span>
            </div>

            {screening.total_completed === 0 ? (
              <div className="analysis-empty-state">
                <p>You haven't completed any ASD screenings yet. The AQ-10 questionnaire takes about 5 minutes.</p>
                <Link to="/screening" className="btn btn-sm btn-primary">Take Screening</Link>
              </div>
            ) : (
              <>
                <div className="stat-row">
                  <span className="stat-label">Screenings Completed</span>
                  <span className="stat-value">{screening.total_completed}</span>
                </div>

                {screening.latest_ml_label && (
                  <div className="stat-block">
                    <div className="stat-row">
                      <span className="stat-label">AI Assessment</span>
                      <span className={`stat-badge badge-${mlLabelColor(screening.latest_ml_label)}`}>
                        {mlLabelText(screening.latest_ml_label)}
                      </span>
                    </div>
                    <p className="stat-explain">
                      {screening.latest_ml_label === 'low' && 'The AI model found a low likelihood of ASD traits based on your responses. This is a positive indicator.'}
                      {screening.latest_ml_label === 'moderate' && 'The AI found some traits that may be worth monitoring. This is not a diagnosis — consider consulting a professional for further evaluation.'}
                      {(screening.latest_ml_label === 'high' || screening.latest_ml_label === 'very_high') && 'The AI detected significant ASD-related traits. We recommend discussing these results with a healthcare professional.'}
                    </p>
                  </div>
                )}

                {screening.latest_risk_level && (
                  <div className="stat-block">
                    <div className="stat-row">
                      <span className="stat-label">Questionnaire Score</span>
                      <span className={`stat-badge badge-${riskColor(screening.latest_risk_level)}`}>
                        {screening.latest_raw_score != null ? `${screening.latest_raw_score} out of 10` : 'N/A'}
                      </span>
                    </div>
                    <p className="stat-explain">
                      Scores of 6 or above suggest traits worth discussing with a professional.
                      {screening.latest_raw_score != null && screening.latest_raw_score < 6 && ' Your score is in the typical range.'}
                      {screening.latest_raw_score != null && screening.latest_raw_score >= 6 && ' Your score suggests further evaluation may be helpful.'}
                    </p>
                  </div>
                )}

                {screening.history.length > 1 && (
                  <div className="trend-section">
                    <h4>Your Score History</h4>
                    <div className="trend-bars">
                      {[...screening.history].reverse().map((s, i) => (
                        <div key={s.id} className="trend-bar-col">
                          <div className="trend-bar-track">
                            <div className={`trend-bar-fill trend-bar-${riskColor(s.risk_level)}-bar`} style={{ height: `${((s.raw_score || 0) / 10) * 100}%` }} />
                          </div>
                          <span className="trend-bar-label">#{i + 1}</span>
                          <span className="trend-bar-val">{s.raw_score ?? '–'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="analysis-card-actions">
                  <Link to="/screening" className="btn btn-sm btn-primary">New Screening</Link>
                  <Link to="/screening/history" className="btn btn-sm btn-secondary">View History →</Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TASKS TAB ─── */}
        {activeTab === 'tasks' && (
          <>
            {tasks.total_completed > 0 ? (
              <div className="analysis-card task-analytics-card">
                <div className="analysis-card-header">
                  <span className="card-icon-sm">🧩</span>
                  <h2>Cognitive Exercise Performance</h2>
                  <span className="card-period">{tasks.total_completed} sessions</span>
                </div>

                <div className="task-insight-banner">
                  <span className="insight-icon">📈</span>
                  <p>{tasks.task_insight}</p>
                </div>

                <div className="pillar-gauges-row">
                  {Object.entries(tasks.pillar_analytics).map(([pk, pv]) => {
                    const meta = pillarMeta[pk] || {}
                    return (
                      <div key={pk} className="pillar-gauge-card">
                        <DonutGauge
                          value={Math.abs(pv.avg_improvement_pct)}
                          max={Math.max(Math.abs(pv.avg_improvement_pct) * 1.5, 30)}
                          color={meta.color}
                          label={pv.avg_improvement_pct >= 0 ? 'improve' : 'decline'}
                        />
                        <div className="pillar-gauge-label">
                          <span className="pillar-gauge-icon">{meta.icon}</span>
                          <span className="pillar-gauge-name">{pv.label}</span>
                        </div>
                        <span className={`pillar-gauge-pct ${pv.avg_improvement_pct >= 0 ? 'positive' : 'negative'}`}>
                          {pv.avg_improvement_pct > 0 ? '+' : ''}{pv.avg_improvement_pct}%
                        </span>
                      </div>
                    )
                  })}
                </div>

                {Object.entries(tasks.pillar_analytics).map(([pillarKey, pillar]) => {
                  const meta = pillarMeta[pillarKey] || {}
                  return (
                    <div key={pillarKey} className="pillar-detail-block">
                      <div className="pillar-detail-header">
                        <div className="pillar-detail-title">
                          <span className="pillar-detail-icon" style={{ background: `${meta.color}18`, color: meta.color }}>{meta.icon}</span>
                          <h3>{pillar.label}</h3>
                        </div>
                        <span className={`pillar-badge-pct ${pillar.avg_improvement_pct >= 0 ? 'up' : 'down'}`}>
                          {pillar.avg_improvement_pct > 0 ? '↑' : pillar.avg_improvement_pct < 0 ? '↓' : '→'}{' '}
                          {Math.abs(pillar.avg_improvement_pct)}%
                        </span>
                      </div>

                      <div className="task-cards-grid">
                        {pillar.tasks.map(task => {
                          const trendUp = task.trend.includes('improvement')
                          const trendDown = task.trend.includes('decline')
                          const invertDisplay = ['false_alarm_rate', 'switch_cost_ms', 'cue_detection_latency'].includes(task.primary_metric)

                          return (
                            <div key={task.category} className="task-analytics-item">
                              <div className="task-item-header">
                                <h4>{task.task_name}</h4>
                                <span className={`task-trend-badge ${trendUp ? 'trend-positive' : trendDown ? 'trend-negative' : 'trend-neutral'}`}>
                                  {trendUp ? '↗' : trendDown ? '↘' : '→'}{' '}
                                  {task.trend.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <div className="task-item-body">
                                <div className="task-item-gauge">
                                  <DonutGauge
                                    value={invertDisplay ? Math.max(0, 100 - task.latest_value) : task.latest_value}
                                    color={meta.color}
                                    size={80}
                                    label={task.primary_metric.replace(/_/g, ' ').slice(0, 12)}
                                  />
                                </div>
                                <div className="task-item-stats">
                                  <div className="task-stat-row">
                                    <span className="task-stat-key">What's measured</span>
                                    <span className="task-stat-val primary-metric-name">{task.primary_metric.replace(/_/g, ' ')}</span>
                                  </div>
                                  <div className="task-stat-row">
                                    <span className="task-stat-key">Your progress</span>
                                    <span className="task-stat-val">
                                      {task.first_value} → <strong>{task.latest_value}</strong>
                                    </span>
                                  </div>
                                  <div className="task-stat-row">
                                    <span className="task-stat-key">Change</span>
                                    <span className={`task-stat-val ${task.improvement_pct > 0 ? 'text-green' : task.improvement_pct < 0 ? 'text-red' : ''}`}>
                                      <strong>{task.improvement_pct > 0 ? '+' : ''}{task.improvement_pct}%</strong>
                                    </span>
                                  </div>
                                  <div className="task-stat-row">
                                    <span className="task-stat-key">Level</span>
                                    <span className="task-stat-val">
                                      {'⬤'.repeat(task.max_difficulty_reached)}{'◯'.repeat(3 - task.max_difficulty_reached)} Lv.{task.max_difficulty_reached}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {task.weekly_progression?.length > 0 && (
                                <div className="task-item-chart">
                                  <h5>Weekly Progress</h5>
                                  <ProgressionChart data={task.weekly_progression} color={meta.color} height={110} />
                                </div>
                              )}

                              <div className="task-item-footer">
                                {task.total_sessions} session{task.total_sessions !== 1 ? 's' : ''} completed
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                <div className="analysis-card-actions" style={{ marginTop: 8 }}>
                  <Link to="/tasks" className="btn btn-sm btn-primary">Continue Training</Link>
                  <Link to="/tasks/history" className="btn btn-sm btn-secondary">View History →</Link>
                </div>
              </div>
            ) : (
              <div className="analysis-card">
                <div className="analysis-card-header">
                  <span className="card-icon-sm">🧩</span>
                  <h2>Cognitive Exercises</h2>
                </div>
                <div className="analysis-empty-state">
                  <p>Complete cognitive exercises to see your performance and progress here. Each exercise targets different skills like memory, attention, and social understanding.</p>
                  <Link to="/tasks" className="btn btn-sm btn-primary">Start Training</Link>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── CLINICAL PROFILE TAB ─── */}
        {activeTab === 'clinical' && (
          <div className="clinical-profile-tab">

            {/* Normative Scores */}
            {Object.keys(normScores).length > 0 && (
              <div className="analysis-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analysis-card-header">
                  <span className="card-icon-sm">📐</span>
                  <h3>Normative Task Scores</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Your cognitive task performance compared to age-matched norms. T-score mean is 50, SD is 10.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {Object.entries(normScores).map(([cat, info]) => (
                    <div key={cat} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                        {info.task_name || cat.replace(/_/g, ' ')}
                      </div>
                      {Object.entries(info.metrics || {}).map(([metric, norm]) => (
                        <div key={metric} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.85rem', borderBottom: '1px solid #eee' }}>
                          <span style={{ textTransform: 'capitalize' }}>{metric.replace(/_/g, ' ')}</span>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>T={Math.round(norm.t_score)}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>P{Math.round(norm.percentile)}</span>
                            <span style={{
                              fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 8,
                              background: norm.classification_key === 'within_normal' ? '#38a16918' :
                                norm.classification_key === 'low_average' ? '#d69e2e18' :
                                norm.classification_key === 'borderline' ? '#dd6b2018' : '#e53e3e18',
                              color: norm.classification_key === 'within_normal' ? '#38a169' :
                                norm.classification_key === 'low_average' ? '#d69e2e' :
                                norm.classification_key === 'borderline' ? '#dd6b20' : '#e53e3e',
                            }}>
                              {norm.classification_label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Pillar composites */}
                {Object.keys(pillarComps).length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Pillar Composite Scores</h4>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {Object.entries(pillarComps).map(([pillar, comp]) => {
                        const pm = pillarMeta[pillar] || { icon: '📊', color: '#666', label: pillar }
                        return (
                          <div key={pillar} style={{
                            padding: '1rem', background: pm.color + '08', border: `2px solid ${pm.color}20`,
                            borderRadius: 12, minWidth: 200, flex: '1 1 200px', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '1.5rem' }}>{pm.icon}</div>
                            <div style={{ fontWeight: 700, margin: '0.25rem 0' }}>{pm.label}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: pm.color }}>T={Math.round(comp.composite_t_score)}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>P{Math.round(comp.composite_percentile)}</div>
                            <div style={{
                              fontSize: '0.75rem', padding: '0.2rem 0.75rem', borderRadius: 8, display: 'inline-block', marginTop: '0.5rem',
                              background: comp.classification_key === 'within_normal' ? '#38a16918' : '#e53e3e18',
                              color: comp.classification_key === 'within_normal' ? '#38a169' : '#e53e3e',
                            }}>
                              {comp.classification_label}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Additional ASD Screenings */}
            {additional_screenings && additional_screenings.length > 0 && (
              <div className="analysis-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analysis-card-header">
                  <span className="card-icon-sm">🧩</span>
                  <h3>Additional ASD Screenings</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {additional_screenings.map(s => (
                    <div key={s.id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{s.instrument?.replace(/_/g, '-')}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{s.total_score}/{s.max_score}</span>
                          <span style={{
                            padding: '0.2rem 0.75rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                            background: s.severity === 'non_clinical' || s.severity === 'within_normal' ? '#38a16918' :
                              s.severity === 'mild' ? '#d69e2e18' : '#e53e3e18',
                            color: s.severity === 'non_clinical' || s.severity === 'within_normal' ? '#38a169' :
                              s.severity === 'mild' ? '#d69e2e' : '#e53e3e',
                          }}>{(s.severity || '').replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      {s.domain_scores && Object.keys(s.domain_scores).length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {Object.entries(s.domain_scores).map(([k, v]) => (
                            <span key={k} style={{ padding: '0.2rem 0.5rem', background: '#e2e8f0', borderRadius: 6, fontSize: '0.75rem' }}>
                              {k.replace(/_/g, ' ')}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                      {s.interpretation && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{s.interpretation}</p>}
                      <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginTop: '0.25rem' }}>
                        {s.completed_at ? formatDateOnlyIST(s.completed_at) : ''}
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/additional-screening" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Take Another Screening →</Link>
              </div>
            )}

            {/* Comorbidity Screenings */}
            {comorbidity && comorbidity.length > 0 && (
              <div className="analysis-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analysis-card-header">
                  <span className="card-icon-sm">🩺</span>
                  <h3>Comorbidity Screenings</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comorbidity.map(c => (
                    <div key={c.id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{c.instrument}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{c.total_score}/{c.max_score}</span>
                          <span style={{
                            padding: '0.2rem 0.75rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                            background: c.severity === 'minimal' || c.severity === 'unlikely' ? '#38a16918' :
                              c.severity === 'mild' || c.severity === 'possible' ? '#d69e2e18' : '#e53e3e18',
                            color: c.severity === 'minimal' || c.severity === 'unlikely' ? '#38a169' :
                              c.severity === 'mild' || c.severity === 'possible' ? '#d69e2e' : '#e53e3e',
                          }}>{(c.severity || '').replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      {c.clinical_flags && Object.keys(c.clinical_flags).length > 0 && (
                        <div style={{ padding: '0.5rem 0.75rem', background: '#fed7d7', borderRadius: 8, marginBottom: '0.5rem', fontSize: '0.85rem', color: '#c53030' }}>
                          ⚠ Flags: {Object.entries(c.clinical_flags).filter(([,v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ')}
                        </div>
                      )}
                      {c.interpretation && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{c.interpretation}</p>}
                    </div>
                  ))}
                </div>
                <Link to="/comorbidity-screening" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Take Another Screening →</Link>
              </div>
            )}

            {/* Behavioral Observations */}
            {behavioral_observations && behavioral_observations.total > 0 && (
              <div className="analysis-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analysis-card-header">
                  <span className="card-icon-sm">📝</span>
                  <h3>Behavioral Observations</h3>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{behavioral_observations.total}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Logged</div>
                  </div>
                </div>
                {behavioral_observations.category_counts && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>By Category</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {Object.entries(behavioral_observations.category_counts).sort((a,b) => b[1]-a[1]).map(([cat, count]) => (
                        <span key={cat} style={{ padding: '0.3rem 0.75rem', background: '#e2e8f0', borderRadius: 16, fontSize: '0.8rem' }}>
                          {cat.replace(/_/g, ' ')}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {behavioral_observations.top_patterns && behavioral_observations.top_patterns.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Top Patterns</h4>
                    {behavioral_observations.top_patterns.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #eee', fontSize: '0.85rem' }}>
                        <span><strong>{(p.category || '').replace(/_/g, ' ')}</strong> – {(p.behavior || '').replace(/_/g, ' ')}</span>
                        <span style={{ fontWeight: 700 }}>{p.count}×</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/behavioral-log" className="btn btn-secondary" style={{ marginTop: '1rem' }}>View Full Log →</Link>
              </div>
            )}

            {/* Referrals */}
            {referrals && referrals.length > 0 && (
              <div className="analysis-card" style={{ marginBottom: '1.5rem' }}>
                <div className="analysis-card-header">
                  <span className="card-icon-sm">🔗</span>
                  <h3>Active Referrals</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {referrals.map(r => (
                    <div key={r.id} style={{
                      padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 10,
                      borderLeft: `4px solid ${r.urgency === 'urgent' ? '#e53e3e' : r.urgency === 'soon' ? '#d69e2e' : '#38a169'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{(r.referral_type || '').replace(/_/g, ' ')}</span>
                        {r.reason && <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.reason}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
                          background: r.urgency === 'urgent' ? '#fed7d7' : r.urgency === 'soon' ? '#fefcbf' : '#c6f6d5',
                          color: r.urgency === 'urgent' ? '#c53030' : r.urgency === 'soon' ? '#975a16' : '#276749',
                        }}>{r.urgency}</span>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: 8, fontSize: '0.7rem', background: '#e2e8f0' }}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/referrals" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Manage Referrals →</Link>
              </div>
            )}

            {/* Empty state */}
            {(!additional_screenings || additional_screenings.length === 0) && (!comorbidity || comorbidity.length === 0) &&
             (!behavioral_observations || !behavioral_observations.total) && (!referrals || referrals.length === 0) &&
             Object.keys(normScores).length === 0 && (
              <div className="analysis-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <h3>No Clinical Data Yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Complete additional screenings, log behavioral observations, or finish cognitive tasks to build your clinical profile.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/additional-screening" className="btn btn-primary">ASD Screening</Link>
                  <Link to="/comorbidity-screening" className="btn btn-secondary">Comorbidity Screening</Link>
                  <Link to="/behavioral-log" className="btn btn-secondary">Log Behavior</Link>
                  <Link to="/tasks" className="btn btn-secondary">Cognitive Tasks</Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── RECOMMENDATIONS TAB ─── */}
        {activeTab === 'recommendations' && (
          <div className="analysis-card rec-card">
            <div className="analysis-card-header">
              <span className="card-icon-sm">💡</span>
              <h2>Personalised Recommendations</h2>
              <span className="card-period">AI-generated</span>
            </div>

            {!recs?.has_recommendations ? (
              <div className="rec-empty-state">
                <span className="rec-empty-icon">🤖</span>
                <h3>No recommendations yet</h3>
                <p>Complete a screening, write a journal entry, or finish a task — our AI will analyse your data and generate personalised task suggestions for you.</p>
                <Link to="/screening" className="btn btn-primary" style={{ marginTop: 16 }}>Take a Screening</Link>
              </div>
            ) : (
              <>
                {recs.summary && (
                  <div className="rec-summary-box">
                    <span className="rec-summary-icon">🧠</span>
                    <p>{recs.summary}</p>
                  </div>
                )}

                <div className="rec-list">
                  {recs.recommendations.map(r => {
                    const catMatch = r.reason.match(/^\[(\w+)\]\s*(.*)/)
                    const category = catMatch?.[1] || null
                    const reason = catMatch?.[2] || r.reason
                    const isExternal = r.redirect_link?.startsWith('http')
                    const isPending = r.status === 'pending'
                    const isCompleted = r.status === 'completed'
                    const isDismissed = r.status === 'dismissed'

                    const statusMeta = {
                      pending:   { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
                      completed: { color: '#10b981', bg: '#dcfce7', label: 'Completed ✓' },
                      dismissed: { color: '#94a3b8', bg: '#f1f5f9', label: 'Dismissed' },
                    }
                    const sm = statusMeta[r.status] || statusMeta.pending

                    const isResourceRec = category === 'resource' || !!r.resource

                    const handleRecClick = () => {
                      if (!r.redirect_link || !isPending) return
                      // Only mark completed when the user opens a resource (not a task)
                      if (isResourceRec) completeRec(r.id)
                      if (isExternal) {
                        window.open(r.redirect_link, '_blank', 'noopener,noreferrer')
                      } else {
                        navigate(r.redirect_link)
                      }
                    }

                    return (
                      <div
                        key={r.id}
                        className={`rec-item${r.redirect_link && isPending ? ' rec-item--clickable' : ''}`}
                        onClick={handleRecClick}
                        title={r.redirect_link && isPending ? 'Click to go to recommended task' : undefined}
                        style={{ opacity: isDismissed ? 0.6 : 1 }}
                      >
                        <div className="rec-item-body">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            {category && <span className="rec-category-badge">{category.replace(/_/g, ' ')}</span>}
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                              background: sm.bg, color: sm.color,
                            }}>{sm.label}</span>
                          </div>
                          <p className="rec-reason">{reason}</p>
                          {r.resource && (
                            <div className="rec-resource-link">
                              <span>📎</span>
                              <span>{r.resource.title}</span>
                            </div>
                          )}
                          {r.redirect_link && isPending && (
                            <span className="rec-go-hint">{isExternal ? '↗ Open resource' : '→ Go to task'}</span>
                          )}
                          {r.comment && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic', borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                              💬 {r.comment}
                            </p>
                          )}
                        </div>

                      </div>
                    )
                  })}
                </div>

                <p className="rec-disclaimer">
                  These recommendations are generated by AI based on your latest activity. They are not medical advice — always consult a healthcare professional for clinical decisions.
                </p>
              </>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="analysis-disclaimer">
          <strong>Important:</strong> These insights come from your self-reported journals, AQ-10 questionnaire responses,
          and cognitive exercise scores. They help you track patterns over time but are <strong>not a clinical diagnosis</strong>.
          If you have concerns, please speak with a qualified healthcare professional.
        </div>
      </div>
    </div>
  )
}
