/**
 * Initiating Joint Attention (IJA) Task
 *
 * Medical paradigm: Cause-and-Effect anomaly detection
 * User spots the unusual "out-of-place" object and "shares" it with a
 * virtual character by tapping the character's face.
 *
 * Key fix:  clicking any WRONG item marks it incorrect, shows feedback,
 *           then auto-advances to the next trial (no stuck state).
 *
 * Key metrics: detection accuracy, sharing rate, avg detection time
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/* ─── 30+ scenes per complexity tier ─── */
const SCENES = {
  simple: [
    { bg: '🏡🌳🌳', items: ['🐕','🌷','🦋'], anomaly: '🐘', desc: 'An elephant in the front yard!' },
    { bg: '🏫📚📝', items: ['✏️','📏','🎒'], anomaly: '🦜', desc: 'A parrot in the classroom!' },
    { bg: '🛒🥫🍞', items: ['🥛','🍎','🧀'], anomaly: '🦁', desc: 'A lion in the grocery store!' },
    { bg: '🏖️🌊☀️', items: ['🏄','🐚','⛱️'], anomaly: '🎄', desc: 'A Christmas tree at the beach!' },
    { bg: '🌙🛏️💤', items: ['🧸','📖','🌜'], anomaly: '🚀', desc: 'A rocket in the bedroom!' },
    { bg: '🚿🛁🧴', items: ['🪥','🧼','🧽'], anomaly: '🐢', desc: 'A turtle in the bathroom!' },
    { bg: '🏕️🌲🔥', items: ['🎒','🏕️','🪵'], anomaly: '🐧', desc: 'A penguin at the campsite!' },
    { bg: '🎂🎈🎉', items: ['🎁','🧁','🕯️'], anomaly: '🦈', desc: 'A shark at the birthday party!' },
    { bg: '🚌🏫🎒', items: ['📚','✏️','🧃'], anomaly: '🦩', desc: 'A flamingo on the school bus!' },
    { bg: '🏊💧🩱', items: ['🥽','🏖️','⛱️'], anomaly: '⛷️', desc: 'A skier at the swimming pool!' },
    { bg: '🍽️🥗🍝', items: ['🍴','🥂','🧂'], anomaly: '🏀', desc: 'A basketball on the dinner table!' },
    { bg: '🧑‍🍳🍳🥘', items: ['🧅','🥕','🍅'], anomaly: '📺', desc: 'A TV in the kitchen!' },
    { bg: '🛝🎡🎠', items: ['⚽','🪁','🛴'], anomaly: '🖥️', desc: 'A computer at the playground!' },
    { bg: '🌻🌼🌷', items: ['🦋','🐝','🐞'], anomaly: '⚓', desc: 'An anchor in the flower garden!' },
    { bg: '🚗🛣️⛽', items: ['🏎️','🚦','🚧'], anomaly: '🐙', desc: 'An octopus on the road!' },
    { bg: '📬🏡🌳', items: ['📰','📦','🔑'], anomaly: '🦖', desc: 'A dinosaur in the mailbox!' },
    { bg: '🛋️📺🪴', items: ['🛏️','💡','🖼️'], anomaly: '🌊', desc: 'An ocean wave in the living room!' },
    { bg: '🎪🎭🎶', items: ['🤡','🎩','🎤'], anomaly: '🧊', desc: 'An ice cube at the circus!' },
    { bg: '🐄🌾🚜', items: ['🐓','🐖','🐑'], anomaly: '🛸', desc: 'A UFO on the farm!' },
    { bg: '☁️🌤️🌈', items: ['🦅','🎈','✈️'], anomaly: '🐋', desc: 'A whale in the sky!' },
    { bg: '🏥💊🩺', items: ['💉','🩹','🌡️'], anomaly: '🎸', desc: 'A guitar in the hospital!' },
    { bg: '🧪🔬📋', items: ['⚗️','🥼','🔍'], anomaly: '🍕', desc: 'Pizza in the science lab!' },
    { bg: '📖✏️🗂️', items: ['📎','📐','📏'], anomaly: '🐊', desc: 'A crocodile in the office!' },
    { bg: '🛫☁️🌍', items: ['💺','🧳','🎫'], anomaly: '🛁', desc: 'A bathtub on the airplane!' },
    { bg: '⛪🕊️🕯️', items: ['📖','🎵','🪑'], anomaly: '🏄', desc: 'A surfer in the church!' },
    { bg: '🏦💰📊', items: ['💳','📑','🖥️'], anomaly: '🌋', desc: 'A volcano in the bank!' },
    { bg: '🚂💨🛤️', items: ['🎫','💺','🧳'], anomaly: '🐙', desc: 'An octopus on the train!' },
    { bg: '🎬🍿🎭', items: ['🎥','💺','🎞️'], anomaly: '🦈', desc: 'A shark at the movies!' },
    { bg: '🧹🪣🧤', items: ['🧽','🧴','🧼'], anomaly: '🎺', desc: 'A trumpet while cleaning!' },
    { bg: '📸🖼️🎨', items: ['🖌️','🖍️','✂️'], anomaly: '🐍', desc: 'A snake in the art studio!' },
    { bg: '🍦🧁🍩', items: ['🍫','🍬','🍭'], anomaly: '🔧', desc: 'A wrench in the candy shop!' },
    { bg: '🎓📚🏫', items: ['🎒','📝','🖍️'], anomaly: '🐊', desc: 'A crocodile at graduation!' },
  ],
  moderate: [
    { bg: '🌳🌿🌻', items: ['🦋','🐛','🐞','🌺'], anomaly: '🔌', desc: 'A power plug in the garden!' },
    { bg: '🏊‍♂️💧🏊', items: ['🩱','🥽','🏖️','🌊'], anomaly: '🎿', desc: 'Ski gear at the pool!' },
    { bg: '🍽️🥗🍝', items: ['🍴','🥂','🧂','🕯️'], anomaly: '⚽', desc: 'A soccer ball at dinner!' },
    { bg: '🎹🎵🎶', items: ['🎷','🥁','🎻','🎤'], anomaly: '🧹', desc: 'A broom in the orchestra!' },
    { bg: '📚📖✏️', items: ['🗂️','📎','📐','🖋️'], anomaly: '🍕', desc: 'Pizza among school supplies!' },
    { bg: '🚂💨🛤️', items: ['🎫','💺','🧳','🪟'], anomaly: '🐙', desc: 'An octopus on the train!' },
    { bg: '🧪🔬📋', items: ['⚗️','🥼','🔍','📝'], anomaly: '🎸', desc: 'A guitar in the lab!' },
    { bg: '🏋️🏃🤸', items: ['🏀','⚽','🎾','🥊'], anomaly: '🎂', desc: 'A birthday cake at the gym!' },
    { bg: '🛫✈️☁️', items: ['💺','🧳','🎫','📖'], anomaly: '🐄', desc: 'A cow on the airplane!' },
    { bg: '🌊🏖️⛵', items: ['🐚','🏄','🦀','🐟'], anomaly: '🏔️', desc: 'A snowy mountain at the beach!' },
    { bg: '🎪🎠🎡', items: ['🤡','🎈','🍿','🎶'], anomaly: '💻', desc: 'A laptop at the carnival!' },
    { bg: '🧑‍🍳🍳🥘', items: ['🧅','🥕','🍅','🫑'], anomaly: '🎺', desc: 'A trumpet in the kitchen!' },
    { bg: '🏡🌳🌸', items: ['🐕','🚿','🪴','🌻'], anomaly: '🦑', desc: 'A squid in the backyard!' },
    { bg: '📬📦🏡', items: ['📰','🔑','📫','✉️'], anomaly: '🌵', desc: 'A cactus at the post office!' },
    { bg: '🛒🥫🍞', items: ['🥛','🍎','🧀','🥚'], anomaly: '🎯', desc: 'A dartboard in the grocery!' },
    { bg: '🏥💊🩺', items: ['💉','🩹','🌡️','📋'], anomaly: '🦜', desc: 'A parrot in the hospital!' },
    { bg: '🎉🎊🎈', items: ['🎁','🧁','🕯️','🎶'], anomaly: '🛠️', desc: 'Tools at the party!' },
    { bg: '🏕️🌲🔥', items: ['🎒','⛺','🪵','🌌'], anomaly: '🖨️', desc: 'A printer at the campsite!' },
    { bg: '🌾🐄🚜', items: ['🐓','🐖','🐑','🌻'], anomaly: '🎰', desc: 'A slot machine on the farm!' },
    { bg: '🧑‍🎨🎨🖼️', items: ['🖌️','🖍️','✂️','📐'], anomaly: '🍳', desc: 'A frying pan in the art class!' },
    { bg: '🏊💧🤿', items: ['🩱','🦈','🐠','🐚'], anomaly: '📺', desc: 'A TV in the ocean!' },
    { bg: '📖🧑‍🏫🏫', items: ['✏️','📏','🎒','📓'], anomaly: '🛸', desc: 'A UFO in the classroom!' },
    { bg: '☕📰🛋️', items: ['📱','🍪','🕰️','💡'], anomaly: '🐍', desc: 'A snake in the café!' },
    { bg: '🛍️👗👠', items: ['👜','🧥','👒','💍'], anomaly: '🏈', desc: 'A football in the boutique!' },
    { bg: '🎓🏫📚', items: ['🎒','📝','🖍️','📏'], anomaly: '🦩', desc: 'A flamingo at graduation!' },
    { bg: '🚗🛣️⛽', items: ['🏎️','🚦','🚧','🛞'], anomaly: '🎻', desc: 'A violin on the highway!' },
    { bg: '🧁🍰🎂', items: ['🍫','🍬','🍭','🧇'], anomaly: '🔭', desc: 'A telescope in the bakery!' },
    { bg: '🌌🔭⭐', items: ['🌙','☄️','🪐','🛰️'], anomaly: '🐔', desc: 'A chicken in outer space!' },
    { bg: '🏰👑🗡️', items: ['🛡️','🏹','🧙','🐉'], anomaly: '📱', desc: 'A smartphone in the castle!' },
    { bg: '🗺️🧭🏔️', items: ['🎒','🥾','⛺','🔦'], anomaly: '🍦', desc: 'Ice cream on a mountain hike!' },
    { bg: '🏟️⚽🏆', items: ['🎽','🥅','📣','🏃'], anomaly: '🧸', desc: 'A teddy bear at the stadium!' },
    { bg: '🎤🎶🎧', items: ['🎸','🎹','🥁','🪘'], anomaly: '🧲', desc: 'A magnet at the concert!' },
  ],
  complex: [
    { bg: '🏪💲🛍️', items: ['🧴','🪥','📰','🔋','🧻'], anomaly: '🐧', desc: 'A penguin at the store!' },
    { bg: '🏥💊🩺', items: ['💉','🩹','🌡️','📋','🧪'], anomaly: '🎪', desc: 'A circus tent in the hospital!' },
    { bg: '✈️☁️🌍', items: ['💺','🧳','🎫','📱','🥤'], anomaly: '🛁', desc: 'A bathtub on the plane!' },
    { bg: '🎬🍿🎭', items: ['🎥','💺','🎞️','🎤','💡'], anomaly: '🦈', desc: 'A shark at the theater!' },
    { bg: '⛪🕊️🕯️', items: ['📖','🎵','🪑','🔔','💐'], anomaly: '🏄', desc: 'A surfer in church!' },
    { bg: '🏦💰📊', items: ['💳','📑','🖥️','📞','🗄️'], anomaly: '🌋', desc: 'A volcano in the bank!' },
    { bg: '🎓📚🏫', items: ['🎒','📝','🖍️','📏','🗺️'], anomaly: '🐊', desc: 'A crocodile at school!' },
    { bg: '🏰👑🗡️', items: ['🛡️','🏹','🧙','🐉','🪙'], anomaly: '🛹', desc: 'A skateboard in the castle!' },
    { bg: '🌌🔭⭐', items: ['🌙','☄️','🪐','🛰️','🔬'], anomaly: '🐓', desc: 'A rooster in space!' },
    { bg: '🏟️⚽🏆', items: ['🎽','🥅','📣','🏃','🧤'], anomaly: '🎻', desc: 'A violin at the match!' },
    { bg: '🛳️🌊⚓', items: ['🧳','💺','🛟','🪝','🚢'], anomaly: '🌵', desc: 'A cactus on the ship!' },
    { bg: '🧑‍🔬🔬🧪', items: ['⚗️','🥼','📋','🔍','💊'], anomaly: '🎈', desc: 'A balloon in the lab!' },
    { bg: '🗽🏙️🚕', items: ['🏢','🚇','🌃','📸','🗺️'], anomaly: '🐫', desc: 'A camel in New York!' },
    { bg: '🏔️⛷️❄️', items: ['🎿','🧤','🧣','☕','🏂'], anomaly: '🐠', desc: 'A tropical fish on the slopes!' },
    { bg: '🎰🃏♠️', items: ['🎲','💰','🍸','🪙','♦️'], anomaly: '🧸', desc: 'A teddy at the casino!' },
    { bg: '🚀🌑🛰️', items: ['👨‍🚀','🔧','🪐','⭐','🛸'], anomaly: '🌺', desc: 'A hibiscus on the moon!' },
    { bg: '🏝️🌴🌺', items: ['🐚','🦀','🏖️','🥥','⛵'], anomaly: '🖨️', desc: 'A printer on the island!' },
    { bg: '📻🎵🕺', items: ['🎧','🎤','💿','🔊','🪩'], anomaly: '🧯', desc: 'A fire extinguisher at the disco!' },
    { bg: '🧑‍🍳👨‍🍳🍽️', items: ['🥘','🍜','🍣','🧁','🍷'], anomaly: '🔩', desc: 'A bolt in the restaurant!' },
    { bg: '🏋️🤸🧘', items: ['🏀','🥊','🎾','🏓','🛹'], anomaly: '🎄', desc: 'A Christmas tree at the gym!' },
    { bg: '🌾🚜🐄', items: ['🐑','🐓','🌻','🌽','🥕'], anomaly: '🎹', desc: 'A piano on the farm!' },
    { bg: '🏗️🚧🔨', items: ['🧱','🪜','🪵','🔧','🛠️'], anomaly: '🦩', desc: 'A flamingo at the construction site!' },
    { bg: '🎭🎨🖌️', items: ['🖼️','✂️','📐','🖍️','📏'], anomaly: '🐋', desc: 'A whale in the art gallery!' },
    { bg: '🛤️🚆🏔️', items: ['🎫','💺','🏕️','🧳','🔦'], anomaly: '🍕', desc: 'Pizza on the mountain railway!' },
    { bg: '🕹️🎮📺', items: ['🖥️','🎧','📱','🕶️','💽'], anomaly: '🌊', desc: 'Ocean waves in the arcade!' },
    { bg: '🏖️🌅🌴', items: ['⛱️','🩱','🧴','🕶️','🥥'], anomaly: '🏒', desc: 'A hockey stick at the beach!' },
    { bg: '🧑‍⚕️🏥💉', items: ['📋','🩻','💊','🧪','🩺'], anomaly: '🎠', desc: 'A carousel in the clinic!' },
    { bg: '📡🔭🌌', items: ['📊','🖥️','📋','☕','🔬'], anomaly: '🐸', desc: 'A frog at the observatory!' },
    { bg: '🎢🎡🎪', items: ['🍿','🎈','🤡','🎶','🎠'], anomaly: '📚', desc: 'A stack of books on the roller coaster!' },
    { bg: '🚒🔥👨‍🚒', items: ['🧯','🪜','🚿','📻','🧤'], anomaly: '🐘', desc: 'An elephant at the fire station!' },
    { bg: '🛥️⛵🌊', items: ['🐟','🦞','🎣','🧭','⚓'], anomaly: '🎹', desc: 'A piano on the boat!' },
    { bg: '🧑‍🏫📖🏫', items: ['📝','🎒','💻','📐','📏'], anomaly: '🦁', desc: 'A lion in the school!' },
  ],
};

const CHARACTER = '🧑‍🤝‍🧑';

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
function JointAttentionIJA({ config, onComplete }) {
  const totalTrials     = config.total_trials      || 10;
  const sceneComplexity = config.scene_complexity   || 'simple';
  const timeLimit       = config.time_limit         || 15;

  const [trials, setTrials]             = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase]               = useState('scan');  // scan | found | share | feedback | done
  const [responses, setResponses]       = useState([]);
  const [trialStartTime, setTrialStart] = useState(null);
  const [foundTime, setFoundTime]       = useState(null);
  const [timeLeft, setTimeLeft]         = useState(timeLimit);
  const [wrongFlash, setWrongFlash]     = useState(null);     // emoji of wrongly-tapped item
  const timerRef = useRef(null);
  const fbRef    = useRef(null);

  /* ── Build trial list from pool (shuffle, repeat if needed) ── */
  useEffect(() => {
    const pool = SCENES[sceneComplexity] || SCENES.simple;
    const shuffled = shuffle(pool);
    const selected = [];
    while (selected.length < totalTrials) {
      selected.push(...shuffled.slice(0, totalTrials - selected.length));
    }
    setTrials(selected.slice(0, totalTrials));
    setTrialStart(Date.now());
  }, [totalTrials, sceneComplexity]);

  /* ── Count-down timer during "scan" phase ── */
  useEffect(() => {
    if (phase !== 'scan') return;
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, phase]);

  /* ── Completion ── */
  useEffect(() => {
    if (currentIndex >= trials.length && trials.length > 0 && phase !== 'done') {
      setPhase('done');
      let detected = 0, shared = 0;
      const dTimes = [], sTimes = [];
      responses.forEach(r => {
        if (r.detected) { detected++; dTimes.push(r.detectionTime); }
        if (r.shared)   { shared++;   sTimes.push(r.sharingTime); }
      });
      const detAcc   = trials.length ? (detected / trials.length) * 100 : 0;
      const shareRt  = detected     ? (shared / detected) * 100 : 0;
      const avgDet   = dTimes.length ? dTimes.reduce((a, b) => a + b, 0) / dTimes.length : 0;
      const avgShare = sTimes.length ? sTimes.reduce((a, b) => a + b, 0) / sTimes.length : 0;

      onComplete([
        { metric_name: 'detection_accuracy', metric_value: Math.round(detAcc * 100) / 100 },
        { metric_name: 'sharing_rate',       metric_value: Math.round(shareRt * 100) / 100 },
        { metric_name: 'avg_detection_time', metric_value: Math.round(avgDet) },
        { metric_name: 'avg_sharing_time',   metric_value: Math.round(avgShare) },
      ]);
    }
  }, [currentIndex, trials.length, phase]);

  /* ── Advance to next trial ── */
  const advance = useCallback(() => {
    setWrongFlash(null);
    setCurrentIndex(prev => prev + 1);
    setPhase('scan');
    setTrialStart(Date.now());
    setFoundTime(null);
  }, []);

  /* ── Timeout (user didn't click anything) ── */
  const handleTimeout = useCallback(() => {
    setResponses(prev => [...prev, { detected: false, shared: false, detectionTime: null, sharingTime: null }]);
    setPhase('feedback');
    fbRef.current = setTimeout(advance, 2500);
  }, [advance]);

  /* ── User taps the anomaly (correct) — go directly to feedback ── */
  const handleAnomalyClick = useCallback(() => {
    if (phase !== 'scan') return;
    clearInterval(timerRef.current);
    const dTime = Date.now() - trialStartTime;
    setFoundTime(dTime);
    setResponses(prev => [...prev, { detected: true, shared: false, detectionTime: dTime, sharingTime: null }]);
    setPhase('feedback');
    fbRef.current = setTimeout(advance, 2200);
  }, [phase, trialStartTime, advance]);

  /* ── User taps a normal item (incorrect) ── */
  const handleWrongClick = useCallback((emoji) => {
    if (phase !== 'scan') return;
    clearInterval(timerRef.current);

    setWrongFlash(emoji);
    setResponses(prev => [...prev, { detected: false, shared: false, detectionTime: null, sharingTime: null, wrongItem: emoji }]);
    setPhase('feedback');
    fbRef.current = setTimeout(advance, 2200);
  }, [phase, advance]);

  /* ── User taps the character to "share" ── */
  const handleShare = useCallback(() => {
    if (phase !== 'found') return;
    const sTime = Date.now() - trialStartTime - foundTime;
    setResponses(prev => [...prev, { detected: true, shared: true, detectionTime: foundTime, sharingTime: sTime }]);
    setPhase('feedback');
    fbRef.current = setTimeout(advance, 2500);
  }, [phase, trialStartTime, foundTime, advance]);

  /* ── User found anomaly but didn't share (skip share) ── */
  const handleSkipShare = useCallback(() => {
    if (phase !== 'found') return;
    setResponses(prev => [...prev, { detected: true, shared: false, detectionTime: foundTime, sharingTime: null }]);
    setPhase('feedback');
    fbRef.current = setTimeout(advance, 2200);
  }, [phase, foundTime, advance]);

  useEffect(() => () => clearTimeout(fbRef.current), []);

  /* ── Render ── */
  const progress = trials.length ? (currentIndex / trials.length) * 100 : 0;
  const cur      = trials[currentIndex];
  const lastResp = responses[responses.length - 1];

  // Memoize shuffled items so they don't re-shuffle on every render/timer tick
  const sceneItems = useMemo(() => {
    if (!cur) return [];
    return shuffle([
      ...cur.items.map(e => ({ emoji: e, isAnomaly: false })),
      { emoji: cur.anomaly, isAnomaly: true },
    ]);
  }, [currentIndex, trials]);

  return (
    <div className="task-arena ija-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      <div className="ija-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px', marginBottom: 8,
      }}>
        <div className="trial-counter" style={{ fontWeight: 600, color: '#475569' }}>
          {Math.min(currentIndex + 1, trials.length)} / {trials.length}
        </div>
        {phase === 'scan' && (
          <div style={{
            fontWeight: 700, fontSize: 20,
            color: timeLeft <= 5 ? '#ef4444' : '#6366f1',
            transition: 'color .3s',
          }}>
            ⏱️ {timeLeft}s
          </div>
        )}
      </div>

      {cur && (
        <div className="ija-scene" style={{
          background: 'linear-gradient(145deg,#f8fafc,#e2e8f0)',
          borderRadius: 20, padding: 24, minHeight: 340,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Scene background emojis */}
          <div style={{
            fontSize: 36, textAlign: 'center', marginBottom: 14,
            letterSpacing: 6,filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.1))',
          }}>
            {cur.bg}
          </div>

          {/* Items grid (shuffled — anomaly in random position) */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16,
            marginBottom: 20,
          }}>
            {sceneItems.map((item, i) => {
              const isWrongFlash = wrongFlash === item.emoji && phase === 'feedback';
              const isFoundAnomaly = item.isAnomaly && (phase === 'found' || (phase === 'feedback' && lastResp?.detected));

              return (
                <button
                  key={i}
                  onClick={() => item.isAnomaly ? handleAnomalyClick() : handleWrongClick(item.emoji)}
                  disabled={phase !== 'scan'}
                  style={{
                    fontSize: 52, background: isFoundAnomaly
                      ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)'
                      : isWrongFlash
                        ? 'linear-gradient(135deg,#fee2e2,#fecaca)'
                        : 'rgba(255,255,255,0.7)',
                    border: isFoundAnomaly
                      ? '3px solid #22c55e'
                      : isWrongFlash
                        ? '3px solid #ef4444'
                        : '2px solid rgba(0,0,0,.06)',
                    borderRadius: 18, padding: '14px 18px', cursor: phase === 'scan' ? 'pointer' : 'default',
                    transition: 'all .2s ease', minWidth: 80, minHeight: 80,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isFoundAnomaly
                      ? '0 0 18px rgba(34,197,94,.35)'
                      : isWrongFlash
                        ? '0 0 14px rgba(239,68,68,.3)'
                        : '0 2px 8px rgba(0,0,0,.06)',
                    animation: isFoundAnomaly ? 'TPglow 1s ease infinite alternate' : 'none',
                    transform: (phase === 'scan') ? 'scale(1)' : 'scale(0.97)',
                  }}
                  aria-label={item.isAnomaly ? 'Anomaly' : 'Normal item'}
                >
                  {item.emoji}
                </button>
              );
            })}
          </div>

          {/* Feedback overlay */}
          {phase === 'feedback' && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              padding: '14px 28px', borderRadius: 16, fontWeight: 700, fontSize: 20, zIndex: 20,
              animation: 'TPbounceIn .3s ease',
              background: lastResp?.detected
                ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)'
                : wrongFlash
                  ? 'linear-gradient(135deg,#fee2e2,#fecaca)'
                  : 'linear-gradient(135deg,#fef3c7,#fde68a)',
              color: lastResp?.detected ? '#065f46' : wrongFlash ? '#991b1b' : '#92400e',
              boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            }}>
              {lastResp?.detected
                ? `✅ Correct! ${cur?.desc}`
                : wrongFlash
                  ? `❌ That's not unusual — the odd one was ${cur?.anomaly}`
                  : '⏰ Time\'s up! Look for what doesn\'t belong!'}
            </div>
          )}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 16, marginTop: 12, color: '#64748b', fontWeight: 500 }}>
        {phase === 'scan' && '🔍 Find the item that doesn\'t belong in this scene!'}
      </p>
    </div>
  );
}

export default JointAttentionIJA;