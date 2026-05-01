/**
 * Facial Emotion Recognition (FER) Task
 * 
 * Medical paradigm: Emotion Recognition with Intensity Scaling
 * Uses emoji-based faces with varying expression clarity
 * Key metric: Accuracy per emotion category
 * Implements intensity scaling: 100%, 50%, 20%
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// Emoji-based face representations with intensity descriptions
// Clinical note: At 0.2 intensity, subtle distinct emojis are used rather than
// all-neutral (which would make discrimination impossible)
const EMOTION_DATA = {
  happy: {
    faces: {
      1.0: { emoji: '😄', description: 'Clearly smiling with bright eyes' },
      0.5: { emoji: '🙂', description: 'Slight upward curve of lips' },
      0.2: { emoji: '🫠', description: 'Very subtle hint of warmth in expression' },
    },
    color: '#2ecc71',
  },
  sad: {
    faces: {
      1.0: { emoji: '😢', description: 'Clearly tearful and downcast' },
      0.5: { emoji: '😞', description: 'Mildly downturned expression' },
      0.2: { emoji: '🫤', description: 'Very subtle drooping of features' },
    },
    color: '#3498db',
  },
  angry: {
    faces: {
      1.0: { emoji: '😠', description: 'Clearly furrowed brows, tight jaw' },
      0.5: { emoji: '😤', description: 'Mild tension in brow area' },
      0.2: { emoji: '😑', description: 'Very subtle tension in face' },
    },
    color: '#e74c3c',
  },
  fearful: {
    faces: {
      1.0: { emoji: '😨', description: 'Wide eyes, open mouth, raised brows' },
      0.5: { emoji: '😟', description: 'Slightly widened eyes' },
      0.2: { emoji: '🫣', description: 'Very subtle eyebrow raise' },
    },
    color: '#9b59b6',
  },
  surprised: {
    faces: {
      1.0: { emoji: '😲', description: 'Wide eyes, dropped jaw, raised brows' },
      0.5: { emoji: '😯', description: 'Slightly raised brows' },
      0.2: { emoji: '🤨', description: 'Barely perceptible widening of eyes' },
    },
    color: '#f39c12',
  },
  neutral: {
    faces: {
      1.0: { emoji: '😐', description: 'Relaxed, no particular expression' },
      0.5: { emoji: '😐', description: 'Relaxed, no particular expression' },
      0.2: { emoji: '😶', description: 'Completely flat affect' },
    },
    color: '#95a5a6',
  },
};

const CONTEXT_SCENARIOS = [
  // Happy contexts
  { text: 'At a birthday party', emotion_hint: 'happy' },
  { text: 'Reunited with a friend after a long time', emotion_hint: 'happy' },
  { text: 'Won first place in a race', emotion_hint: 'happy' },
  // Sad contexts
  { text: 'Lost their favorite toy', emotion_hint: 'sad' },
  { text: 'Their best friend moved away', emotion_hint: 'sad' },
  { text: 'Their pet is feeling sick', emotion_hint: 'sad' },
  // Angry contexts
  { text: 'Someone cut in line', emotion_hint: 'angry' },
  { text: 'Their sibling broke their drawing', emotion_hint: 'angry' },
  { text: 'They were blamed for something they didn\'t do', emotion_hint: 'angry' },
  // Fearful contexts
  { text: 'Heard a loud crash', emotion_hint: 'fearful' },
  { text: 'Walking alone in a dark hallway', emotion_hint: 'fearful' },
  { text: 'A big dog is running toward them', emotion_hint: 'fearful' },
  // Surprised contexts
  { text: 'Found an unexpected gift', emotion_hint: 'surprised' },
  { text: 'A friend jumped out from behind the door', emotion_hint: 'surprised' },
  { text: 'The teacher cancelled the test', emotion_hint: 'surprised' },
  // Neutral contexts
  { text: 'Waiting at a bus stop', emotion_hint: 'neutral' },
  { text: 'Sitting in the waiting room at the dentist', emotion_hint: 'neutral' },
  { text: 'Reading a grocery list', emotion_hint: 'neutral' },
];

function FERTask({ config, onComplete }) {
  const intensity = config.intensity || 1.0;
  const totalFaces = config.total_faces || 18;
  const emotions = config.emotions || ['happy', 'sad', 'angry', 'fearful', 'surprised', 'neutral'];
  const useContext = config.use_context || false;
  const timeLimitPerFace = config.time_limit_per_face || 10;

  const [trials, setTrials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [trialStartTime, setTrialStartTime] = useState(null);
  const [phase, setPhase] = useState('ready');
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitPerFace);
  const timerRef = useRef(null);

  // Generate trials
  useEffect(() => {
    const t = [];
    const facesPerEmotion = Math.max(1, Math.floor(totalFaces / emotions.length));
    
    for (const emotion of emotions) {
      for (let i = 0; i < facesPerEmotion; i++) {
        const ctx = useContext
          ? CONTEXT_SCENARIOS[Math.floor(Math.random() * CONTEXT_SCENARIOS.length)]
          : null;
        t.push({
          emotion,
          intensity,
          context: ctx,
          face: EMOTION_DATA[emotion]?.faces[intensity] || EMOTION_DATA[emotion]?.faces[1.0],
        });
      }
    }

    // Shuffle
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }

    setTrials(t.slice(0, totalFaces));
    setPhase('playing');
    setTrialStartTime(Date.now());
  }, []);

  // Timer per face
  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(timeLimitPerFace);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, phase]);

  // Completion
  useEffect(() => {
    if (currentIndex >= trials.length && trials.length > 0 && phase === 'playing') {
      setPhase('done');

      // Calculate per-emotion accuracy + confusion matrix
      const emotionCorrect = {};
      const emotionTotal = {};
      const confusionMatrix = {}; // { actual_emotion: { chosen_emotion: count } }
      let totalCorrect = 0;
      const rts = [];

      emotions.forEach(e => { confusionMatrix[e] = {}; emotions.forEach(e2 => { confusionMatrix[e][e2] = 0; }); });

      responses.forEach((resp, i) => {
        const trial = trials[i];
        if (!trial) return;
        const emotion = trial.emotion;
        emotionTotal[emotion] = (emotionTotal[emotion] || 0) + 1;
        if (resp.answer) {
          confusionMatrix[emotion][resp.answer] = (confusionMatrix[emotion][resp.answer] || 0) + 1;
        }
        if (resp.answer === emotion) {
          totalCorrect++;
          emotionCorrect[emotion] = (emotionCorrect[emotion] || 0) + 1;
        }
        if (resp.rt) rts.push(resp.rt);
      });

      const overallAccuracy = trials.length > 0 ? (totalCorrect / trials.length) * 100 : 0;
      const avgRT = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;

      // Build per-emotion accuracy summary
      let perEmotionStr = emotions.map(e => {
        const total = emotionTotal[e] || 0;
        const correct = emotionCorrect[e] || 0;
        return total > 0 ? Math.round((correct / total) * 100) : 0;
      }).join(',');

      // Find top confusion pairs (actual ≠ chosen)
      let topConfusion = [];
      emotions.forEach(actual => {
        emotions.forEach(chosen => {
          if (actual !== chosen && confusionMatrix[actual][chosen] > 0) {
            topConfusion.push({ actual, chosen, count: confusionMatrix[actual][chosen] });
          }
        });
      });
      topConfusion.sort((a, b) => b.count - a.count);
      const confusionStr = topConfusion.slice(0, 3).map(c => `${c.actual}→${c.chosen}:${c.count}`).join(';');

      onComplete([
        { metric_name: 'overall_accuracy', metric_value: Math.round(overallAccuracy * 100) / 100 },
        { metric_name: 'avg_reaction_time', metric_value: Math.round(avgRT) },
        { metric_name: 'intensity_threshold', metric_value: intensity * 100 },
        { metric_name: 'accuracy_per_emotion', metric_value: overallAccuracy },
        { metric_name: 'top_confusions', metric_value: topConfusion.length > 0 ? topConfusion[0].count : 0 },
      ]);
    }
  }, [currentIndex, trials.length, phase]);

  const handleAnswer = useCallback((emotion) => {
    if (phase !== 'playing' || currentIndex >= trials.length) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const rt = Date.now() - trialStartTime;
    setResponses(prev => [...prev, { answer: emotion, rt }]);
    setSelected(emotion);

    setTimeout(() => {
      setSelected(null);
      setCurrentIndex(prev => prev + 1);
      setTrialStartTime(Date.now());
    }, 800);
  }, [phase, currentIndex, trials.length, trialStartTime]);

  const progress = trials.length > 0 ? (currentIndex / trials.length) * 100 : 0;
  const currentTrial = trials[currentIndex];

  if (phase === 'ready') return <div className="task-arena">Preparing faces...</div>;

  return (
    <div className="task-arena fer-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="fer-header">
        <div className="trial-counter">{Math.min(currentIndex + 1, trials.length)} / {trials.length}</div>
        <div className="fer-timer">{timeLeft}s</div>
        <div className="fer-intensity">Intensity: {Math.round(intensity * 100)}%</div>
      </div>

      {currentTrial && (
        <div className="fer-face-area">
          {useContext && currentTrial.context && (
            <div className="fer-context">
              Scenario: {currentTrial.context.text}
            </div>
          )}
          <div className="fer-face-display">
            <span className="fer-emoji">{currentTrial.face.emoji}</span>
            {intensity < 1.0 && (
              <div className="fer-description" style={{
                fontSize: intensity <= 0.2 ? '15px' : '13px',
                fontWeight: intensity <= 0.2 ? 600 : 400,
                color: intensity <= 0.2 ? '#334155' : '#64748b',
                background: intensity <= 0.2 ? '#f0f9ff' : 'transparent',
                padding: intensity <= 0.2 ? '8px 16px' : '4px 8px',
                borderRadius: 8,
                marginTop: 8,
              }}>
                💡 {currentTrial.face.description}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fer-options">
        {emotions.map(emotion => (
          <button
            key={emotion}
            className={`fer-option ${selected === emotion ? (emotion === currentTrial?.emotion ? 'correct' : 'wrong') : ''}`}
            onClick={() => handleAnswer(emotion)}
            style={{ borderColor: EMOTION_DATA[emotion]?.color }}
            disabled={selected !== null}
          >
            {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
          </button>
        ))}
      </div>

      <p className="task-hint">What emotion is this person feeling?</p>
    </div>
  );
}

export default FERTask;
