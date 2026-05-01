/**
 * Visual Recognition Memory Task  (Delayed Match-to-Sample paradigm)
 *
 * Clinical basis:
 *   • CANTAB DMS — Cambridge Cognition, Sahakian & Owen 1992
 *   • DMS-48 — Barbeau et al. 2004 (visual object recognition in MCI/ASD)
 *   • Penn CNP Recognition Memory — validated ASD/ADHD battery
 *
 * Task flow per round:
 *   1. ENCODE  — target letter(s) shown alone, large, for configurable time
 *   2. DELAY   — blank fixation cross (prevents sub-vocal rehearsal echo)
 *   3. PROBE   — sequential stream of letters, one at a time.
 *                User presses MATCH only when they see the memorised letter.
 *                NO visual hint of the target is shown during probe phase.
 *   4. Round summary (practice only) → next round
 *
 * Difficulty:
 *   Level 1 Easy   — 1 target, 4 rounds,  6 probes, 3 s encode
 *   Level 2 Medium — 1 target, 5 rounds, 10 probes, 2 s encode
 *   Level 3 Hard   — 2 targets, 6 rounds, 12 probes, 1.5 s encode
 *
 * Key ASD-relevant metrics:
 *   hit_rate, false_alarm_rate, d_prime, reaction_time_avg,
 *   reaction_time_variability (IIV), accuracy
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Stimulus pool ───────────────────────────────────────────────────────────
// 12 uppercase consonants on highly-distinct background colours.
// Two dimensions (letter + colour) ensure robust perceptual encoding,
// mirroring the CANTAB DMS stimulus design.
const STIMULI = [
  { id: 'A', label: 'A', bg: '#c0392b', text: '#fff' },
  { id: 'B', label: 'B', bg: '#2980b9', text: '#fff' },
  { id: 'C', label: 'C', bg: '#27ae60', text: '#fff' },
  { id: 'D', label: 'D', bg: '#f39c12', text: '#fff' },
  { id: 'F', label: 'F', bg: '#8e44ad', text: '#fff' },
  { id: 'G', label: 'G', bg: '#16a085', text: '#fff' },
  { id: 'H', label: 'H', bg: '#d35400', text: '#fff' },
  { id: 'J', label: 'J', bg: '#2c3e50', text: '#fff' },
  { id: 'K', label: 'K', bg: '#7f8c8d', text: '#fff' },
  { id: 'L', label: 'L', bg: '#1a5276', text: '#fff' },
  { id: 'M', label: 'M', bg: '#6c3483', text: '#fff' },
  { id: 'P', label: 'P', bg: '#1e8449', text: '#fff' },
];

// ─── Difficulty configs ──────────────────────────────────────────────────────
const DIFFICULTY = {
  1: { label: 'Easy',   numTargets: 1, numRounds: 4, probeCount: 6,  targetHits: 1, encodeDurationMs: 3000, delayDurationMs: 1000, probeDurationMs: 2000, probeGapMs: 600,  practiceRounds: 1 },
  2: { label: 'Medium', numTargets: 1, numRounds: 5, probeCount: 10, targetHits: 2, encodeDurationMs: 2000, delayDurationMs: 800,  probeDurationMs: 1500, probeGapMs: 500,  practiceRounds: 1 },
  3: { label: 'Hard',   numTargets: 2, numRounds: 6, probeCount: 12, targetHits: 2, encodeDurationMs: 1500, delayDurationMs: 600,  probeDurationMs: 1200, probeGapMs: 400,  practiceRounds: 1 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pickUnique = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

const buildRound = (diff) => {
  const targets = pickUnique(STIMULI, diff.numTargets);
  const targetIds = new Set(targets.map(t => t.id));
  const lures = STIMULI.filter(s => !targetIds.has(s.id));
  const targetSlots = Math.min(diff.numTargets * diff.targetHits, diff.probeCount - 1);
  const lureSlots = diff.probeCount - targetSlots;
  const raw = [];
  targets.forEach(t => { for (let h = 0; h < diff.targetHits; h++) raw.push({ stim: t, isTarget: true }); });
  for (let i = 0; i < lureSlots; i++) raw.push({ stim: lures[i % lures.length], isTarget: false });
  let probes;
  for (let a = 0; a < 10; a++) {
    probes = [...raw].sort(() => Math.random() - 0.5);
    if (!probes[0].isTarget) break;
  }
  return { targets, probes };
};

function probitApprox(p) {
  const a1=-39.6968,a2=220.946,a3=-275.928,a4=138.357,a5=-30.6647,a6=2.50663;
  const b1=-54.4760,b2=161.585,b3=-155.699,b4=66.8013,b5=-13.2806;
  const pp=p<0.5?p:1-p;
  const t=Math.sqrt(-2*Math.log(pp));
  let x=t-(a1*t+a2+(a3*t+a4+(a5*t+a6)/t)/t)/(b1*t+b2+(b3*t+b4+(b5*t+1)/t)/t);
  return p<0.5?-x:x;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const FixationCross = () => (
  <svg width="44" height="44" viewBox="0 0 44 44">
    <rect x="19" y="4" width="6" height="36" rx="3" fill="#94a3b8" />
    <rect x="4" y="19" width="36" height="6" rx="3" fill="#94a3b8" />
  </svg>
);

const StimulusCircle = ({ stim, size = 120, animKey }) => (
  <div
    key={animKey}
    style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: stim.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.5),
      fontWeight: 900,
      fontFamily: '"Arial Black","Helvetica Neue",sans-serif',
      color: stim.text,
      boxShadow: `0 8px 32px ${stim.bg}66, 0 2px 8px rgba(0,0,0,0.2)`,
      userSelect: 'none', flexShrink: 0,
      animation: 'stimPop 0.22s cubic-bezier(.34,1.56,.64,1) both',
    }}
  >
    {stim.label}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// Main Component — Delayed Match-to-Sample Recognition Memory
// ════════════════════════════════════════════════════════════════════════════
function NBackTask({ config, onComplete }) {
  const diffLevel = Math.min(Math.max(config.difficulty_level || 1, 1), 3);
  const diff = DIFFICULTY[diffLevel];

  const allRoundsRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [probeIndex, setProbeIndex] = useState(0);
  const [subPhase, setSubPhase] = useState('instructions');
  const [showingProbe, setShowingProbe] = useState(false);
  const [rHits, setRHits] = useState(0);
  const [rFAs, setRFAs] = useState(0);
  const [rMisses, setRMisses] = useState(0);
  const [rCRs, setRCRs] = useState(0);
  const [rRTs, setRRTs] = useState([]);
  const [probeStartTime, setProbeStartTime] = useState(null);
  const [lastProbeResult, setLastProbeResult] = useState(null);
  const [roundResults, setRoundResults] = useState([]);
  const respondedRef = useRef(false);
  const timerRef = useRef(null);
  const prevRoundRef = useRef(-1);
  const advanceProbeRef = useRef(null);

  const totalRounds = diff.practiceRounds + diff.numRounds;

  // Build all rounds once on mount
  useEffect(() => {
    const rounds = [];
    for (let i = 0; i < totalRounds; i++) rounds.push(buildRound(diff));
    allRoundsRef.current = rounds;
    setReady(true);
  }, []); // eslint-disable-line

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearTimer(), []);

  const isRoundPractice = roundIndex < diff.practiceRounds;
  const currentRound = allRoundsRef.current[roundIndex] || null;

  // Start the encode phase for a given round index
  const startEncode = useCallback((rIdx) => {
    clearTimer();
    setProbeIndex(0);
    setRHits(0); setRFAs(0); setRMisses(0); setRCRs(0);
    setRRTs([]); setLastProbeResult(null);
    setSubPhase('encode');
    timerRef.current = setTimeout(() => {
      setSubPhase('delay');
      timerRef.current = setTimeout(() => {
        if (advanceProbeRef.current) advanceProbeRef.current(0, rIdx);
      }, diff.delayDurationMs);
    }, diff.encodeDurationMs);
  }, [diff]); // eslint-disable-line

  // Advance probe stream
  const advanceProbe = useCallback((idx, rIdx) => {
    clearTimer();
    const round = allRoundsRef.current[rIdx];
    if (!round || idx >= round.probes.length) {
      setSubPhase('round_result');
      return;
    }
    respondedRef.current = false;
    setProbeIndex(idx);
    setShowingProbe(true);
    setProbeStartTime(Date.now());
    setLastProbeResult(null);
    setSubPhase('probe');

    timerRef.current = setTimeout(() => {
      setShowingProbe(false);
      if (!respondedRef.current) {
        const probe = allRoundsRef.current[rIdx].probes[idx];
        if (probe.isTarget) { setRMisses(m => m + 1); setLastProbeResult('miss'); }
        else { setRCRs(c => c + 1); }
      }
      setSubPhase('probe_gap');
      timerRef.current = setTimeout(() => {
        if (advanceProbeRef.current) advanceProbeRef.current(idx + 1, rIdx);
      }, diff.probeGapMs);
    }, diff.probeDurationMs);
  }, [diff]); // eslint-disable-line

  advanceProbeRef.current = advanceProbe;

  // Handle MATCH response
  const handleResponse = useCallback(() => {
    if (subPhase !== 'probe' || !showingProbe || respondedRef.current) return;
    respondedRef.current = true;
    const rt = Date.now() - probeStartTime;
    const probe = allRoundsRef.current[roundIndex]?.probes[probeIndex];
    if (!probe) return;
    if (probe.isTarget) {
      setRHits(h => h + 1);
      setRRTs(rts => [...rts, rt]);
      setLastProbeResult('hit');
    } else {
      setRFAs(fa => fa + 1);
      setLastProbeResult('false_alarm');
    }
  }, [subPhase, showingProbe, probeStartTime, roundIndex, probeIndex]);

  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space') { e.preventDefault(); handleResponse(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleResponse]);

  // Accumulate round result when phase flips to round_result
  useEffect(() => {
    if (subPhase !== 'round_result') return;
    setRoundResults(prev => [...prev, {
      hits: rHits, misses: rMisses, fas: rFAs, crs: rCRs, rts: rRTs,
      practice: isRoundPractice,
    }]);
  }, [subPhase]); // eslint-disable-line

  const advanceToNextRound = useCallback(() => {
    const next = roundIndex + 1;
    if (next >= totalRounds) { setSubPhase('done'); return; }
    setRoundIndex(next);
  }, [roundIndex, totalRounds]);

  // When roundIndex changes (not on first mount), start encode
  useEffect(() => {
    if (!ready || subPhase === 'instructions' || subPhase === 'done') return;
    if (roundIndex === prevRoundRef.current) return;
    prevRoundRef.current = roundIndex;
    startEncode(roundIndex);
  }, [roundIndex, ready]); // eslint-disable-line

  // Compute and emit final metrics when done
  useEffect(() => {
    if (subPhase !== 'done') return;
    const sc = roundResults.filter(r => !r.practice);
    let hits = 0, misses = 0, fas = 0, crs = 0;
    const allRTs = [];
    sc.forEach(r => { hits += r.hits; misses += r.misses; fas += r.fas; crs += r.crs; allRTs.push(...r.rts); });
    const tgt = hits + misses, non = fas + crs;
    const hitRate  = tgt > 0 ? hits / tgt : 0;
    const faRate   = non > 0 ? fas  / non : 0;
    const accuracy = (hits + crs) / Math.max(tgt + non, 1);
    const avgRT    = allRTs.length > 0 ? allRTs.reduce((a, b) => a + b, 0) / allRTs.length : 0;
    let rtSD = 0;
    if (allRTs.length > 1) {
      rtSD = Math.sqrt(allRTs.map(r => (r - avgRT) ** 2).reduce((a, b) => a + b, 0) / allRTs.length);
    }
    const hr = Math.min(Math.max(hitRate, 0.01), 0.99);
    const fr = Math.min(Math.max(faRate,  0.01), 0.99);
    const dPrime = probitApprox(hr) - probitApprox(fr);
    onComplete([
      { metric_name: 'hit_rate',                  metric_value: Math.round(hitRate  * 10000) / 100 },
      { metric_name: 'accuracy',                  metric_value: Math.round(accuracy * 10000) / 100 },
      { metric_name: 'false_alarm_rate',          metric_value: Math.round(faRate   * 10000) / 100 },
      { metric_name: 'reaction_time_avg',         metric_value: Math.round(avgRT) },
      { metric_name: 'reaction_time_variability', metric_value: Math.round(rtSD) },
      { metric_name: 'd_prime',                   metric_value: Math.round(dPrime * 100) / 100 },
    ]);
  }, [subPhase]); // eslint-disable-line

  // Shared card style helper
  const cardStyle = (active) => ({
    background: active ? 'linear-gradient(145deg,#eef2ff,#f0f9ff)' : '#f8fafc',
    border: active ? '3px solid #6366f1' : '2px dashed #e2e8f0',
    borderRadius: 24, padding: '28px 20px',
    minHeight: 200, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    boxShadow: active ? '0 0 0 6px rgba(99,102,241,0.1)' : 'none',
    transition: 'all 0.22s ease', cursor: active ? 'pointer' : 'default',
    marginBottom: 14,
  });

  // ── INSTRUCTIONS ──────────────────────────────────────────────────────────
  if (subPhase === 'instructions') {
    const exTarget = STIMULI[4]; // purple F
    const exLure   = STIMULI[1]; // blue B
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>🧠</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>Memory Match Test</h2>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>
            {diff.practiceRounds} practice round → {diff.numRounds} scored rounds · {diff.label}
          </p>
        </div>

        <div style={{ background: '#f8faff', borderRadius: 20, padding: '20px', border: '2px solid #e0e7ff', marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', margin: '0 0 14px 0' }}>How it works — 4 steps:</p>
          {[
            { num: '1', icon: '👀', title: 'A letter appears — memorise it',
              desc: `A large coloured letter is shown alone for ${diff.encodeDurationMs / 1000} seconds. Remember it!` },
            { num: '2', icon: '⏳', title: 'Brief blank pause',
              desc: 'A fixation cross appears. Keep the letter in your mind — no peeking.' },
            { num: '3', icon: '🔍', title: `${diff.probeCount} letters appear one at a time`,
              desc: 'Each letter flashes briefly on screen. The letter you memorised is NOT shown as a hint.' },
            { num: '4', icon: '✅', title: 'Tap YES only when it matches',
              desc: 'If the flashing letter is the same as what you memorised → tap YES or press Space. If different → do nothing.' },
          ].map(({ num, icon, title, desc }) => (
            <div key={num} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{num}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>{icon} {title}</div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.55 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual flow */}
        <div style={{ background: '#fff', borderRadius: 16, border: '2px dashed #c7d2fe', padding: '14px', marginBottom: 12, textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: 11, color: '#6366f1', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Example — tap YES on the last card</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <StimulusCircle stim={exTarget} size={54} />
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginTop: 4 }}>MEMORISE</div>
            </div>
            <span style={{ color: '#94a3b8', fontSize: 18 }}>→</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FixationCross /></div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 4 }}>PAUSE</div>
            </div>
            <span style={{ color: '#94a3b8', fontSize: 18 }}>→</span>
            <div style={{ textAlign: 'center' }}>
              <StimulusCircle stim={exLure} size={54} />
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>wait…</div>
            </div>
            <span style={{ color: '#94a3b8', fontSize: 18 }}>→</span>
            <div style={{ textAlign: 'center' }}>
              <StimulusCircle stim={exTarget} size={54} />
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginTop: 4 }}>TAP YES! ✅</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fefce8', borderRadius: 12, border: '1px solid #fde047', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#713f12', lineHeight: 1.55 }}>
          💡 You start with a practice round that shows feedback. Accuracy matters more than speed.
        </div>

        <button
          style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
          onClick={() => { prevRoundRef.current = 0; setRoundIndex(0); startEncode(0); }}
        >
          Start Practice →
        </button>
        <style>{`@keyframes stimPop { 0%{transform:scale(0.6);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (subPhase === 'done') {
    const sc = roundResults.filter(r => !r.practice);
    const tot = {
      h:  sc.reduce((a, r) => a + r.hits,   0),
      m:  sc.reduce((a, r) => a + r.misses, 0),
      fa: sc.reduce((a, r) => a + r.fas,    0),
      cr: sc.reduce((a, r) => a + r.crs,    0),
    };
    const hitPct = (tot.h + tot.m) > 0 ? Math.round(100 * tot.h / (tot.h + tot.m)) : 0;
    const faPct  = (tot.fa + tot.cr) > 0 ? Math.round(100 * tot.fa / (tot.fa + tot.cr)) : 0;
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center', padding: '0 16px' }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>All done!</h2>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 20 }}>Your results have been recorded.</p>
        <div style={{ background: '#f8faff', borderRadius: 16, border: '2px solid #e0e7ff', padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Correct Matches', value: `${hitPct}%`, color: '#10b981' },
            { label: 'False Alarms',    value: `${faPct}%`,  color: faPct > 25 ? '#ef4444' : '#f59e0b' },
            { label: 'Rounds Scored',   value: `${sc.length}`, color: '#6366f1' },
            { label: 'Difficulty',      value: diff.label,   color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <style>{`@keyframes stimPop { 0%{transform:scale(0.6);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  // Guard: rounds not built yet
  if (!currentRound) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>;
  }

  const { targets, probes } = currentRound;
  const progressPct = !isRoundPractice
    ? ((roundIndex - diff.practiceRounds) / diff.numRounds) * 100
    : 0;
  const probeActive = subPhase === 'probe' && showingProbe;

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', userSelect: 'none', padding: '0 12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          background: isRoundPractice
            ? 'linear-gradient(135deg,#f59e0b,#d97706)'
            : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700,
        }}>
          🧠 {isRoundPractice ? 'Practice Round' : `Round ${roundIndex - diff.practiceRounds + 1} of ${diff.numRounds}`}
        </span>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{diff.label}</span>
      </div>

      {/* Round progress bar */}
      {!isRoundPractice && (
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 99, width: `${progressPct}%`, transition: 'width 0.4s' }} />
        </div>
      )}

      {/* ── ENCODE phase ── */}
      {subPhase === 'encode' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(145deg,#fef9ff,#f5f0ff)', border: '3px solid #a78bfa', borderRadius: 24, padding: '32px 20px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7c3aed', marginBottom: 22 }}>
              👀 Memorise {targets.length > 1 ? 'these letters' : 'this letter'}
            </div>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              {targets.map((t, i) => (
                <div key={t.id} style={{ animation: `stimPop 0.25s ${i * 0.1}s cubic-bezier(.34,1.56,.64,1) both` }}>
                  <StimulusCircle stim={t} size={130} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>
              Keep {targets.length > 1 ? 'these' : 'this'} in your memory —{' '}
              <strong>no hints</strong> will be shown!
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            {diff.probeCount} letters will follow. Tap <strong>YES</strong> when you see the one you memorised.
          </div>
        </div>
      )}

      {/* ── DELAY phase ── */}
      {subPhase === 'delay' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <FixationCross />
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 16, fontWeight: 600 }}>
            Get ready…
          </div>
        </div>
      )}

      {/* ── PROBE phase ── */}
      {(subPhase === 'probe' || subPhase === 'probe_gap') && (
        <div style={{ textAlign: 'center' }}>

          {/* Probe progress pips */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            {probes.map((_, i) => (
              <div key={i} style={{
                width: 16, height: 6, borderRadius: 3,
                background: i < probeIndex
                  ? '#10b981'
                  : (i === probeIndex && probeActive ? '#6366f1' : '#e2e8f0'),
                transition: 'background 0.2s',
              }} />
            ))}
          </div>

          {/* Probe display card */}
          <div style={cardStyle(probeActive)} onClick={handleResponse}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: probeActive ? '#6366f1' : '#94a3b8', marginBottom: 18 }}>
              {probeActive ? '🔍 Is this the letter you memorised?' : '⏳ Next letter coming…'}
            </div>

            {probeActive && probes[probeIndex] ? (
              <div
                key={`probe-${roundIndex}-${probeIndex}`}
                style={{ animation: 'stimPop 0.22s cubic-bezier(.34,1.56,.64,1) both' }}
              >
                <StimulusCircle stim={probes[probeIndex].stim} size={120} />
              </div>
            ) : (
              <FixationCross />
            )}

            {/* Practice feedback shown in the inter-probe gap */}
            {!showingProbe && lastProbeResult && isRoundPractice && (
              <div style={{
                marginTop: 16, fontSize: 15, fontWeight: 800, padding: '10px 20px', borderRadius: 14,
                background: lastProbeResult === 'hit' ? '#d1fae5' : '#fee2e2',
                color: lastProbeResult === 'hit' ? '#065f46' : '#991b1b',
              }}>
                {lastProbeResult === 'hit'         && '✅ Correct match!'}
                {lastProbeResult === 'false_alarm' && "❌ That wasn't the target"}
                {lastProbeResult === 'miss'        && '❌ Missed! That was your target'}
              </div>
            )}
          </div>

          {/* YES button */}
          <button
            onClick={handleResponse}
            disabled={!probeActive}
            style={{
              width: '100%', padding: '17px', fontSize: 18, fontWeight: 800,
              borderRadius: 16, border: 'none',
              cursor: probeActive ? 'pointer' : 'not-allowed',
              background: probeActive
                ? 'linear-gradient(135deg,#10b981,#059669)'
                : '#e2e8f0',
              color: probeActive ? '#fff' : '#94a3b8',
              boxShadow: probeActive ? '0 6px 20px rgba(16,185,129,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {probeActive ? ' YES — IT MATCHES!' : '⏳  Waiting for next letter…'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.6 }}>
            If it doesn't match, <strong>do nothing</strong> — next letter comes automatically.{' '}
            <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>Space</kbd>
          </p>

          
        </div>
      )}

      {/* ── ROUND RESULT ── */}
      {subPhase === 'round_result' && (() => {
        const latest = roundResults[roundResults.length - 1] || { hits: rHits, misses: rMisses, fas: rFAs, crs: rCRs };
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#f8faff', border: '2px solid #e0e7ff', borderRadius: 20, padding: '24px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>
                {latest.fas === 0 && latest.misses === 0 ? '🎯' : latest.hits > 0 ? '👍' : '💪'}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 14px 0' }}>
                {isRoundPractice ? 'Practice Done!' : 'Round Complete!'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Correct matches', value: latest.hits,   color: '#10b981' },
                  { label: 'Missed targets',  value: latest.misses, color: latest.misses > 0 ? '#ef4444' : '#10b981' },
                  { label: 'False alarms',    value: latest.fas,    color: latest.fas > 0 ? '#f59e0b' : '#10b981' },
                  { label: 'Correct passes',  value: latest.crs,    color: '#6366f1' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {isRoundPractice && (
              <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 14, padding: '12px', marginBottom: 14, fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                <strong>Practice complete!</strong> The real test now begins — feedback won't show,
                but your answers are recorded.
              </div>
            )}

            <button
              style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
              onClick={advanceToNextRound}
            >
              {roundIndex + 1 >= totalRounds ? 'See Results →' : 'Next Round →'}
            </button>
          </div>
        );
      })()}

      <style>{`@keyframes stimPop { 0%{transform:scale(0.6);opacity:0} 100%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

export default NBackTask;
