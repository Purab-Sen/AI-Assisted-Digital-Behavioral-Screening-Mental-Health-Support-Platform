/**
 * TaskPlayer Page
 * 
 * Interactive task execution component with simulated behavioral tasks.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import taskService from '../services/taskService';
import './TaskPlayer.css';

// Task Components for each type
const AttentionTask = ({ config, onComplete }) => {
  const [stimuli, setStimuli] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingStimulus, setShowingStimulus] = useState(false);
  const [responses, setResponses] = useState([]);
  const [stimulusStartTime, setStimulusStartTime] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  
  useEffect(() => {
    // Generate stimuli
    const shapes = config.shapes || ['circle', 'square', 'triangle'];
    const total = config.total_stimuli || 20;
    const targetRatio = config.target_ratio || 0.3;
    
    const generated = [];
    for (let i = 0; i < total; i++) {
      const isTarget = Math.random() < targetRatio;
      generated.push({
        shape: isTarget ? 'circle' : shapes[Math.floor(Math.random() * shapes.length)],
        isTarget
      });
    }
    setStimuli(generated);
    setIsRunning(true);
  }, [config]);

  useEffect(() => {
    if (!isRunning || currentIndex >= stimuli.length) return;
    
    // Show stimulus
    setShowingStimulus(true);
    setStimulusStartTime(Date.now());
    
    const hideTimer = setTimeout(() => {
      setShowingStimulus(false);
      
      // After ISI, move to next stimulus
      const nextTimer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, config.inter_stimulus_interval_ms || 1000);
      
      return () => clearTimeout(nextTimer);
    }, config.stimulus_duration_ms || 500);
    
    return () => clearTimeout(hideTimer);
  }, [currentIndex, stimuli.length, isRunning, config]);

  useEffect(() => {
    if (currentIndex >= stimuli.length && stimuli.length > 0) {
      // Calculate results
      const targets = stimuli.filter(s => s.isTarget).length;
      const correctHits = responses.filter((r, i) => r.responded && stimuli[i]?.isTarget).length;
      const commissionErrors = responses.filter((r, i) => r.responded && !stimuli[i]?.isTarget).length;
      const omissionErrors = targets - correctHits;
      
      const reactionTimes = responses
        .filter((r, i) => r.responded && r.reactionTime && stimuli[i]?.isTarget)
        .map(r => r.reactionTime);
      
      const avgRT = reactionTimes.length > 0
        ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
        : 0;
      
      onComplete([
        { metric_name: 'accuracy', metric_value: (correctHits / targets) * 100 },
        { metric_name: 'reaction_time_avg', metric_value: avgRT },
        { metric_name: 'commission_errors', metric_value: commissionErrors },
        { metric_name: 'omission_errors', metric_value: omissionErrors }
      ]);
    }
  }, [currentIndex, stimuli, responses, onComplete]);

  const handleResponse = useCallback(() => {
    if (!showingStimulus || responses[currentIndex]) return;
    
    const reactionTime = Date.now() - stimulusStartTime;
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[currentIndex] = { responded: true, reactionTime };
      return newResponses;
    });
  }, [showingStimulus, currentIndex, stimulusStartTime, responses]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleResponse();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleResponse]);

  const progress = (currentIndex / stimuli.length) * 100;
  const currentStimulus = stimuli[currentIndex];

  return (
    <div className="task-arena attention-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      
      <div className="stimulus-area" onClick={handleResponse}>
        {showingStimulus && currentStimulus && (
          <div className={`shape ${currentStimulus.shape}`} />
        )}
      </div>
      
      <p className="task-hint">Click or press SPACE when you see a CIRCLE</p>
    </div>
  );
};

const MemoryTask = ({ config, onComplete }) => {
  const [phase, setPhase] = useState('showing'); // showing, input, feedback
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [level, setLevel] = useState(config.initial_sequence_length || 3);
  const [showIndex, setShowIndex] = useState(-1);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const gridSize = config.grid_size || 4;

  const generateSequence = useCallback((length) => {
    const totalCells = gridSize * gridSize;
    const seq = [];
    for (let i = 0; i < length; i++) {
      seq.push(Math.floor(Math.random() * totalCells));
    }
    return seq;
  }, [gridSize]);

  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    const newSeq = generateSequence(level);
    setSequence(newSeq);
    setUserSequence([]);
    setPhase('showing');
    setShowIndex(-1);
    
    // Show sequence
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < newSeq.length) {
        setShowIndex(newSeq[idx]);
        setTimeout(() => setShowIndex(-1), 400);
        idx++;
      } else {
        clearInterval(interval);
        setPhase('input');
      }
    }, config.display_time_ms || 600);
  };

  const handleCellClick = (index) => {
    if (phase !== 'input') return;
    
    const newUserSeq = [...userSequence, index];
    setUserSequence(newUserSeq);
    
    // Check if correct so far
    if (newUserSeq[newUserSeq.length - 1] !== sequence[newUserSeq.length - 1]) {
      // Wrong!
      setPhase('feedback');
      setTotalAttempts(prev => prev + 1);
      
      setTimeout(() => {
        if (level > config.initial_sequence_length) {
          setLevel(prev => prev - 1);
        }
        startNewRound();
      }, 1500);
      return;
    }
    
    // Complete sequence
    if (newUserSeq.length === sequence.length) {
      setPhase('feedback');
      setTotalCorrect(prev => prev + 1);
      setTotalAttempts(prev => prev + 1);
      setMaxReached(prev => Math.max(prev, level));
      
      setTimeout(() => {
        if (level < (config.max_sequence_length || 9)) {
          setLevel(prev => prev + 1);
        } else {
          // Max reached - end task
          onComplete([
            { metric_name: 'max_sequence', metric_value: Math.max(maxReached, level) },
            { metric_name: 'accuracy', metric_value: ((totalCorrect + 1) / (totalAttempts + 1)) * 100 },
            { metric_name: 'total_correct', metric_value: totalCorrect + 1 },
            { metric_name: 'total_attempts', metric_value: totalAttempts + 1 }
          ]);
          return;
        }
        startNewRound();
      }, 1000);
    }
  };

  // End after certain attempts
  useEffect(() => {
    if (totalAttempts >= 10) {
      onComplete([
        { metric_name: 'max_sequence', metric_value: maxReached },
        { metric_name: 'accuracy', metric_value: (totalCorrect / totalAttempts) * 100 },
        { metric_name: 'total_correct', metric_value: totalCorrect },
        { metric_name: 'total_attempts', metric_value: totalAttempts }
      ]);
    }
  }, [totalAttempts, totalCorrect, maxReached, onComplete]);

  const cells = Array(gridSize * gridSize).fill(null);

  return (
    <div className="task-arena memory-task">
      <div className="memory-stats">
        <span>Level: {level}</span>
        <span>Score: {totalCorrect}/{totalAttempts}</span>
      </div>
      
      <div 
        className="memory-grid" 
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {cells.map((_, idx) => (
          <div
            key={idx}
            className={`memory-cell ${showIndex === idx ? 'active' : ''} ${
              phase === 'input' && userSequence.includes(idx) ? 'selected' : ''
            }`}
            onClick={() => handleCellClick(idx)}
          />
        ))}
      </div>
      
      <p className="task-hint">
        {phase === 'showing' && 'Watch the pattern...'}
        {phase === 'input' && 'Repeat the pattern!'}
        {phase === 'feedback' && (userSequence.length === sequence.length ? '✓ Correct!' : '✗ Try again')}
      </p>
    </div>
  );
};

const ProcessingSpeedTask = ({ config, onComplete }) => {
  const [pairs, setPairs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [pairStartTime, setPairStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(config.time_limit_seconds || 60);
  
  const symbols = config.symbols || ['★', '●', '■', '▲', '◆', '♦'];

  useEffect(() => {
    // Generate pairs
    const generated = [];
    for (let i = 0; i < 50; i++) {
      const isMatch = Math.random() < (config.match_probability || 0.5);
      const symbol1 = symbols[Math.floor(Math.random() * symbols.length)];
      const symbol2 = isMatch ? symbol1 : symbols.filter(s => s !== symbol1)[Math.floor(Math.random() * (symbols.length - 1))];
      generated.push({ symbol1, symbol2, isMatch });
    }
    setPairs(generated);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTask();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const finishTask = () => {
    const avgRT = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;
    
    onComplete([
      { metric_name: 'correct_responses', metric_value: correct },
      { metric_name: 'incorrect_responses', metric_value: incorrect },
      { metric_name: 'reaction_time_avg', metric_value: avgRT },
      { metric_name: 'throughput', metric_value: correct + incorrect }
    ]);
  };

  const handleResponse = (isSame) => {
    if (currentIndex >= pairs.length || timeLeft <= 0) return;
    
    const rt = Date.now() - pairStartTime;
    setReactionTimes(prev => [...prev, rt]);
    
    if (pairs[currentIndex].isMatch === isSame) {
      setCorrect(prev => prev + 1);
    } else {
      setIncorrect(prev => prev + 1);
    }
    
    setCurrentIndex(prev => prev + 1);
    setPairStartTime(Date.now());
  };

  const currentPair = pairs[currentIndex];

  return (
    <div className="task-arena processing-task">
      <div className="timer-bar">
        <div 
          className="timer-fill" 
          style={{ width: `${(timeLeft / (config.time_limit_seconds || 60)) * 100}%` }}
        />
        <span className="timer-text">{timeLeft}s</span>
      </div>
      
      {currentPair && timeLeft > 0 && (
        <>
          <div className="symbol-pair">
            <span className="symbol">{currentPair.symbol1}</span>
            <span className="symbol">{currentPair.symbol2}</span>
          </div>
          
          <div className="response-buttons">
            <button className="btn-same" onClick={() => handleResponse(true)}>
              SAME
            </button>
            <button className="btn-different" onClick={() => handleResponse(false)}>
              DIFFERENT
            </button>
          </div>
        </>
      )}
      
      <div className="score-display">
        Score: {correct}
      </div>
    </div>
  );
};

const ResponseInhibitionTask = ({ config, onComplete }) => {
  const [trials, setTrials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingStimulus, setShowingStimulus] = useState(false);
  const [responses, setResponses] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const total = config.total_trials || 40;
    const goRatio = config.go_ratio || 0.75;
    
    const generated = [];
    for (let i = 0; i < total; i++) {
      generated.push({ isGo: Math.random() < goRatio });
    }
    setTrials(generated);
    setIsRunning(true);
  }, [config]);

  useEffect(() => {
    if (!isRunning || currentIndex >= trials.length) return;
    
    setShowingStimulus(true);
    
    const hideTimer = setTimeout(() => {
      // Record non-response for current trial
      setResponses(prev => {
        if (prev[currentIndex] === undefined) {
          const newResponses = [...prev];
          newResponses[currentIndex] = { responded: false };
          return newResponses;
        }
        return prev;
      });
      
      setShowingStimulus(false);
      
      const nextTimer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, config.inter_stimulus_interval_ms || 800);
      
      return () => clearTimeout(nextTimer);
    }, config.stimulus_duration_ms || 400);
    
    return () => clearTimeout(hideTimer);
  }, [currentIndex, trials.length, isRunning, config]);

  useEffect(() => {
    if (currentIndex >= trials.length && trials.length > 0) {
      const goTrials = trials.filter(t => t.isGo);
      const nogoTrials = trials.filter(t => !t.isGo);
      
      const goHits = responses.filter((r, i) => r?.responded && trials[i]?.isGo).length;
      const falseAlarms = responses.filter((r, i) => r?.responded && !trials[i]?.isGo).length;
      
      const goRTs = responses
        .filter((r, i) => r?.responded && r?.reactionTime && trials[i]?.isGo)
        .map(r => r.reactionTime);
      
      const avgGoRT = goRTs.length > 0 ? goRTs.reduce((a, b) => a + b, 0) / goRTs.length : 0;
      
      onComplete([
        { metric_name: 'go_accuracy', metric_value: (goHits / goTrials.length) * 100 },
        { metric_name: 'nogo_accuracy', metric_value: ((nogoTrials.length - falseAlarms) / nogoTrials.length) * 100 },
        { metric_name: 'go_reaction_time', metric_value: avgGoRT },
        { metric_name: 'false_alarms', metric_value: falseAlarms }
      ]);
    }
  }, [currentIndex, trials, responses, onComplete]);

  const handleResponse = useCallback(() => {
    if (!showingStimulus || responses[currentIndex]) return;
    
    setResponses(prev => {
      const newResponses = [...prev];
      newResponses[currentIndex] = { responded: true, reactionTime: Date.now() };
      return newResponses;
    });
  }, [showingStimulus, currentIndex, responses]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleResponse();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleResponse]);

  const progress = (currentIndex / trials.length) * 100;
  const currentTrial = trials[currentIndex];

  return (
    <div className="task-arena inhibition-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      
      <div className="stimulus-area" onClick={handleResponse}>
        {showingStimulus && currentTrial && (
          <div className={`go-circle ${currentTrial.isGo ? 'go' : 'nogo'}`} />
        )}
      </div>
      
      <p className="task-hint">Press SPACE for GREEN, don't press for RED</p>
    </div>
  );
};

// Generic placeholder for other task types
const GenericTask = ({ config, onComplete }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const duration = 10000; // 10 seconds demo
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          onComplete([
            { metric_name: 'score', metric_value: 75 + Math.random() * 20 },
            { metric_name: 'completion_time', metric_value: duration / 1000 }
          ]);
          return 100;
        }
        return prev + 2;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="task-arena generic-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p>Task in progress... {Math.round(progress)}%</p>
    </div>
  );
};

// Main TaskPlayer Component
function TaskPlayer() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [phase, setPhase] = useState('loading'); // loading, instructions, playing, results
  const [sessionData, setSessionData] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const data = await taskService.startSession(parseInt(taskId));
      setSessionData(data);
      setPhase('instructions');
    } catch (err) {
      console.error('Failed to start task:', err);
      setError(err.response?.data?.detail || 'Failed to load task');
      setPhase('error');
    }
  };

  const handleStartTask = () => {
    setPhase('playing');
  };

  const handleTaskComplete = async (taskResults) => {
    try {
      const response = await taskService.submitSession(sessionData.session_id, taskResults);
      setResults(response);
      setPhase('results');
    } catch (err) {
      console.error('Failed to submit results:', err);
      setError('Failed to save results');
    }
  };

  const handlePlayAgain = () => {
    setPhase('loading');
    setResults(null);
    loadTask();
  };

  const renderTaskComponent = () => {
    if (!sessionData) return null;
    
    const props = {
      config: sessionData.config,
      onComplete: handleTaskComplete
    };

    switch (sessionData.task_type) {
      case 'attention':
        return <AttentionTask {...props} />;
      case 'memory':
        return <MemoryTask {...props} />;
      case 'processing_speed':
        return <ProcessingSpeedTask {...props} />;
      case 'response_inhibition':
        return <ResponseInhibitionTask {...props} />;
      default:
        return <GenericTask {...props} />;
    }
  };

  if (phase === 'loading') {
    return (
      <div className="task-player">
        <div className="loading">Loading task...</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="task-player">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'instructions') {
    return (
      <div className="task-player">
        <div className="instructions-screen">
          <h1>{sessionData.task_name}</h1>
          <div className="instructions-content">
            <pre>{sessionData.instructions}</pre>
          </div>
          <button className="btn btn-primary btn-large" onClick={handleStartTask}>
            Start Task
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="task-player">
        <div className="task-header">
          <h2>{sessionData.task_name}</h2>
        </div>
        {renderTaskComponent()}
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div className="task-player">
        <div className="results-screen">
          <h1>Task Complete!</h1>
          <h2>{results.task_name}</h2>
          
          <div className="results-summary">
            <h3>Your Results</h3>
            <div className="metrics-grid">
              {results.results.map((r, idx) => (
                <div key={idx} className="metric-card">
                  <span className="metric-name">{r.metric_name.replace(/_/g, ' ')}</span>
                  <span className="metric-value">
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
            
            {results.performance_summary?.interpretation?.length > 0 && (
              <div className="interpretation">
                <h4>Interpretation</h4>
                <ul>
                  {results.performance_summary.interpretation.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="results-actions">
            <button className="btn btn-primary" onClick={handlePlayAgain}>
              Play Again
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>
              Back to Tasks
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/tasks/history')}>
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default TaskPlayer;
