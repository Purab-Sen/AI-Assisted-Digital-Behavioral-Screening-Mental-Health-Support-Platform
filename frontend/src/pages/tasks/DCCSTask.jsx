/**
 * Dimensional Change Card Sort (DCCS) Task
 * 
 * Medical paradigm: Cognitive Flexibility and Set Shifting
 * Gold-standard assessment: switch between matching by COLOR and SHAPE
 * Key metric: Switch Cost (Reaction Time difference)
 * Tracks: Perseverative errors, switch vs non-switch accuracy
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const SHAPE_PATHS = {
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z',
  circle: null, // use CSS border-radius
  diamond: 'M12 2L22 12L12 22L2 12Z',
  square: 'M4 4H20V20H4Z',
  triangle: 'M12 2L22 20H2Z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  cross: 'M8 2h8v6h6v8h-6v6H8v-6H2v-8h6V2z',
};

function DCCSTask({ config, onComplete }) {
  const mode = config.mode || 'blocked';
  const totalTrials = config.total_trials || 24;
  const responseTimeout = config.response_timeout_ms || 5000;
  const shapes = config.shapes || ['star', 'circle', 'triangle', 'heart'];
  const colors = config.colors || ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

  const [trials, setTrials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRule, setCurrentRule] = useState('shape'); // 'shape' or 'color'
  const [responses, setResponses] = useState([]);
  const [trialStartTime, setTrialStartTime] = useState(null);
  const [phase, setPhase] = useState('generating');
  const [showRuleChange, setShowRuleChange] = useState(false);
  const [targetCards, setTargetCards] = useState([]);
  const timeoutRef = useRef(null);

  // Generate trials
  useEffect(() => {
    const t = [];
    // 3 target cards: each has a unique shape + unique color
    const targets = [
      { shape: shapes[0], color: colors[0] },
      { shape: shapes[1], color: colors[1] },
      { shape: shapes[2] || shapes[0], color: colors[2] || colors[0] },
    ];
    setTargetCards(targets);

    let rule = 'shape';
    let trialsSinceSwitch = 0;
    const numTargets = targets.length;

    // Helper: make a card that matches one target by rule but NOT by the other dimension
    const makeCard = (correctTarget, rule) => {
      const card = {};
      if (rule === 'shape') {
        card.shape = targets[correctTarget].shape;
        // Pick a color from a DIFFERENT target to create conflict
        const otherTargets = targets.filter((_, idx) => idx !== correctTarget);
        card.color = otherTargets[Math.floor(Math.random() * otherTargets.length)].color;
      } else {
        card.color = targets[correctTarget].color;
        const otherTargets = targets.filter((_, idx) => idx !== correctTarget);
        card.shape = otherTargets[Math.floor(Math.random() * otherTargets.length)].shape;
      }
      return card;
    };

    if (mode === 'blocked') {
      const half = Math.floor(totalTrials / 2);
      for (let i = 0; i < totalTrials; i++) {
        rule = i < half ? 'shape' : 'color';
        const isSwitch = i === half;
        const correctTarget = Math.floor(Math.random() * numTargets);
        const card = makeCard(correctTarget, rule);
        t.push({ ...card, rule, isSwitch, correctTarget });
      }
    } else if (mode === 'alternating') {
      const blockSize = config.trials_per_block || 5;
      let blockCount = 0;
      for (let i = 0; i < totalTrials; i++) {
        if (i > 0 && i % blockSize === 0) {
          blockCount++;
          rule = blockCount % 2 === 0 ? 'shape' : 'color';
        }
        const isSwitch = i > 0 && i % blockSize === 0;
        const correctTarget = Math.floor(Math.random() * numTargets);
        const card = makeCard(correctTarget, rule);
        t.push({ ...card, rule, isSwitch, correctTarget });
      }
    } else {
      // random_switch
      const minBefore = config.min_before_switch || 1;
      const maxBefore = config.max_before_switch || 3;
      let countdown = Math.floor(Math.random() * (maxBefore - minBefore + 1)) + minBefore;
      for (let i = 0; i < totalTrials; i++) {
        const isSwitch = i > 0 && countdown <= 0;
        if (isSwitch) {
          rule = rule === 'shape' ? 'color' : 'shape';
          countdown = Math.floor(Math.random() * (maxBefore - minBefore + 1)) + minBefore;
        }
        countdown--;
        const correctTarget = Math.floor(Math.random() * numTargets);
        const card = makeCard(correctTarget, rule);
        t.push({ ...card, rule, isSwitch, correctTarget });
      }
    }

    setTrials(t);
    setCurrentRule(t[0]?.rule || 'shape');
    setPhase('playing');
    setTrialStartTime(Date.now());
  }, []);

  // Timeout handler
  useEffect(() => {
    if (phase !== 'playing' || currentIndex >= trials.length) return;

    timeoutRef.current = setTimeout(() => {
      // Timeout = incorrect
      handleChoice(-1);
    }, responseTimeout);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, phase, trials.length]);

  // Completion
  useEffect(() => {
    if (currentIndex >= totalTrials && totalTrials > 0 && phase === 'playing') {
      setPhase('done');

      let switchRTs = [], nonSwitchRTs = [];
      let switchCorrect = 0, switchTotal = 0;
      let nonSwitchCorrect = 0, nonSwitchTotal = 0;
      let perseverativeErrors = 0;
      let totalCorrect = 0;

      responses.forEach((resp, i) => {
        const trial = trials[i];
        if (!trial) return;

        if (resp.correct) totalCorrect++;

        if (trial.isSwitch) {
          switchTotal++;
          if (resp.correct) switchCorrect++;
          if (resp.rt) switchRTs.push(resp.rt);
          // Perseverative error: responded according to previous rule
          if (!resp.correct && resp.chosenTarget >= 0) {
            perseverativeErrors++;
          }
        } else {
          nonSwitchTotal++;
          if (resp.correct) nonSwitchCorrect++;
          if (resp.rt) nonSwitchRTs.push(resp.rt);
        }
      });

      const avgSwitchRT = switchRTs.length > 0 ? switchRTs.reduce((a, b) => a + b, 0) / switchRTs.length : 0;
      const avgNonSwitchRT = nonSwitchRTs.length > 0 ? nonSwitchRTs.reduce((a, b) => a + b, 0) / nonSwitchRTs.length : 0;
      const switchCost = avgSwitchRT - avgNonSwitchRT;
      const accuracy = totalTrials > 0 ? (totalCorrect / totalTrials) * 100 : 0;
      const switchAcc = switchTotal > 0 ? (switchCorrect / switchTotal) * 100 : 0;
      const nonSwitchAcc = nonSwitchTotal > 0 ? (nonSwitchCorrect / nonSwitchTotal) * 100 : 0;

      onComplete([
        { metric_name: 'accuracy', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'switch_cost_rt', metric_value: Math.round(switchCost) },
        { metric_name: 'switch_accuracy', metric_value: Math.round(switchAcc * 100) / 100 },
        { metric_name: 'non_switch_accuracy', metric_value: Math.round(nonSwitchAcc * 100) / 100 },
        { metric_name: 'avg_reaction_time', metric_value: Math.round((avgSwitchRT + avgNonSwitchRT) / 2) },
        { metric_name: 'perseverative_errors', metric_value: perseverativeErrors },
      ]);
    }
  }, [currentIndex, totalTrials, phase]);

  const handleChoice = useCallback((chosenTarget) => {
    if (phase !== 'playing' || currentIndex >= trials.length) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trial = trials[currentIndex];
    const rt = Date.now() - trialStartTime;
    const correct = chosenTarget === trial.correctTarget;

    setResponses(prev => [...prev, { chosenTarget, correct, rt }]);

    // Check if next trial has rule change
    const nextTrial = trials[currentIndex + 1];
    if (nextTrial && nextTrial.isSwitch) {
      setShowRuleChange(true);
      setTimeout(() => {
        setShowRuleChange(false);
        setCurrentRule(nextTrial.rule);
        setCurrentIndex(prev => prev + 1);
        setTrialStartTime(Date.now());
      }, 1200);
    } else {
      if (nextTrial) setCurrentRule(nextTrial.rule);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setTrialStartTime(Date.now());
      }, 500);
    }
  }, [phase, currentIndex, trials, trialStartTime]);

  const renderShape = (shape, color, size = 60) => {
    if (shape === 'circle') {
      return (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          backgroundColor: color, display: 'inline-block'
        }} />
      );
    }
    const path = SHAPE_PATHS[shape] || SHAPE_PATHS.square;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d={path} fill={color} />
      </svg>
    );
  };

  const progress = totalTrials > 0 ? (currentIndex / totalTrials) * 100 : 0;
  const currentTrial = trials[currentIndex];

  if (phase === 'generating') return <div className="task-arena">Generating trials...</div>;

  return (
    <div className="task-arena dccs-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      {showRuleChange && (
        <div className="rule-change-banner">
          Rule Change! Now sort by: {trials[currentIndex + 1]?.rule?.toUpperCase()}
        </div>
      )}

      <div className="dccs-rule-display">
        Sort by: <strong>{currentRule.toUpperCase()}</strong>
      </div>

      <div className="trial-counter">{Math.min(currentIndex + 1, totalTrials)} / {totalTrials}</div>

      {currentTrial && !showRuleChange && (
        <>
          <div className="dccs-test-card">
            {renderShape(currentTrial.shape, currentTrial.color, 80)}
            <div className="card-label">Sort this card</div>
          </div>

          <div className="dccs-targets">
            {targetCards.map((target, idx) => (
              <button
                key={idx}
                className="dccs-target-card"
                onClick={() => handleChoice(idx)}
              >
                {renderShape(target.shape, target.color, 50)}
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 600, textTransform: 'capitalize' }}>
                  {target.shape}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="task-hint">
        Click the target card that matches by {currentRule.toUpperCase()}
      </p>
    </div>
  );
}

export default DCCSTask;
