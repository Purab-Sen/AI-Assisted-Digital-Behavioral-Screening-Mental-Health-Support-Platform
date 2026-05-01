/**
 * Responding to Joint Attention (RJA) Task
 *
 * Medical paradigm: Joint Attention with ABA Prompt Hierarchy
 * Systematic prompt fading: voice+point+head → point+head → head → gaze
 * Key metric: Accuracy and response latency
 *
 * Direction logic:
 *   - Target is placed at one of 8 compass positions around the arena
 *   - Character cues (pointing hand, head-turn arrow, gaze) all match the
 *     compass direction of the correct target
 *   - User taps the item they believe the character is indicating
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── 30+ emojis per pool ─── */
const TARGETS = {
  enticing: [
    '🌟','✨','🎆','🎪','🎠','🎡','🎨','🎯','🎁','🎀',
    '🎈','🎉','🎊','💎','👑','🏆','🎵','🎶','🦄','🌈',
    '🎸','🎺','🎹','🧸','🪅','🎳','🎲','🪀','🪁','🧲',
    '💫','🔮','🪩','🎭','🎤',
  ],
  familiar: [
    '📱','📚','🎒','⚽','🧸','🎮','🖍️','🔑','🎵','🧩',
    '🖊️','📔','🏀','🎾','🥎','🏈','🏐','🎿','🛹','🚲',
    '🧢','👟','🎧','📷','🕶️','⌚','🎂','🍕','🍎','🧃',
    '🪭','🎠','🧊','🎯','🪄',
  ],
  subtle: [
    '🔵','🟤','⬛','📎','🪨','🧱','🪵','📌','🔩','🪡',
    '🔘','⚪','🔲','🔳','⬜','🟫','🟠','🟡','🟢','🟣',
    '📍','🧷','🔧','🔨','🪛','🪜','🧰','🗜️','⚙️','🔗',
    '🪝','🧲','📏','📐','✂️',
  ],
};

const DISTRACTORS = [
  '🌿','☁️','🏠','⭐','🌸','🍃','🪨','📦','🌊','🌙',
  '🍂','🌾','🪶','🧊','💨','🌫️','🧋','🫧','🪸','🪺',
  '🌵','🌴','🎋','🎍','🪹','🏔️','⛰️','🏜️','🏝️','🏕️',
  '🌅','🌄','🌃','🎑','🗿',
];

const CHARACTER = '🧑‍🏫';

/* ─── 8 compass positions ─── */
const POSITIONS = [
  { key: 'top',          style: { top: '5%',   left: '50%', transform: 'translateX(-50%)' } },
  { key: 'top-right',    style: { top: '8%',   right: '8%'  } },
  { key: 'right',        style: { top: '45%',  right: '5%'  } },
  { key: 'bottom-right', style: { bottom: '12%', right: '8%' } },
  { key: 'bottom',       style: { bottom: '8%',  left: '50%', transform: 'translateX(-50%)' } },
  { key: 'bottom-left',  style: { bottom: '12%', left: '8%' } },
  { key: 'left',         style: { top: '45%',  left: '5%'   } },
  { key: 'top-left',     style: { top: '8%',   left: '8%'   } },
];

/* Map compass key → directional emojis */
const DIR = {
  'top':          { arrow: '⬆️', point: '☝️', gaze: '👀', angle: -90 },
  'top-right':    { arrow: '↗️', point: '☝️', gaze: '👀', angle: -45 },
  'right':        { arrow: '➡️', point: '👉', gaze: '👀', angle: 0 },
  'bottom-right': { arrow: '↘️', point: '👇', gaze: '👀', angle: 45 },
  'bottom':       { arrow: '⬇️', point: '👇', gaze: '👀', angle: 90 },
  'bottom-left':  { arrow: '↙️', point: '👇', gaze: '👀', angle: 135 },
  'left':         { arrow: '⬅️', point: '👈', gaze: '👀', angle: 180 },
  'top-left':     { arrow: '↖️', point: '👈', gaze: '👀', angle: -135 },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────────────────────── */
function JointAttentionRJA({ config, onComplete }) {
  const promptType      = config.prompt_type         || 'full';
  const cues            = config.cues                || ['voice', 'point', 'head_turn'];
  const targetType      = config.target_type         || 'enticing';
  const totalTrials     = config.total_trials        || 15;
  const responseTimeout = config.response_timeout_ms || 8000;
  const numDistractors  = config.num_distractors     || 0;

  const [trials, setTrials]             = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase]               = useState('cue');
  const [responses, setResponses]       = useState([]);
  const [trialStartTime, setTrialStart] = useState(null);
  const [cueStep, setCueStep]           = useState(0);
  const toRef = useRef(null);
  const fbRef = useRef(null);

  /* ── Build trials ── */
  useEffect(() => {
    const tPool = TARGETS[targetType] || TARGETS.enticing;
    const usedTargetEmojis = new Set();
    const built = [];

    for (let i = 0; i < totalTrials; i++) {
      const slots  = shuffle(POSITIONS);
      const tSlot  = slots[0];
      const dSlots = slots.slice(1, 1 + Math.min(numDistractors, POSITIONS.length - 1));

      let tEmoji;
      do { tEmoji = pick(tPool); } while (usedTargetEmojis.has(tEmoji) && usedTargetEmojis.size < tPool.length);
      usedTargetEmojis.add(tEmoji);

      built.push({
        target:      tEmoji,
        targetKey:   tSlot.key,
        targetStyle: tSlot.style,
        distractors: dSlots.map(s => ({
          emoji: pick(DISTRACTORS),
          key:   s.key,
          style: s.style,
        })),
      });
    }
    setTrials(built);
  }, [totalTrials, targetType, numDistractors]);

  /* ── Cue sequence per trial ── */
  useEffect(() => {
    if (currentIndex >= trials.length || trials.length === 0) return;
    setCueStep(0);
    setPhase('cue');

    let t1, t2;
    if (cues.includes('voice')) {
      setCueStep(1);
      t1 = setTimeout(() => {
        setCueStep(2);
        t2 = setTimeout(() => { setPhase('respond'); setTrialStart(Date.now()); }, 2500);
      }, 3000);
    } else if (cues.includes('point') || cues.includes('head_turn')) {
      setCueStep(2);
      t1 = setTimeout(() => { setPhase('respond'); setTrialStart(Date.now()); }, 3000);
    } else {
      setCueStep(3);
      t1 = setTimeout(() => { setPhase('respond'); setTrialStart(Date.now()); }, 2500);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentIndex, trials.length, cues]);

  /* ── Response timeout ── */
  useEffect(() => {
    if (phase !== 'respond') return;
    toRef.current = setTimeout(() => record(null, false), responseTimeout);
    return () => clearTimeout(toRef.current);
  }, [phase, responseTimeout]);

  /* ── Completion ── */
  useEffect(() => {
    if (currentIndex >= trials.length && trials.length > 0 && phase !== 'done') {
      setPhase('done');
      let correct = 0;
      const lats = [];
      responses.forEach(r => { if (r.correct) correct++; if (r.latency) lats.push(r.latency); });

      const accuracy   = (correct / trials.length) * 100;
      const avgLatency = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;

      let indep = promptType === 'gaze_only' ? 100 : promptType === 'partial' ? 66 : 33;
      indep = indep * (accuracy / 100);

      onComplete([
        { metric_name: 'accuracy',                 metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'avg_response_latency',     metric_value: Math.round(avgLatency) },
        { metric_name: 'prompt_independence_score', metric_value: Math.round(indep * 100) / 100 },
      ]);
    }
  }, [currentIndex, trials.length, phase]);

  /* ── Record response (both correct & incorrect) ── */
  const record = useCallback((posKey, isTarget) => {
    if (phase !== 'respond') return;
    clearTimeout(toRef.current);

    const latency = trialStartTime ? Date.now() - trialStartTime : 0;
    setResponses(prev => [...prev, { correct: isTarget, latency: isTarget ? latency : null, position: posKey }]);
    setPhase('feedback');

    fbRef.current = setTimeout(() => setCurrentIndex(prev => prev + 1), 1400);
  }, [phase, trialStartTime]);

  useEffect(() => () => clearTimeout(fbRef.current), []);

  /* ── Render helpers ── */
  const dir      = DIR[trials[currentIndex]?.targetKey] || DIR['right'];
  const progress = trials.length ? (currentIndex / trials.length) * 100 : 0;
  const cur      = trials[currentIndex];
  const lastResp = responses[responses.length - 1];

  return (
    <div className="task-arena ja-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">{Math.min(currentIndex + 1, trials.length)} / {trials.length}</div>

      {/* ── Arena ── */}
      <div className="ja-scene" style={{ position: 'relative', minHeight: 360, margin: '0 auto', maxWidth: 520 }}>

        {/* Character centre */}
        <div style={{
          position: 'absolute', top: '34%', left: '50%', transform: 'translate(-50%,-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ fontSize: 80, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.18))' }}>{CHARACTER}</span>
          </div>

          {/* Voice cue */}
          {phase === 'cue' && cueStep === 1 && (
            <div style={{
              marginTop: 8, padding: '10px 20px', background: '#fff', borderRadius: 16,
              boxShadow: '0 3px 14px rgba(0,0,0,.13)', fontSize: 16, fontWeight: 600,
              color: '#1e293b', animation: 'TPbounceIn .35s ease', whiteSpace: 'nowrap',
            }}>
              🗣️ &quot;Look over there!&quot;&nbsp;{dir.arrow}
            </div>
          )}

          {/* Point / head-turn */}
          {phase === 'cue' && cueStep === 2 && (
            <div style={{
              display: 'flex', gap: 14, marginTop: 10, fontSize: 44,
              animation: 'TPbounceIn .3s ease',
            }}>
              {cues.includes('point') && <span>{dir.point}</span>}
              {cues.includes('head_turn') && <span>{dir.arrow}</span>}
            </div>
          )}

          {/* Gaze only — show directional arrow as subtle cue */}
          {phase === 'cue' && cueStep === 3 && (
            <div style={{
              display: 'flex', gap: 8, marginTop: 8, fontSize: 44,
              animation: 'TPbounceIn .3s ease', opacity: 0.7,
            }}>
              {dir.arrow}
            </div>
          )}
        </div>

        {/* Targets + distractors */}
        {(phase === 'respond' || phase === 'feedback') && cur && (
          <>
            <button
              className={`ja-item ja-target ${phase === 'feedback' && lastResp?.correct ? 'correct-glow' : ''}`}
              style={{
                position: 'absolute', ...cur.targetStyle, fontSize: 52,
                background: 'none', border: 'none', cursor: phase === 'respond' ? 'pointer' : 'default',
                transition: 'transform .15s, filter .2s',
                filter: phase === 'feedback' && lastResp?.correct ? 'drop-shadow(0 0 12px #22c55e)' : 'none',
              }}
              onClick={() => record(cur.targetKey, true)}
              disabled={phase === 'feedback'}
              aria-label="Target"
            >
              {cur.target}
            </button>

            {cur.distractors.map((d, i) => (
              <button
                key={i}
                className="ja-item ja-distractor"
                style={{
                  position: 'absolute', ...d.style, fontSize: 46,
                  background: 'none', border: 'none', cursor: phase === 'respond' ? 'pointer' : 'default',
                  opacity: 0.82, transition: 'transform .15s',
                }}
                onClick={() => record(d.key, false)}
                disabled={phase === 'feedback'}
                aria-label="Distractor"
              >
                {d.emoji}
              </button>
            ))}
          </>
        )}

        {/* Feedback banner */}
        {phase === 'feedback' && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            fontSize: 22, fontWeight: 700, padding: '12px 28px', borderRadius: 16, zIndex: 20,
            background: lastResp?.correct
              ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#fee2e2,#fecaca)',
            color: lastResp?.correct ? '#065f46' : '#991b1b',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)', animation: 'TPbounceIn .3s ease',
          }}>
            {lastResp?.correct ? '✅ Correct!' : '❌ Not quite — follow the cue!'}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 16, marginTop: 12, color: '#64748b', fontWeight: 500 }}>
        {phase === 'cue' && '👁️ Watch the guide carefully...'}
        {phase === 'respond' && '👆 Tap the object the guide is pointing to!'}
      </p>
    </div>
  );
}

export default JointAttentionRJA;