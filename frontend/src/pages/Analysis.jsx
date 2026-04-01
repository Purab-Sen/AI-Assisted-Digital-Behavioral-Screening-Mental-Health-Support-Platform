/**
 * Analysis Page
 *
 * Shows aggregated behavioral insights: journal mood/stress trends
 * and ASD screening history summary.
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import api from '../services/api'
import './Analysis.css'

export default function Analysis() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/analysis/summary')
      .then(res => setData(res.data))
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

  const { journal, screening, tasks, insight } = data

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

  return (
    <div className="analysis-container">
      <NavBar />

      <div className="analysis-inner">
        <div className="analysis-header">
          <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
          <h1>Behavioral Analysis</h1>
          <p className="analysis-subtitle">AI-powered insights based on your journal entries and ASD screening results.</p>
        </div>

        {/* Insight Banner */}
        <div className="insight-banner">
          <span className="insight-icon">🧠</span>
          <p>{insight}</p>
        </div>

        <div className="analysis-grid">

          {/* === Journal Card === */}
          <div className="analysis-card">
            <div className="analysis-card-header">
              <span className="card-icon-sm">📔</span>
              <h2>Journal Insights</h2>
              <span className="card-period">Last 30 days</span>
            </div>

            {journal.entry_count_30d === 0 ? (
              <div className="analysis-empty-state">
                <p>No journal entries in the last 30 days.</p>
                <Link to="/journal" className="btn btn-sm btn-primary">Write First Entry</Link>
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
                      <span className="stat-label">Avg Mood</span>
                      <span className={`stat-badge badge-${moodColor(journal.mood_label)}`}>
                        {journal.mood_label} ({journal.avg_mood}/10)
                      </span>
                    </div>
                    <MiniBar value={journal.avg_mood} color={moodColor(journal.mood_label)} />
                  </div>
                )}

                {journal.avg_stress != null && (
                  <div className="stat-block">
                    <div className="stat-row">
                      <span className="stat-label">Avg Stress</span>
                      <span className={`stat-badge badge-${stressColor(journal.stress_label)}`}>
                        {journal.stress_label} ({journal.avg_stress}/10)
                      </span>
                    </div>
                    <MiniBar value={journal.avg_stress} color={stressColor(journal.stress_label)} />
                  </div>
                )}

                {hasMoodTrend && (
                  <div className="trend-section">
                    <h4>Weekly Mood Trend</h4>
                    <div className="trend-bars">
                      {journal.mood_trend.map((pt, i) => (
                        <div key={i} className="trend-bar-col">
                          <div className="trend-bar-track">
                            <div
                              className="trend-bar-fill trend-bar-blue"
                              style={{ height: `${(pt.avg / 10) * 100}%` }}
                            />
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
                    <h4>Weekly Stress Trend</h4>
                    <div className="trend-bars">
                      {journal.stress_trend.map((pt, i) => (
                        <div key={i} className="trend-bar-col">
                          <div className="trend-bar-track">
                            <div
                              className="trend-bar-fill trend-bar-orange"
                              style={{ height: `${(pt.avg / 10) * 100}%` }}
                            />
                          </div>
                          <span className="trend-bar-label">{pt.week}</span>
                          <span className="trend-bar-val">{pt.avg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link to="/journal" className="btn btn-sm btn-secondary analysis-card-link">
                  View Journal →
                </Link>
              </>
            )}
          </div>

          {/* === Screening Card === */}
          <div className="analysis-card">
            <div className="analysis-card-header">
              <span className="card-icon-sm">📋</span>
              <h2>ASD Screening</h2>
              <span className="card-period">Last 5 sessions</span>
            </div>

            {screening.total_completed === 0 ? (
              <div className="analysis-empty-state">
                <p>No completed screenings yet.</p>
                <Link to="/screening" className="btn btn-sm btn-primary">Take Screening</Link>
              </div>
            ) : (
              <>
                <div className="stat-row">
                  <span className="stat-label">Sessions Completed</span>
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
                  </div>
                )}

                {screening.latest_risk_level && (
                  <div className="stat-block">
                    <div className="stat-row">
                      <span className="stat-label">AQ Score Risk</span>
                      <span className={`stat-badge badge-${riskColor(screening.latest_risk_level)}`}>
                        {screening.latest_risk_level?.charAt(0).toUpperCase() + screening.latest_risk_level?.slice(1)} Risk
                        {screening.latest_raw_score != null && ` (${screening.latest_raw_score}/10)`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Screening history timeline */}
                {screening.history.length > 1 && (
                  <div className="trend-section">
                    <h4>Score History</h4>
                    <div className="trend-bars">
                      {[...screening.history].reverse().map((s, i) => (
                        <div key={s.id} className="trend-bar-col">
                          <div className="trend-bar-track">
                            <div
                              className={`trend-bar-fill trend-bar-${riskColor(s.risk_level)}-bar`}
                              style={{ height: `${((s.raw_score || 0) / 10) * 100}%` }}
                            />
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

        </div>

        {/* === Task Performance Analytics === */}
        {tasks && tasks.total_completed > 0 && (
          <div className="task-analytics-section">
            <div className="analysis-card task-analytics-card">
              <div className="analysis-card-header">
                <span className="card-icon-sm">🧩</span>
                <h2>Cognitive Task Performance</h2>
                <span className="card-period">{tasks.total_completed} sessions</span>
              </div>

              {/* Task insight banner */}
              <div className="task-insight-banner">
                <span className="insight-icon">📈</span>
                <p>{tasks.task_insight}</p>
              </div>

              {/* Pillar overview gauges */}
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

              {/* Pillar-by-pillar detailed breakdown */}
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
                        // For metrics where lower is better (false_alarm_rate, switch_cost_ms, cue_detection_latency)
                        const invertDisplay = ['false_alarm_rate', 'switch_cost_ms', 'cue_detection_latency'].includes(task.primary_metric)
                        const displayLatest = invertDisplay
                          ? `${task.latest_value}${task.primary_metric.includes('ms') ? 'ms' : '%'}`
                          : `${task.latest_value}%`

                        return (
                          <div key={task.category} className="task-analytics-item">
                            {/* Header with trend */}
                            <div className="task-item-header">
                              <h4>{task.task_name}</h4>
                              <span className={`task-trend-badge ${trendUp ? 'trend-positive' : trendDown ? 'trend-negative' : 'trend-neutral'}`}>
                                {trendUp ? '↗' : trendDown ? '↘' : '→'}{' '}
                                {task.trend.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {/* Key metric gauge + stats */}
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
                                  <span className="task-stat-key">Metric</span>
                                  <span className="task-stat-val primary-metric-name">{task.primary_metric.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="task-stat-row">
                                  <span className="task-stat-key">First → Latest</span>
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
                                  <span className="task-stat-key">Max Level</span>
                                  <span className="task-stat-val">
                                    {'⬤'.repeat(task.max_difficulty_reached)}{'◯'.repeat(3 - task.max_difficulty_reached)} Lv.{task.max_difficulty_reached}
                                  </span>
                                </div>
                                {task.rtcv != null && (
                                  <div className="task-stat-row">
                                    <span className="task-stat-key">RTCV</span>
                                    <span className={`task-stat-val ${task.rtcv > 30 ? 'text-warn' : ''}`}>
                                      {task.rtcv}% {task.rtcv > 30 && '⚠️ High variability'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Progression line chart */}
                            {task.weekly_progression && task.weekly_progression.length > 0 && (
                              <div className="task-item-chart">
                                <h5>Weekly Progression</h5>
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
          </div>
        )}

        {tasks && tasks.total_completed === 0 && (
          <div className="analysis-card" style={{ marginBottom: 28 }}>
            <div className="analysis-card-header">
              <span className="card-icon-sm">🧩</span>
              <h2>Cognitive Task Performance</h2>
            </div>
            <div className="analysis-empty-state">
              <p>Complete cognitive tasks to see clinical progression analysis here.</p>
              <Link to="/tasks" className="btn btn-sm btn-primary">Start Training</Link>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="analysis-disclaimer">
          <strong>Note:</strong> These insights are derived from your self-reported journal entries, AQ-10 screening responses,
          and cognitive task performance metrics. They are not a clinical diagnosis. If you have concerns, please consult a qualified healthcare professional.
        </div>
      </div>
    </div>
  )
}
