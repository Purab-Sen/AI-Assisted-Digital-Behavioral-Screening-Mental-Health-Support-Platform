/**
 * TaskHistory Page
 * 
 * Displays user's completed task sessions and performance over time.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import taskService from '../services/taskService';
import './TaskHistory.css';

const TASK_ICONS = {
  attention: '🎯',
  memory: '🧠',
  processing_speed: '⚡',
  flexibility: '🔄',
  response_inhibition: '🛑',
  social_cognition: '👥'
};

function TaskHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyData, statsData] = await Promise.all([
        taskService.getHistory(50),
        taskService.getMyStats()
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load task history');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    if (sessionDetails[sessionId]) return;
    
    try {
      const data = await taskService.getSession(sessionId);
      setSessionDetails(prev => ({ ...prev, [sessionId]: data }));
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  const toggleSession = (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      loadSessionDetails(sessionId);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="task-history-page">
        <div className="loading">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-history-page">
        <div className="error-message">{error}</div>
        <button onClick={loadData} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="task-history-page">
      <div className="history-header">
        <h1>Task History</h1>
        <p>Your behavioral task performance over time</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-box">
            <span className="stat-number">{stats.total_sessions_completed}</span>
            <span className="stat-text">Sessions Completed</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{stats.total_tasks_attempted}</span>
            <span className="stat-text">Different Tasks</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{formatDuration(stats.total_time_spent_seconds)}</span>
            <span className="stat-text">Total Time</span>
          </div>
        </div>
      )}

      {/* Progress Cards */}
      {stats?.task_progress?.length > 0 && (
        <div className="progress-section">
          <h2>Task Progress</h2>
          <div className="progress-cards">
            {stats.task_progress.map(task => (
              <div key={task.task_id} className="progress-card">
                <div className="progress-header">
                  <span className="task-icon">{TASK_ICONS[task.task_name?.toLowerCase()] || '📋'}</span>
                  <h3>{task.task_name}</h3>
                </div>
                <div className="progress-stats">
                  <div className="progress-stat">
                    <span className="label">Attempts</span>
                    <span className="value">{task.completed_attempts}</span>
                  </div>
                  {task.best_score !== null && (
                    <div className="progress-stat">
                      <span className="label">Best Score</span>
                      <span className="value">{Math.round(task.best_score)}%</span>
                    </div>
                  )}
                  {task.average_score !== null && (
                    <div className="progress-stat">
                      <span className="label">Average</span>
                      <span className="value">{Math.round(task.average_score)}%</span>
                    </div>
                  )}
                </div>
                {task.improvement_trend && (
                  <div className={`trend-badge ${task.improvement_trend}`}>
                    {task.improvement_trend === 'improving' && '📈 Improving'}
                    {task.improvement_trend === 'stable' && '➡️ Stable'}
                    {task.improvement_trend === 'declining' && '📉 Practice More'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session List */}
      <div className="sessions-section">
        <h2>Recent Sessions</h2>
        
        {history?.sessions?.length === 0 ? (
          <div className="no-history">
            <p>No task sessions yet. Start your first task!</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/tasks')}
            >
              Browse Tasks
            </button>
          </div>
        ) : (
          <div className="sessions-list">
            {history?.sessions?.map(session => (
              <div 
                key={session.id} 
                className={`session-item ${expandedSession === session.id ? 'expanded' : ''}`}
              >
                <div 
                  className="session-header"
                  onClick={() => session.is_complete && toggleSession(session.id)}
                >
                  <div className="session-icon">
                    {TASK_ICONS[session.task_type] || '📋'}
                  </div>
                  <div className="session-info">
                    <h4>{session.task_name}</h4>
                    <span className="session-date">{formatDate(session.started_at)}</span>
                  </div>
                  <div className="session-status">
                    {session.is_complete ? (
                      <>
                        {session.primary_score !== null && (
                          <span className="score">{Math.round(session.primary_score)}%</span>
                        )}
                        <span className="status complete">Completed</span>
                      </>
                    ) : (
                      <span className="status incomplete">Incomplete</span>
                    )}
                  </div>
                  {session.is_complete && (
                    <span className="expand-icon">
                      {expandedSession === session.id ? '▲' : '▼'}
                    </span>
                  )}
                </div>
                
                {expandedSession === session.id && sessionDetails[session.id] && (
                  <div className="session-details">
                    <div className="details-grid">
                      <div className="detail-item">
                        <span className="label">Duration</span>
                        <span className="value">
                          {formatDuration(sessionDetails[session.id].duration_seconds)}
                        </span>
                      </div>
                      {sessionDetails[session.id].results.map((r, idx) => (
                        <div key={idx} className="detail-item">
                          <span className="label">{r.metric_name.replace(/_/g, ' ')}</span>
                          <span className="value">
                            {r.metric_name.includes('accuracy') || r.metric_name.includes('score')
                              ? `${Math.round(r.metric_value)}%`
                              : r.metric_name.includes('time')
                                ? `${Math.round(r.metric_value)}ms`
                                : Math.round(r.metric_value * 100) / 100
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {sessionDetails[session.id].performance_summary?.interpretation?.length > 0 && (
                      <div className="interpretation">
                        {sessionDetails[session.id].performance_summary.interpretation.map((item, idx) => (
                          <p key={idx}>→ {item}</p>
                        ))}
                      </div>
                    )}
                    
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => navigate(`/tasks/${session.task_id}/play`)}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="history-actions">
        <button
          className="btn btn-primary"
          onClick={() => navigate('/tasks')}
        >
          Browse Tasks
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default TaskHistory;
