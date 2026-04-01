/**
 * Conversation Practice Task
 * 
 * Medical paradigm: Social Pragmatics Training
 * Turn-taking cues, greeting scripts, conflict negotiation
 * Key metric: Cue identification accuracy and latency
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const SCENARIOS = {
  turn_taking: [
    {
      dialogue: [
        { speaker: 'Alex', text: "I went to the park yesterday.", isClue: false },
        { speaker: 'Alex', text: "We played on the swings and...", isClue: false },
        { speaker: null, text: "[Alex pauses and looks at you]", isClue: true, cueType: "pause_look" },
      ],
      question: "What should you do here?",
      options: ["Wait silently", "Start talking — it's your turn", "Walk away"],
      correct: 1,
      explanation: "Alex paused and looked at you — that's a turn-taking cue saying it's your turn to respond."
    },
    {
      dialogue: [
        { speaker: 'Teacher', text: "Does anyone have questions about the homework?", isClue: false },
        { speaker: null, text: "[Teacher looks around the room]", isClue: true, cueType: "invitation" },
      ],
      question: "Is this a good time to ask your question?",
      options: ["Yes — the teacher invited questions", "No — you should wait until later", "Only if nobody else wants to ask"],
      correct: 0,
      explanation: "The teacher specifically asked for questions — this is an open invitation to speak."
    },
    {
      dialogue: [
        { speaker: 'Friend', text: "So then the dog ran across the—", isClue: false },
        { speaker: 'Friend', text: "—wait, I haven't finished yet!", isClue: true, cueType: "not_done" },
      ],
      question: "What happened here?",
      options: ["Your friend is being rude", "You accidentally interrupted — your friend wasn't done talking", "Your friend forgot what they were saying"],
      correct: 1,
      explanation: "Your friend hadn't finished their story. The words 'wait, I haven't finished' signal they want to keep talking."
    },
    {
      dialogue: [
        { speaker: 'Mom', text: "How was school today?", isClue: false },
        { speaker: null, text: "[Mom is looking at you with an expectant expression]", isClue: true, cueType: "question" },
      ],
      question: "What does Mom expect?",
      options: ["She's just thinking out loud", "She wants you to answer her question", "She wants silence"],
      correct: 1,
      explanation: "When someone asks a question and looks at you, they're waiting for your response."
    },
    {
      dialogue: [
        { speaker: 'Sam', text: "I think we should play soccer!", isClue: false },
        { speaker: 'Sam', text: "What do you think?", isClue: true, cueType: "opinion_request" },
      ],
      question: "Sam asked 'What do you think?' — Why?",
      options: ["Sam wants you to agree with him", "Sam wants to hear your opinion", "Sam doesn't care what you think"],
      correct: 1,
      explanation: "'What do you think?' is an invitation for you to share your own view."
    },
    {
      dialogue: [
        { speaker: 'Group', text: "[Everyone is sharing their weekend stories around a table]", isClue: false },
        { speaker: 'Friend', text: "...and that was my weekend! [Looks at you]", isClue: true, cueType: "shift" },
      ],
      question: "What should you do?",
      options: ["Stay quiet", "Share your weekend story too", "Change the topic completely"],
      correct: 1,
      explanation: "Your friend finished and looked at you — they're passing the turn to you to share."
    },
  ],
  greetings: [
    {
      scenario: "You walk into school in the morning and see your teacher at the door.",
      question: "What is the best greeting?",
      options: ["Ignore them and walk past", "'Good morning, Ms. Johnson!'", "'Hey, what's up dude?'"],
      correct: 1,
      explanation: "A polite 'Good morning' with their name is appropriate for greeting a teacher."
    },
    {
      scenario: "You see your best friend at recess that you haven't seen all weekend.",
      question: "What is a good greeting?",
      options: ["'Hey! How was your weekend?'", "Formal handshake and 'How do you do'", "No greeting needed"],
      correct: 0,
      explanation: "With close friends, a casual, enthusiastic greeting with a question shows you care."
    },
    {
      scenario: "A new kid joins your class and sits next to you.",
      question: "What should you say?",
      options: ["Nothing — they'll talk when they're ready", "'Hi! I'm [name]. Welcome to our class!'", "'This is MY seat'"],
      correct: 1,
      explanation: "Introducing yourself warmly helps the new student feel welcome."
    },
    {
      scenario: "You're at a family dinner and your aunt who you see rarely arrives.",
      question: "What greeting fits this situation?",
      options: ["'Hey'", "'Hi Auntie! It's great to see you!'", "Wave from far away"],
      correct: 1,
      explanation: "For family members you see rarely, a warm greeting with their name shows you're happy to see them."
    },
    {
      scenario: "You bump into your neighbor while walking the dog.",
      question: "What is appropriate?",
      options: ["A friendly wave and 'Hi, nice day!'", "Pretend you don't see them", "A 20-minute conversation about your day"],
      correct: 0,
      explanation: "A brief, friendly acknowledgment is perfect for casual encounters with neighbors."
    },
    {
      scenario: "You answer a phone call from someone you don't know.",
      question: "What should you say?",
      options: ["'What do you want?'", "'Hello?' or 'Hello, this is [your name]'", "Just wait silently"],
      correct: 1,
      explanation: "A clear 'Hello' identifies that you've answered and invites the caller to explain why they're calling."
    },
  ],
  conflict: [
    {
      scenario: "Your friend wants to play basketball, but you want to play soccer. You only have time for one activity.",
      question: "What is the best approach?",
      options: [
        "Insist on soccer — your idea came first",
        "Suggest a compromise: 'Let's play basketball now and soccer next time'",
        "Just do whatever they want so there's no argument"
      ],
      correct: 1,
      explanation: "A compromise respects both people's wishes and maintains the friendship."
    },
    {
      scenario: "A classmate accidentally knocks your project off the desk and it breaks. They say 'Sorry!'",
      question: "What should you do?",
      options: [
        "Yell at them — they ruined it!",
        "Accept the apology and ask them to help you fix it",
        "Never talk to them again"
      ],
      correct: 1,
      explanation: "Accepting the apology and asking for help solves the problem while keeping the relationship."
    },
    {
      scenario: "Two friends are arguing about what movie to watch. Both look at you to decide.",
      question: "What is a good strategy?",
      options: [
        "Pick your own favorite movie entirely",
        "Suggest they take turns — one person picks now, the other picks next time",
        "Refuse to get involved"
      ],
      correct: 1,
      explanation: "Turn-taking is a fair solution that both people can agree to."
    },
    {
      scenario: "Someone is using the swing you wanted, and you've been waiting for 10 minutes.",
      question: "What should you do?",
      options: [
        "Push them off — it's your turn",
        "Politely say 'I've been waiting. Can I have a turn soon?'",
        "Go tell the teacher immediately"
      ],
      correct: 1,
      explanation: "Politely expressing your needs gives the other person a chance to share fairly."
    },
    {
      scenario: "Your group project partner isn't doing their share of the work.",
      question: "How should you handle this?",
      options: [
        "Do all the work yourself and complain later",
        "Talk to them privately: 'I noticed I've been doing most of the work. Can we split it up?'",
        "Tell the teacher without talking to your partner first"
      ],
      correct: 1,
      explanation: "Addressing the issue directly but kindly gives them a chance to step up."
    },
    {
      scenario: "You disagree with a friend's opinion about a TV show. They think it's great; you think it's boring.",
      question: "What is the best response?",
      options: [
        "'That show is terrible and you're wrong'",
        "'I can see why you like it! It's just not my style'",
        "Pretend to agree"
      ],
      correct: 1,
      explanation: "Acknowledging their view while sharing yours respectfully allows different opinions to coexist."
    },
  ]
};

function ConversationTask({ config, onComplete }) {
  const skillFocus = config.skill_focus || 'turn_taking';
  const numScenarios = config.num_scenarios || 6;

  const [scenarios, setScenarios] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [phase, setPhase] = useState('scenario');
  const [selected, setSelected] = useState(null);
  const [trialStartTime, setTrialStartTime] = useState(Date.now());

  useEffect(() => {
    const pool = SCENARIOS[skillFocus] || SCENARIOS.turn_taking;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setScenarios(shuffled.slice(0, Math.min(numScenarios, shuffled.length)));
  }, []);

  useEffect(() => {
    if (currentIndex >= scenarios.length && scenarios.length > 0 && phase !== 'done') {
      setPhase('done');
      let correct = 0;
      const latencies = [];

      responses.forEach(r => {
        if (r.correct) correct++;
        if (r.latency) latencies.push(r.latency);
      });

      const accuracy = scenarios.length > 0 ? (correct / scenarios.length) * 100 : 0;
      const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

      onComplete([
        { metric_name: 'cue_identification_accuracy', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'response_appropriateness', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'avg_latency_ms', metric_value: Math.round(avgLatency) },
      ]);
    }
  }, [currentIndex, scenarios.length, phase]);

  const handleAnswer = (optionIndex) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    const scenario = scenarios[currentIndex];
    const isCorrect = optionIndex === scenario.correct;
    const latency = Date.now() - trialStartTime;

    setResponses(prev => [...prev, { answer: optionIndex, correct: isCorrect, latency }]);

    setTimeout(() => {
      setPhase('feedback');
    }, 300);
  };

  const handleNext = () => {
    setSelected(null);
    setPhase('scenario');
    setCurrentIndex(prev => prev + 1);
    setTrialStartTime(Date.now());
  };

  const progress = scenarios.length > 0 ? (currentIndex / scenarios.length) * 100 : 0;
  const current = scenarios[currentIndex];

  if (!current && phase !== 'done') return <div className="task-arena">Preparing scenarios...</div>;

  return (
    <div className="task-arena conversation-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">Scenario {Math.min(currentIndex + 1, scenarios.length)} / {scenarios.length}</div>

      {current && (
        <div className="conv-content">
          {/* Dialogue-based scenarios */}
          {current.dialogue && (
            <div className="conv-dialogue">
              {current.dialogue.map((line, i) => (
                <div key={i} className={`conv-line ${line.isClue ? 'conv-cue' : ''}`}>
                  {line.speaker && <span className="conv-speaker">{line.speaker}:</span>}
                  <span className="conv-text">{line.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Scenario-based (greetings, conflict) */}
          {current.scenario && !current.dialogue && (
            <div className="conv-scenario-box">
              <p>{current.scenario}</p>
            </div>
          )}

          {phase === 'scenario' && (
            <div className="conv-question-area">
              <p className="conv-question">{current.question}</p>
              <div className="conv-options">
                {current.options.map((opt, idx) => (
                  <button
                    key={idx}
                    className={`conv-option`}
                    onClick={() => handleAnswer(idx)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="conv-feedback">
              <div className={`conv-result ${selected === current.correct ? 'correct' : 'incorrect'}`}>
                {selected === current.correct ? '✅ Correct!' : '❌ Not quite'}
              </div>
              <p className="conv-explanation">{current.explanation}</p>
              <button className="btn btn-primary" onClick={handleNext}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConversationTask;
