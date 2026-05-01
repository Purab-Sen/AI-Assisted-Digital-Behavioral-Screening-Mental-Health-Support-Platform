/**
 * Go/No-Go Inhibitory Control Task
 * 
 * Medical paradigm: Inhibitory Control and Interference Suppression
 * High Go:No-Go ratio creates prepotent response that must be inhibited
 * Key metric: False Alarm (FA) Rate
 * Tracks: Commission errors, omission errors, RT variability (IIV)
 * 
 * Includes instructions screen and practice phase before real trials.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function GoNoGoTask({ config, onComplete }) {
  // Clinical standard: 75:25 Go:NoGo creates prepotent response (Nosek & Banaji, 2001)
  const goRatio = config.go_ratio || 0.75;
  const stimDurationMs = config.stimulus_duration_ms || 800;
  const isiMs = config.isi_ms || 1500;
  const totalTrials = config.total_trials || 40;
  const goStim = config.go_stimulus || '🟢';
  const nogoStim = config.nogo_stimulus || '🔴';
  const practiceTrialCount = 8;

  const [trials, setTrials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showingStimulus, setShowingStimulus] = useState(false);
  const [responses, setResponses] = useState({});
  const [stimulusStartTime, setStimulusStartTime] = useState(null);
  const [phase, setPhase] = useState('instructions'); // instructions | practice | practice_done | running | done
  const [feedback, setFeedback] = useState(null);
  const [practiceResults, setPracticeResults] = useState([]);
  const responded = useRef(false);
  const timerRef = useRef(null);

  // Generate trial sequence with constrained randomization
  // Prevents >2 consecutive NoGo trials (maintains prepotent Go response)
  const generateTrials = (count, ratio) => {
    const t = [];
    let consecutiveNoGo = 0;
    for (let i = 0; i < count; i++) {
      let isGo = Math.random() < ratio;
      if (!isGo) {
        consecutiveNoGo++;
        if (consecutiveNoGo > 2) {
          isGo = true;
          consecutiveNoGo = 0;
        }
      } else {
        consecutiveNoGo = 0;
      }
      t.push({ isGo });
    }
    return t;
  };

  // Start practice trials
  const startPractice = () => {
    const practiceTrials = generateTrials(practiceTrialCount, 0.625); // 62.5% go for practice (more NoGo exposure)
    setTrials(practiceTrials);
    setPhase('practice');
    setCurrentIndex(0);
    setResponses({});
    setPracticeResults([]);
  };

  // Start real trials
  const startReal = () => {
    const realTrials = generateTrials(totalTrials, goRatio);
    setTrials(realTrials);
    setPhase('running');
    setCurrentIndex(0);
    setResponses({});
  };

  // Run each trial (works for both practice and running)
  useEffect(() => {
    if ((phase !== 'running' && phase !== 'practice') || currentIndex < 0 || currentIndex >= trials.length) return;

    responded.current = false;
    setFeedback(null);
    setShowingStimulus(true);
    setStimulusStartTime(Date.now());

    const hideTimer = setTimeout(() => {
      setShowingStimulus(false);

      // Record non-response if not responded
      if (!responded.current) {
        setResponses(prev => {
          if (!prev[currentIndex]) {
            return { ...prev, [currentIndex]: { responded: false } };
          }
          return prev;
        });
        // Show feedback only during practice
        if (phase === 'practice') {
          if (trials[currentIndex]?.isGo) {
            setFeedback('miss');
          } else {
            setFeedback('correct_reject');
          }
        }
      }

      const nextTimer = setTimeout(() => {
        setFeedback(null);
        setCurrentIndex(prev => prev + 1);
      }, isiMs - stimDurationMs);

      timerRef.current = nextTimer;
    }, stimDurationMs);

    return () => {
      clearTimeout(hideTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, phase, trials]);

  // Practice completion
  useEffect(() => {
    if (phase === 'practice' && currentIndex >= practiceTrialCount && trials.length > 0) {
      // Calculate practice accuracy
      let correct = 0;
      for (let i = 0; i < practiceTrialCount; i++) {
        const resp = responses[i];
        if (trials[i]?.isGo && resp?.responded) correct++;
        if (!trials[i]?.isGo && !resp?.responded) correct++;
      }
      setPracticeResults([{ correct, total: practiceTrialCount }]);
      setPhase('practice_done');
    }
  }, [currentIndex, phase, trials.length]);

  // Real trial completion
  useEffect(() => {
    if (currentIndex >= totalTrials && totalTrials > 0 && phase === 'running') {
      setPhase('done');

      const goTrials = trials.filter(t => t.isGo);
      const nogoTrials = trials.filter(t => !t.isGo);

      let goHits = 0, goMisses = 0, falseAlarms = 0, correctRejections = 0;
      const goRTs = [];

      for (let i = 0; i < totalTrials; i++) {
        const resp = responses[i];
        if (trials[i].isGo) {
          if (resp?.responded) {
            goHits++;
            if (resp.rt) goRTs.push(resp.rt);
          } else {
            goMisses++;
          }
        } else {
          if (resp?.responded) {
            falseAlarms++;
          } else {
            correctRejections++;
          }
        }
      }

      const goAccuracy = goTrials.length > 0 ? (goHits / goTrials.length) * 100 : 0;
      const nogoAccuracy = nogoTrials.length > 0 ? (correctRejections / nogoTrials.length) * 100 : 0;
      const faRate = nogoTrials.length > 0 ? (falseAlarms / nogoTrials.length) * 100 : 0;
      const avgGoRT = goRTs.length > 0 ? goRTs.reduce((a, b) => a + b, 0) / goRTs.length : 0;

      // RT variability (IIV metric)
      let rtVariability = 0;
      if (goRTs.length > 1) {
        const mean = avgGoRT;
        const sqDiffs = goRTs.map(rt => Math.pow(rt - mean, 2));
        rtVariability = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / goRTs.length);
      }

      // RTCV (Coefficient of Variation)
      const rtcv = avgGoRT > 0 ? (rtVariability / avgGoRT) * 100 : 0;

      onComplete([
        { metric_name: 'false_alarm_rate', metric_value: Math.round(faRate * 100) / 100 },
        { metric_name: 'go_accuracy', metric_value: Math.round(goAccuracy * 100) / 100 },
        { metric_name: 'nogo_accuracy', metric_value: Math.round(nogoAccuracy * 100) / 100 },
        { metric_name: 'go_reaction_time_avg', metric_value: Math.round(avgGoRT) },
        { metric_name: 'reaction_time_variability', metric_value: Math.round(rtVariability) },
        { metric_name: 'omission_errors', metric_value: goMisses },
        { metric_name: 'commission_errors', metric_value: falseAlarms },
        { metric_name: 'rtcv', metric_value: Math.round(rtcv * 100) / 100 },
      ]);
    }
  }, [currentIndex, totalTrials, phase]);

  const handleResponse = useCallback(() => {
    if (!showingStimulus || responded.current || (phase !== 'running' && phase !== 'practice')) return;
    responded.current = true;
    const rt = Date.now() - stimulusStartTime;

    setResponses(prev => ({ ...prev, [currentIndex]: { responded: true, rt } }));

    // During practice: full feedback. During real: only show false alarm feedback
    if (phase === 'practice') {
      setFeedback(trials[currentIndex]?.isGo ? 'correct' : 'false_alarm');
    } else {
      // Real trials: only flag commission errors (false alarms) — no positive feedback to avoid interrupting flow
      if (!trials[currentIndex]?.isGo) {
        setFeedback('false_alarm');
      }
    }
  }, [showingStimulus, stimulusStartTime, currentIndex, phase, trials]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); handleResponse(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleResponse]);

  const activeTrialCount = phase === 'practice' ? practiceTrialCount : totalTrials;
  const progress = activeTrialCount > 0 ? (currentIndex / activeTrialCount) * 100 : 0;
  const currentTrial = trials[currentIndex];

  // Instructions screen
  if (phase === 'instructions') {
    return (
      <div className="task-arena gonogo-task">
        <div className="instructions-screen">
          <h2>Go / No-Go Task</h2>
          <div className="instructions-content" style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
            <p><strong>How to play:</strong></p>
            <ul style={{ lineHeight: '2em' }}>
              <li>You will see symbols appear on screen one at a time.</li>
              <li>When you see {goStim} (green) — <strong>Press SPACE or tap</strong> as fast as you can!</li>
              <li>When you see {nogoStim} (red) — <strong>Do NOT press anything</strong>. Hold still!</li>
              <li>Be quick but careful. The green circle will appear more often.</li>
            </ul>
            <p style={{ marginTop: '1em', color: '#666' }}>
              You'll get {practiceTrialCount} practice trials first, then {totalTrials} real trials.
            </p>
          </div>
          <button className="btn btn-primary" onClick={startPractice} style={{ marginTop: '1.5em', fontSize: '1.1em' }}>
            Start Practice
          </button>
        </div>
      </div>
    );
  }

  // Practice done screen
  if (phase === 'practice_done') {
    const pResult = practiceResults[0];
    const pAccuracy = pResult ? Math.round((pResult.correct / pResult.total) * 100) : 0;
    return (
      <div className="task-arena gonogo-task">
        <div className="instructions-screen">
          <h2>Practice Complete!</h2>
          <p style={{ fontSize: '1.2em' }}>
            You got <strong>{pResult?.correct}/{pResult?.total}</strong> correct ({pAccuracy}%)
          </p>
          <div style={{ margin: '1em 0', padding: '1em', background: '#f0f8ff', borderRadius: 8 }}>
            <p>Remember:</p>
            <p>{goStim} = Press SPACE (Go!)</p>
            <p>{nogoStim} = Do NOT press (Stop!)</p>
          </div>
          <button className="btn btn-primary" onClick={startReal} style={{ fontSize: '1.1em' }}>
            Start Real Task ({totalTrials} trials)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-arena gonogo-task">
      <div className="task-level-badge">
        {phase === 'practice' ? 'PRACTICE' : `Go:No-Go ${Math.round(goRatio * 100)}:${Math.round((1 - goRatio) * 100)}`}
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">{Math.min(currentIndex + 1, activeTrialCount)} / {activeTrialCount}</div>

      <div className="stimulus-area" onClick={handleResponse}>
        {showingStimulus && currentTrial && (
          <div className={`gonogo-stimulus ${currentTrial.isGo ? 'go' : 'nogo'}`}>
            {currentTrial.isGo ? goStim : nogoStim}
          </div>
        )}
        {!showingStimulus && (phase === 'running' || phase === 'practice') && !feedback && (
          <div className="fixation-cross">+</div>
        )}
        {feedback === 'correct' && <div className="feedback-icon correct">✓</div>}
        {feedback === 'correct_reject' && <div className="feedback-icon correct">✓ Good hold!</div>}
        {feedback === 'false_alarm' && <div className="feedback-icon wrong">✗ Don't press for {nogoStim}!</div>}
        {feedback === 'miss' && <div className="feedback-icon miss">Miss! Press for {goStim}</div>}
      </div>

      <p className="task-hint">
        Press SPACE for {goStim} (Go) — Do NOT press for {nogoStim} (No-Go)
      </p>
    </div>
  );
}

export default GoNoGoTask;
