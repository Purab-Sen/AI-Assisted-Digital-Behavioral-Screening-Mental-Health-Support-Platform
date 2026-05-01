/**
 * Auditory Processing Task
 * 
 * Medical paradigm: Tone frequency discrimination with Adaptive Staircase
 * 3-down/1-up staircase converging to 79.4% detection threshold
 * Key metric: Frequency discrimination threshold (Hz)
 * Uses Web Audio API for precise tone generation
 */
import { useState, useEffect, useCallback, useRef } from 'react';

function AuditoryTask({ config, onComplete }) {
  const baseFreq = config.base_frequency_hz || 440;
  const initialDiff = config.initial_difference_hz || 100;
  const minDiff = config.min_difference_hz || 10;
  const stepDown = config.step_down_hz || 10;
  const stepUp = config.step_up_hz || 20;
  const toneDuration = config.tone_duration_ms || 500;
  const gapMs = config.gap_ms || 500;
  const totalTrials = config.total_trials || 30;

  const catchDiff = config.catch_difference_hz || 200; // Very obvious difference for catch trials
  const catchInterval = 10; // Insert a catch trial every N trials

  const [currentDiff, setCurrentDiff] = useState(initialDiff);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [higherFirst, setHigherFirst] = useState(false);
  const [responses, setResponses] = useState([]);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [reversals, setReversals] = useState([]);
  const [lastDirection, setLastDirection] = useState(null);
  const [trialStartTime, setTrialStartTime] = useState(null);
  const [isCatchTrial, setIsCatchTrial] = useState(false);
  const [catchResults, setCatchResults] = useState({ correct: 0, total: 0 });
  const audioCtxRef = useRef(null);

  // Initialize audio context on first interaction
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((frequency, duration) => {
    const ctx = initAudio();
    if (!ctx) return Promise.resolve();

    return new Promise(resolve => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      
      // Smooth envelope to avoid clicks
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + duration / 1000 - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);

      setTimeout(resolve, duration);
    });
  }, []);

  const startTrial = useCallback(async () => {
    // Insert catch trial every catchInterval trials (except first)
    const isCatch = trialIndex > 0 && trialIndex % catchInterval === 0;
    setIsCatchTrial(isCatch);
    const activeDiff = isCatch ? catchDiff : currentDiff;

    const isHigherFirst = Math.random() < 0.5;
    setHigherFirst(isHigherFirst);

    const freq1 = isHigherFirst ? baseFreq + activeDiff : baseFreq;
    const freq2 = isHigherFirst ? baseFreq : baseFreq + activeDiff;

    setPhase('tone1');
    await playTone(freq1, toneDuration);

    setPhase('gap');
    await new Promise(resolve => setTimeout(resolve, gapMs));

    setPhase('tone2');
    await playTone(freq2, toneDuration);

    setPhase('respond');
    setTrialStartTime(Date.now());
  }, [baseFreq, currentDiff, toneDuration, gapMs, playTone]);

  // Start first trial
  useEffect(() => {
    if (trialIndex === 0 && phase === 'ready') {
      // Need user interaction first for audio context
    }
  }, []);

  const handleStart = useCallback(() => {
    initAudio();
    startTrial();
  }, [startTrial]);

  // Completion
  useEffect(() => {
    if (trialIndex >= totalTrials && phase !== 'done') {
      setPhase('done');

      const lastReversals = reversals.slice(-6);
      const threshold = lastReversals.length > 0
        ? lastReversals.reduce((a, b) => a + b, 0) / lastReversals.length
        : currentDiff;

      const accuracy = responses.length > 0
        ? (responses.filter(r => r.correct).length / responses.length) * 100 : 0;
      const rts = responses.filter(r => r.rt).map(r => r.rt);
      const avgRT = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;

      onComplete([
        { metric_name: 'threshold_hz', metric_value: Math.round(threshold * 100) / 100 },
        { metric_name: 'accuracy', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'reversals', metric_value: reversals.length },
        { metric_name: 'avg_reaction_time', metric_value: Math.round(avgRT) },
        { metric_name: 'catch_trial_accuracy', metric_value: catchResults.total > 0 ? Math.round((catchResults.correct / catchResults.total) * 100) : 100 },
      ]);
    }
  }, [trialIndex, totalTrials, phase]);

  const handleResponse = useCallback((choseFirst) => {
    if (phase !== 'respond') return;

    const rt = Date.now() - trialStartTime;
    const correct = choseFirst === higherFirst;

    setResponses(prev => [...prev, { correct, rt, diff: currentDiff, isCatch: isCatchTrial }]);

    // Track catch trial performance separately
    if (isCatchTrial) {
      setCatchResults(prev => ({
        correct: prev.correct + (correct ? 1 : 0),
        total: prev.total + 1,
      }));
      // Don't adjust staircase for catch trials
      setPhase('feedback');
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
        startTrial();
      }, 1000);
      return;
    }

    if (correct) {
      const newConsec = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsec);

      if (newConsec >= 3) {
        const newDiff = Math.max(minDiff, currentDiff - stepDown);
        if (lastDirection === 'up') {
          setReversals(prev => [...prev, currentDiff]);
        }
        setLastDirection('down');
        setCurrentDiff(newDiff);
        setConsecutiveCorrect(0);
      }
    } else {
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
  }, [phase, higherFirst, consecutiveCorrect, currentDiff, minDiff, stepDown, stepUp, lastDirection, trialStartTime, startTrial]);

  // Cleanup audio context
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const progress = totalTrials > 0 ? (trialIndex / totalTrials) * 100 : 0;

  return (
    <div className="task-arena sensory-task auditory-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">{Math.min(trialIndex + 1, totalTrials)} / {totalTrials}</div>

      <div className="sensory-display">
        {phase === 'ready' && (
          <div className="audio-start">
            <p>Make sure your volume is at a comfortable level.</p>
            <p>You will hear two tones and must decide which is HIGHER in pitch.</p>
            <button className="btn btn-primary btn-large" onClick={handleStart}>
              Start Listening Task
            </button>
          </div>
        )}
        {phase === 'tone1' && (
          <div className="audio-playing">
            <div className="audio-icon playing">🔊</div>
            <p>Tone 1 playing...</p>
          </div>
        )}
        {phase === 'gap' && (
          <div className="audio-playing">
            <div className="audio-icon">🔇</div>
            <p>...</p>
          </div>
        )}
        {phase === 'tone2' && (
          <div className="audio-playing">
            <div className="audio-icon playing">🔊</div>
            <p>Tone 2 playing...</p>
          </div>
        )}
        {phase === 'respond' && (
          <div className="sensory-response">
            <p className="sensory-question">Which tone was HIGHER in pitch?</p>
            <div className="sensory-buttons">
              <button className="sensory-btn" onClick={() => handleResponse(true)}>
                First Tone
              </button>
              <button className="sensory-btn" onClick={() => handleResponse(false)}>
                Second Tone
              </button>
            </div>
          </div>
        )}
        {phase === 'feedback' && (
          <div className="sensory-feedback">
            {responses[responses.length - 1]?.correct ? '✅ Correct!' : '❌ Incorrect'}
          </div>
        )}
      </div>

      <div className="staircase-info">
        <span>Current difference: {Math.round(currentDiff)}Hz</span>
        <span>Reversals: {reversals.length}</span>
      </div>

      <p className="task-hint">Listen carefully to both tones before answering</p>
    </div>
  );
}

export default AuditoryTask;
