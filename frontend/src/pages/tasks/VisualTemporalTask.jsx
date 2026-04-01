/**
 * Visual Temporal Processing Task
 * 
 * Medical paradigm: Psychophysical Assessment with Adaptive Staircase
 * 3-down/1-up staircase converging to 79.4% detection threshold
 * Key metric: Temporal discrimination threshold (ms)
 * Compares two visual stimulus durations
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function VisualTemporalTask({ config, onComplete }) {
  const baseDuration = config.base_duration_ms || 500;
  const initialDiff = config.initial_difference_ms || 300;
  const minDiff = config.min_difference_ms || 50;
  const stepDown = config.step_down_ms || 30;
  const stepUp = config.step_up_ms || 60;
  const totalTrials = config.total_trials || 30;

  const [currentDiff, setCurrentDiff] = useState(initialDiff);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready'); // ready, stim1, gap, stim2, respond, feedback
  const [longerFirst, setLongerFirst] = useState(false);
  const [responses, setResponses] = useState([]);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [reversals, setReversals] = useState([]);
  const [lastDirection, setLastDirection] = useState(null); // 'up' or 'down'
  const [trialStartTime, setTrialStartTime] = useState(null);
  const timerRef = useRef(null);

  // Start first trial
  useEffect(() => {
    if (trialIndex === 0) {
      startTrial();
    }
  }, []);

  const startTrial = useCallback(() => {
    const isLongerFirst = Math.random() < 0.5;
    setLongerFirst(isLongerFirst);
    setPhase('stim1');

    const dur1 = isLongerFirst ? baseDuration + currentDiff : baseDuration;
    const dur2 = isLongerFirst ? baseDuration : baseDuration + currentDiff;

    // Show first stimulus
    setTimeout(() => {
      setPhase('gap');

      // Gap between stimuli
      setTimeout(() => {
        setPhase('stim2');

        // Show second stimulus
        setTimeout(() => {
          setPhase('respond');
          setTrialStartTime(Date.now());
        }, dur2);
      }, 500);
    }, dur1);
  }, [baseDuration, currentDiff]);

  // Completion
  useEffect(() => {
    if (trialIndex >= totalTrials && phase !== 'done') {
      setPhase('done');

      // Calculate threshold from reversals
      const lastReversals = reversals.slice(-6);
      const threshold = lastReversals.length > 0
        ? lastReversals.reduce((a, b) => a + b, 0) / lastReversals.length
        : currentDiff;

      const accuracy = responses.length > 0
        ? (responses.filter(r => r.correct).length / responses.length) * 100 : 0;
      const rts = responses.filter(r => r.rt).map(r => r.rt);
      const avgRT = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;

      onComplete([
        { metric_name: 'threshold_ms', metric_value: Math.round(threshold * 100) / 100 },
        { metric_name: 'accuracy', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'reversals', metric_value: reversals.length },
        { metric_name: 'avg_reaction_time', metric_value: Math.round(avgRT) },
      ]);
    }
  }, [trialIndex, totalTrials, phase]);

  const handleResponse = useCallback((choseFirst) => {
    if (phase !== 'respond') return;

    const rt = Date.now() - trialStartTime;
    const correct = choseFirst === longerFirst;

    setResponses(prev => [...prev, { correct, rt, diff: currentDiff }]);

    // 3-down/1-up staircase
    if (correct) {
      const newConsec = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsec);

      if (newConsec >= 3) {
        // Decrease difficulty (make difference smaller)
        const newDiff = Math.max(minDiff, currentDiff - stepDown);
        if (lastDirection === 'up') {
          setReversals(prev => [...prev, currentDiff]);
        }
        setLastDirection('down');
        setCurrentDiff(newDiff);
        setConsecutiveCorrect(0);
      }
    } else {
      // Increase difficulty (make difference larger)
      const newDiff = currentDiff + stepUp;
      if (lastDirection === 'down') {
        setReversals(prev => [...prev, currentDiff]);
      }
      setLastDirection('up');
      setCurrentDiff(newDiff);
      setConsecutiveCorrect(0);
    }

    setPhase('feedback');

    setTimeout(() => {
      setTrialIndex(prev => prev + 1);
      startTrial();
    }, 1000);
  }, [phase, longerFirst, consecutiveCorrect, currentDiff, minDiff, stepDown, stepUp, lastDirection, trialStartTime, startTrial]);

  const progress = totalTrials > 0 ? (trialIndex / totalTrials) * 100 : 0;

  return (
    <div className="task-arena sensory-task visual-temporal-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">{Math.min(trialIndex + 1, totalTrials)} / {totalTrials}</div>

      <div className="sensory-display">
        {phase === 'stim1' && (
          <div className="visual-stimulus active">
            <div className="stim-label">Stimulus 1</div>
            <div className="stim-flash" />
          </div>
        )}
        {phase === 'gap' && (
          <div className="visual-stimulus gap">
            <div className="stim-label">...</div>
          </div>
        )}
        {phase === 'stim2' && (
          <div className="visual-stimulus active">
            <div className="stim-label">Stimulus 2</div>
            <div className="stim-flash second" />
          </div>
        )}
        {phase === 'respond' && (
          <div className="sensory-response">
            <p className="sensory-question">Which stimulus lasted LONGER?</p>
            <div className="sensory-buttons">
              <button className="sensory-btn" onClick={() => handleResponse(true)}>
                First
              </button>
              <button className="sensory-btn" onClick={() => handleResponse(false)}>
                Second
              </button>
            </div>
          </div>
        )}
        {phase === 'feedback' && (
          <div className="sensory-feedback">
            {responses[responses.length - 1]?.correct ? '✅ Correct!' : '❌ Incorrect'}
          </div>
        )}
        {phase === 'ready' && (
          <div className="sensory-feedback">Get ready...</div>
        )}
      </div>

      <div className="staircase-info">
        <span>Current difference: {Math.round(currentDiff)}ms</span>
        <span>Reversals: {reversals.length}</span>
      </div>

      <p className="task-hint">
        Watch two colored flashes and decide which lasted longer
      </p>
    </div>
  );
}

export default VisualTemporalTask;
