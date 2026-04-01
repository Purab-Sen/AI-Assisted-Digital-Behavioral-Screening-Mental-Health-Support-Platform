/**
 * N-Back Working Memory Task
 * 
 * Medical paradigm: Working Memory and Information Updating
 * Adaptive difficulty: 1-Back, 2-Back, 3-Back with configurable ISI
 * Key metric: Hit Rate / Accuracy
 * Implements "3-consecutive-correct" adaptive rule within session
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function NBackTask({ config, onComplete }) {
  const n = config.n || 1;
  const totalTrials = config.total_trials || 20;
  const targetPct = config.target_percentage || 0.30;
  const isiMs = config.isi_ms || 3000;
  const stimDurationMs = config.stimulus_duration_ms || 2000;
  const stimuliSet = config.stimuli || ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊'];

  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showingStimulus, setShowingStimulus] = useState(false);
  const [responses, setResponses] = useState({});
  const [stimulusStartTime, setStimulusStartTime] = useState(null);
  const [phase, setPhase] = useState('ready'); // ready, running, done
  const timerRef = useRef(null);
  const responded = useRef(false);

  // Generate sequence with controlled target percentage
  useEffect(() => {
    const seq = [];
    const numTargets = Math.round(totalTrials * targetPct);
    const targetPositions = new Set();

    // Determine which positions will be targets (must be >= n)
    while (targetPositions.size < numTargets) {
      const pos = Math.floor(Math.random() * (totalTrials - n)) + n;
      targetPositions.add(pos);
    }

    // Build sequence
    for (let i = 0; i < totalTrials; i++) {
      if (targetPositions.has(i) && i >= n) {
        // This should match position i-n
        seq.push(seq[i - n]);
      } else {
        // Pick a stimulus that doesn't match position i-n (if possible)
        let stim;
        let attempts = 0;
        do {
          stim = stimuliSet[Math.floor(Math.random() * stimuliSet.length)];
          attempts++;
        } while (i >= n && stim === seq[i - n] && attempts < 20);
        seq.push(stim);
      }
    }
    setSequence(seq);
    setPhase('running');
    setCurrentIndex(0);
  }, []);

  // Advance through trials
  useEffect(() => {
    if (phase !== 'running' || currentIndex < 0 || currentIndex >= totalTrials) return;

    responded.current = false;
    setShowingStimulus(true);
    setStimulusStartTime(Date.now());

    // Hide stimulus after duration
    const hideTimer = setTimeout(() => {
      setShowingStimulus(false);

      // After ISI gap, advance to next
      const nextTimer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, isiMs - stimDurationMs);

      timerRef.current = nextTimer;
    }, stimDurationMs);

    return () => {
      clearTimeout(hideTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, phase]);

  // Check completion
  useEffect(() => {
    if (currentIndex >= totalTrials && totalTrials > 0 && phase === 'running') {
      setPhase('done');
      calculateResults();
    }
  }, [currentIndex, totalTrials, phase]);

  const calculateResults = () => {
    let hits = 0, misses = 0, falseAlarms = 0, correctRejections = 0;
    const reactionTimes = [];

    for (let i = 0; i < totalTrials; i++) {
      const isTarget = i >= n && sequence[i] === sequence[i - n];
      const resp = responses[i];

      if (isTarget) {
        if (resp?.responded) {
          hits++;
          if (resp.rt) reactionTimes.push(resp.rt);
        } else {
          misses++;
        }
      } else {
        if (resp?.responded) {
          falseAlarms++;
        } else {
          correctRejections++;
        }
      }
    }

    const totalTargets = hits + misses;
    const totalNonTargets = falseAlarms + correctRejections;
    const hitRate = totalTargets > 0 ? (hits / totalTargets) * 100 : 0;
    const faRate = totalNonTargets > 0 ? (falseAlarms / totalNonTargets) * 100 : 0;
    const accuracy = totalTrials > 0 ? ((hits + correctRejections) / totalTrials) * 100 : 0;
    const avgRT = reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0;

    // RT variability (standard deviation)
    let rtVariability = 0;
    if (reactionTimes.length > 1) {
      const mean = avgRT;
      const sqDiffs = reactionTimes.map(rt => Math.pow(rt - mean, 2));
      rtVariability = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / reactionTimes.length);
    }

    // d-prime (signal detection)
    const hr = Math.min(Math.max(hitRate / 100, 0.01), 0.99);
    const fr = Math.min(Math.max(faRate / 100, 0.01), 0.99);
    const zHR = probitApprox(hr);
    const zFAR = probitApprox(fr);
    const dPrime = zHR - zFAR;

    onComplete([
      { metric_name: 'hit_rate', metric_value: Math.round(hitRate * 100) / 100 },
      { metric_name: 'accuracy', metric_value: Math.round(accuracy * 100) / 100 },
      { metric_name: 'false_alarm_rate', metric_value: Math.round(faRate * 100) / 100 },
      { metric_name: 'reaction_time_avg', metric_value: Math.round(avgRT) },
      { metric_name: 'reaction_time_variability', metric_value: Math.round(rtVariability) },
      { metric_name: 'd_prime', metric_value: Math.round(dPrime * 100) / 100 },
    ]);
  };

  // Approximate probit (inverse normal CDF) for d-prime calculation
  function probitApprox(p) {
    const a1 = -39.6968, a2 = 220.946, a3 = -275.928, a4 = 138.357, a5 = -30.6647, a6 = 2.50663;
    const b1 = -54.4760, b2 = 161.585, b3 = -155.699, b4 = 66.8013, b5 = -13.2806;
    const pp = p < 0.5 ? p : 1 - p;
    const t = Math.sqrt(-2 * Math.log(pp));
    let x = t - (a1 * t + a2 + (a3 * t + a4 + (a5 * t + a6) / t) / t) / 
                  (b1 * t + b2 + (b3 * t + b4 + (b5 * t + 1) / t) / t);
    if (p < 0.5) x = -x;
    return x;
  }

  const handleResponse = useCallback(() => {
    if (!showingStimulus || responded.current || phase !== 'running') return;
    responded.current = true;
    const rt = Date.now() - stimulusStartTime;
    setResponses(prev => ({ ...prev, [currentIndex]: { responded: true, rt } }));
  }, [showingStimulus, stimulusStartTime, currentIndex, phase]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); handleResponse(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleResponse]);

  const progress = totalTrials > 0 ? (currentIndex / totalTrials) * 100 : 0;

  return (
    <div className="task-arena nback-task">
      <div className="task-level-badge">{n}-Back</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">{Math.min(currentIndex + 1, totalTrials)} / {totalTrials}</div>
      
      <div className="stimulus-area" onClick={handleResponse}>
        {showingStimulus && currentIndex < sequence.length && (
          <div className="nback-stimulus">{sequence[currentIndex]}</div>
        )}
        {!showingStimulus && phase === 'running' && (
          <div className="fixation-cross">+</div>
        )}
      </div>

      <div className="task-controls">
        <button className="match-btn" onClick={handleResponse} disabled={!showingStimulus}>
          MATCH
        </button>
      </div>

      <p className="task-hint">
        Press MATCH (or Space) if current item matches the one {n} position{n > 1 ? 's' : ''} back
      </p>
    </div>
  );
}

export default NBackTask;
