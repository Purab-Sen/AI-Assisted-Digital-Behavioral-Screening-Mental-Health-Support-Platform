/**
 * Go/No-Go Inhibitory Control Task
 * 
 * Medical paradigm: Inhibitory Control and Interference Suppression
 * High Go:No-Go ratio creates prepotent response that must be inhibited
 * Key metric: False Alarm (FA) Rate
 * Tracks: Commission errors, omission errors, RT variability (IIV)
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function GoNoGoTask({ config, onComplete }) {
  const goRatio = config.go_ratio || 0.5;
  const stimDurationMs = config.stimulus_duration_ms || 800;
  const isiMs = config.isi_ms || 1500;
  const totalTrials = config.total_trials || 40;
  const goStim = config.go_stimulus || '🟢';
  const nogoStim = config.nogo_stimulus || '🔴';

  const [trials, setTrials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showingStimulus, setShowingStimulus] = useState(false);
  const [responses, setResponses] = useState({});
  const [stimulusStartTime, setStimulusStartTime] = useState(null);
  const [phase, setPhase] = useState('ready');
  const [feedback, setFeedback] = useState(null);
  const responded = useRef(false);
  const timerRef = useRef(null);

  // Generate trial sequence
  useEffect(() => {
    const t = [];
    for (let i = 0; i < totalTrials; i++) {
      t.push({ isGo: Math.random() < goRatio });
    }
    setTrials(t);
    setPhase('running');
    setCurrentIndex(0);
  }, []);

  // Run each trial
  useEffect(() => {
    if (phase !== 'running' || currentIndex < 0 || currentIndex >= totalTrials) return;

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
        // Show feedback for misses on Go trials
        if (trials[currentIndex]?.isGo) {
          setFeedback('miss');
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

  // Completion
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
    if (!showingStimulus || responded.current || phase !== 'running') return;
    responded.current = true;
    const rt = Date.now() - stimulusStartTime;

    setResponses(prev => ({ ...prev, [currentIndex]: { responded: true, rt } }));

    // Immediate feedback
    if (trials[currentIndex]?.isGo) {
      setFeedback('correct');
    } else {
      setFeedback('false_alarm');
    }
  }, [showingStimulus, stimulusStartTime, currentIndex, phase, trials]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); handleResponse(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleResponse]);

  const progress = totalTrials > 0 ? (currentIndex / totalTrials) * 100 : 0;
  const currentTrial = trials[currentIndex];

  return (
    <div className="task-arena gonogo-task">
      <div className="task-level-badge">
        Go:No-Go {Math.round(goRatio * 100)}:{Math.round((1 - goRatio) * 100)}
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">{Math.min(currentIndex + 1, totalTrials)} / {totalTrials}</div>

      <div className="stimulus-area" onClick={handleResponse}>
        {showingStimulus && currentTrial && (
          <div className={`gonogo-stimulus ${currentTrial.isGo ? 'go' : 'nogo'}`}>
            {currentTrial.isGo ? goStim : nogoStim}
          </div>
        )}
        {!showingStimulus && phase === 'running' && !feedback && (
          <div className="fixation-cross">+</div>
        )}
        {feedback === 'correct' && <div className="feedback-icon correct">✓</div>}
        {feedback === 'false_alarm' && <div className="feedback-icon wrong">✗</div>}
        {feedback === 'miss' && <div className="feedback-icon miss">Miss!</div>}
      </div>

      <p className="task-hint">
        Press SPACE for {goStim} (Go) — Do NOT press for {nogoStim} (No-Go)
      </p>
    </div>
  );
}

export default GoNoGoTask;
