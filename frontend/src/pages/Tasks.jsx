/**
 * Tasks Page
 * 
 * Displays available behavioral tasks and allows users to start them.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import taskService from '../services/taskService';
import NavBar from '../components/NavBar';
import './Tasks.css';

const TASK_ICONS = {
  attention: '🎯',
  memory: '🧠',
  processing_speed: '⚡',
  flexibility: '🔄',
  response_inhibition: '🛑',
  social_cognition: '👥'
};

const TASK_COLORS = {
  attention: '#3498db',
  memory: '#9b59b6',
  processing_speed: '#f39c12',
  flexibility: '#1abc9c',
  response_inhibition: '#e74c3c',
  social_cognition: '#2ecc71'
};

function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [selectedType]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await taskService.getAllTasks(selectedType);
      setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await taskService.getMyStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleStartTask = (taskId) => {
    navigate(`/tasks/${taskId}/play`);
  };

  const formatDuration = (seconds) => {
    if (seconds >= 60) {
      return `${Math.round(seconds / 60)} min`;
    }
    return `${seconds} sec`;
  };

  const taskTypes = [...new Set(tasks.map(t => t.type))].filter(Boolean);

  if (loading) {
    return (
      <div className="tasks-page">
        <div className="loading-spinner">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tasks-page">
        <div className="error-message">{error}</div>
        <button onClick={loadTasks} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <NavBar />
      <div className="tasks-header">
        <h1>Behavioral Tasks</h1>
        <p>Complete interactive tasks to assess cognitive abilities</p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{stats.total_tasks_attempted}</span>
            <span className="stat-label">Tasks Attempted</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_sessions_completed}</span>
            <span className="stat-label">Sessions Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {Math.round(stats.total_time_spent_seconds / 60)} min
            </span>
            <span className="stat-label">Total Time</span>
          </div>
          {stats.favorite_task && (
            <div className="stat-card">
              <span className="stat-value">{stats.favorite_task}</span>
              <span className="stat-label">Favorite Task</span>
            </div>
          )}
        </div>
      )}

      {/* Type Filter */}
      <div className="task-filters">
        <button
          className={`filter-btn ${!selectedType ? 'active' : ''}`}
          onClick={() => setSelectedType(null)}
        >
          All Tasks
        </button>
        {taskTypes.map(type => (
          <button
            key={type}
            className={`filter-btn ${selectedType === type ? 'active' : ''}`}
            onClick={() => setSelectedType(type)}
            style={{ 
              backgroundColor: selectedType === type ? TASK_COLORS[type] : 'transparent',
              borderColor: TASK_COLORS[type]
            }}
          >
            {TASK_ICONS[type]} {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Task Grid */}
      <div className="tasks-grid">
        {tasks.map(task => {
          const progress = stats?.task_progress?.find(p => p.task_id === task.id);
          
          return (
            <div
              key={task.id}
              className="task-card"
              style={{ borderTopColor: TASK_COLORS[task.type] || '#3498db' }}
            >
              <div className="task-icon" style={{ backgroundColor: TASK_COLORS[task.type] }}>
                {TASK_ICONS[task.type] || '📋'}
              </div>
              
              <div className="task-content">
                <h3>{task.name}</h3>
                <p className="task-type">{task.type?.replace('_', ' ')}</p>
                <p className="task-description">{task.description}</p>
                
                <div className="task-meta">
                  <span className="duration">
                    ⏱️ {formatDuration(task.estimated_duration)}
                  </span>
                </div>

                {progress && progress.completed_attempts > 0 && (
                  <div className="task-progress">
                    <div className="progress-info">
                      <span>Completed: {progress.completed_attempts}x</span>
                      {progress.best_score !== null && (
                        <span>Best: {Math.round(progress.best_score)}%</span>
                      )}
                    </div>
                    {progress.improvement_trend && (
                      <span className={`trend ${progress.improvement_trend}`}>
                        {progress.improvement_trend === 'improving' && '📈 Improving'}
                        {progress.improvement_trend === 'stable' && '➡️ Stable'}
                        {progress.improvement_trend === 'declining' && '📉 Needs Practice'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary start-btn"
                onClick={() => handleStartTask(task.id)}
              >
                {progress?.completed_attempts > 0 ? 'Play Again' : 'Start Task'}
              </button>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="no-tasks">
          <p>No tasks available{selectedType ? ` for type: ${selectedType}` : ''}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="tasks-actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/tasks/history')}
        >
          View Task History
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

export default Tasks;
