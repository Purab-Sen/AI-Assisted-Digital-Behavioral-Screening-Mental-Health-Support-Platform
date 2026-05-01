/**
 * Conversation Practice Task
 * 
 * Medical paradigm: Social Pragmatics Training
 * Turn-taking cues, greeting scripts, conflict negotiation
 * Key metric: Cue identification accuracy and latency
 * 
 * 16 unique scenarios per skill category (48 total) for non-repetition.
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
    {
      dialogue: [
        { speaker: 'Coach', text: "Alright team, any concerns before the game?", isClue: false },
        { speaker: null, text: "[Coach scans the group, hands on hips]", isClue: true, cueType: "open_floor" },
      ],
      question: "You have a question about positions. Is now a good time?",
      options: ["Yes — the coach opened the floor for concerns", "No — never question the coach", "Only if others speak first"],
      correct: 0,
      explanation: "The coach specifically asked if anyone has concerns. This is your chance to speak."
    },
    {
      dialogue: [
        { speaker: 'Mia', text: "Oh and then—you won't believe this—", isClue: false },
        { speaker: 'Mia', text: "[Getting more excited, speaking faster]", isClue: true, cueType: "not_done" },
      ],
      question: "Mia is speaking faster and seems excited. Should you jump in?",
      options: ["Yes — she needs help finishing", "No — she's building up to something important", "Tell her to slow down"],
      correct: 1,
      explanation: "When someone gets more animated, they're in the middle of their point. Let them finish."
    },
    {
      dialogue: [
        { speaker: 'Dad', text: "I noticed your room is a bit messy.", isClue: false },
        { speaker: null, text: "[Dad raises his eyebrows and crosses his arms]", isClue: true, cueType: "implicit_request" },
      ],
      question: "What is Dad really saying?",
      options: ["He's just making an observation", "He wants you to clean your room", "He wants to help you clean"],
      correct: 1,
      explanation: "The raised eyebrows and crossed arms suggest he's expecting action — he wants you to clean up."
    },
    {
      dialogue: [
        { speaker: 'Storyteller', text: "And so the dragon flew over the mountain...", isClue: false },
        { speaker: 'Storyteller', text: "...and then what do you think happened?", isClue: true, cueType: "question" },
      ],
      question: "The storyteller asked 'what do you think happened?' What should you do?",
      options: ["Stay silent — it's a rhetorical question", "Guess what happened next", "Tell them to just finish the story"],
      correct: 1,
      explanation: "The storyteller is engaging you — they want you to participate by guessing."
    },
    {
      dialogue: [
        { speaker: 'Classmate', text: "I'm stuck on problem 5. I've tried everything...", isClue: false },
        { speaker: null, text: "[Classmate sighs and looks at your paper]", isClue: true, cueType: "help_request" },
      ],
      question: "What is your classmate hoping for?",
      options: ["They want you to give them the answer", "They're hinting they'd like your help or advice", "They're just complaining"],
      correct: 1,
      explanation: "Looking at your work while expressing frustration is an indirect way of asking for help."
    },
    {
      dialogue: [
        { speaker: 'You', text: "I was telling my friend about my vacation—", isClue: false },
        { speaker: 'Friend', text: "[Checks phone, looks around the room]", isClue: true, cueType: "disengaged" },
      ],
      question: "Your friend checked their phone and looked away. What does this mean?",
      options: ["They're bored or distracted — maybe pause and check in", "They're really interested", "They want you to talk louder"],
      correct: 0,
      explanation: "Looking away and checking a phone are signs of disengagement. You might ask 'Am I boring you?' or change topics."
    },
    {
      dialogue: [
        { speaker: 'Grandma', text: "Back in my day, we used to walk to school uphill...", isClue: false },
        { speaker: 'Grandma', text: "...and we loved every minute of it!", isClue: false },
        { speaker: null, text: "[Grandma chuckles and shakes her head fondly]", isClue: true, cueType: "story_end" },
      ],
      question: "Grandma chuckled and shook her head. What should you do?",
      options: ["Interrupt with your own story", "Respond — she's finished and waiting for your reaction", "Correct her exaggeration"],
      correct: 1,
      explanation: "A chuckle and head shake at the end signals she's done. A warm response like 'That's funny, Grandma!' is appropriate."
    },
    {
      dialogue: [
        { speaker: 'Two friends', text: "[Two friends are having a private conversation, leaning close]", isClue: false },
        { speaker: null, text: "[They haven't noticed you approaching]", isClue: true, cueType: "private" },
      ],
      question: "You want to join the conversation. What should you do?",
      options: ["Jump right in and start talking", "Wait for a pause, then say 'Hey, can I join?'", "Listen secretly without them knowing"],
      correct: 1,
      explanation: "Waiting for a natural pause and asking to join is the polite way to enter a conversation."
    },
    {
      dialogue: [
        { speaker: 'Presenter', text: "And that concludes my presentation.", isClue: false },
        { speaker: 'Presenter', text: "I'll now take questions.", isClue: true, cueType: "q_and_a" },
      ],
      question: "When should you raise your hand?",
      options: ["Now — they said they'll take questions", "After everyone else has asked", "Never — asking questions is rude"],
      correct: 0,
      explanation: "'I'll now take questions' is a clear verbal cue inviting audience participation."
    },
    {
      dialogue: [
        { speaker: 'Sister', text: "Guess what happened today!", isClue: false },
        { speaker: null, text: "[Sister bounces excitedly, eyes wide]", isClue: true, cueType: "invitation" },
      ],
      question: "Your sister said 'Guess what!' and looks excited. What do you say?",
      options: ["'I don't care'", "'What happened?!'", "'Not now, I'm busy'"],
      correct: 1,
      explanation: "'Guess what!' with excited body language is an invitation — the expected response is to ask what happened."
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
    {
      scenario: "You arrive at a birthday party and the birthday kid opens the door.",
      question: "What should you say?",
      options: ["Walk in without saying anything", "'Happy birthday! Thanks for inviting me!'", "'Where's the cake?'"],
      correct: 1,
      explanation: "Wishing them happy birthday and thanking them shows you're grateful for the invitation."
    },
    {
      scenario: "You visit the doctor and the receptionist looks up as you approach.",
      question: "What do you say?",
      options: ["'Hi, I have an appointment at 3 with Dr. Lee.'", "Stand silently until they talk first", "'I'm here. Hurry up.'"],
      correct: 0,
      explanation: "A polite greeting plus your purpose (appointment info) is efficient and respectful."
    },
    {
      scenario: "You see a friend crying on the playground.",
      question: "How should you approach them?",
      options: ["'What's wrong with you?'", "Gently say 'Hey, are you okay? Do you want to talk?'", "Ignore them — it's private"],
      correct: 1,
      explanation: "A gentle, concerned approach lets them know you care without being intrusive."
    },
    {
      scenario: "You're video-calling your grandparents who live far away.",
      question: "What's a good way to start?",
      options: ["'Hey Grandma, hey Grandpa! I miss you! How are you?'", "'Can we keep this short?'", "Start talking about yourself immediately"],
      correct: 0,
      explanation: "Expressing that you miss them and asking how they are shows warmth across the distance."
    },
    {
      scenario: "You enter a store and a shop assistant says 'Can I help you?'",
      question: "What should you say?",
      options: ["Ignore them completely", "'No thanks, just looking' or 'Yes, I need help finding...'", "Walk past faster"],
      correct: 1,
      explanation: "Acknowledging their offer with a polite reply is the right social response."
    },
    {
      scenario: "A friend introduces you to their parent for the first time.",
      question: "What's appropriate?",
      options: ["'Nice to meet you, Mrs. Garcia!'", "'Sup'", "Just nod without speaking"],
      correct: 0,
      explanation: "Using their name and 'Nice to meet you' shows respect when meeting adults for the first time."
    },
    {
      scenario: "You're leaving a friend's house after a playdate.",
      question: "What should you say?",
      options: ["Just walk out", "'Thanks for having me! See you at school!'", "'Finally, I can go home'"],
      correct: 1,
      explanation: "Thanking them for hosting shows gratitude and good manners."
    },
    {
      scenario: "You pass a school janitor in the hallway who smiles at you.",
      question: "What do you do?",
      options: ["Smile back and say 'Hi!'", "Look at the ground", "They're not important enough to greet"],
      correct: 0,
      explanation: "Everyone deserves a friendly acknowledgment. A smile and 'Hi' is respectful."
    },
    {
      scenario: "You arrive late to class and the teacher is already talking.",
      question: "What do you say?",
      options: ["Nothing — just sneak to your seat", "Quietly say 'Sorry I'm late' as you enter", "Loudly announce why you're late"],
      correct: 1,
      explanation: "A brief, quiet apology acknowledges the disruption without drawing too much attention."
    },
    {
      scenario: "You run into a classmate you don't know well at the grocery store.",
      question: "What's appropriate?",
      options: ["A smile and quick 'Hey!' then keep shopping", "Hide behind the shelves", "Stop them for a long chat about school"],
      correct: 0,
      explanation: "A brief acknowledgment matches the casual, unexpected context of the encounter."
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
    {
      scenario: "Your sibling took your favorite shirt without asking. You're upset.",
      question: "What's the best way to handle this?",
      options: [
        "Take something of theirs as revenge",
        "Calmly say: 'I feel upset when you take my things without asking. Please ask next time.'",
        "Scream at them until they give it back"
      ],
      correct: 1,
      explanation: "Using 'I feel...' statements expresses your emotions without attacking the other person."
    },
    {
      scenario: "During a board game, you catch a friend cheating. Others haven't noticed.",
      question: "What should you do?",
      options: [
        "Flip the board over in anger",
        "Quietly say 'Hey, I think you made an extra move — let's redo that turn'",
        "Cheat too to make it fair"
      ],
      correct: 1,
      explanation: "Addressing it calmly and privately gives them a chance to correct it without embarrassment."
    },
    {
      scenario: "You're working in a group and someone keeps talking over you every time you try to speak.",
      question: "What's a good approach?",
      options: [
        "Give up and stay silent",
        "Wait for a pause, then say 'I'd like to finish my thought'",
        "Start shouting over them"
      ],
      correct: 1,
      explanation: "Politely asserting your right to speak teaches others to respect turn-taking."
    },
    {
      scenario: "A friend shared a secret you told them. Now others know.",
      question: "How should you handle your feelings?",
      options: [
        "Spread one of their secrets as payback",
        "Tell your friend privately that you're hurt they shared your secret",
        "Post about it online for everyone to see"
      ],
      correct: 1,
      explanation: "Addressing the betrayal privately and honestly is the healthiest approach to conflict."
    },
    {
      scenario: "Someone makes fun of your drawing in art class. Other kids laugh.",
      question: "What's the best response?",
      options: [
        "Tear up their drawing",
        "Say 'I'm proud of my work. It's not okay to make fun of people's art.'",
        "Never draw again"
      ],
      correct: 1,
      explanation: "Standing up for yourself calmly sets a boundary without escalating the conflict."
    },
    {
      scenario: "Your friend cancels plans at the last minute — for the third time this month.",
      question: "How do you handle this?",
      options: [
        "Never make plans with them again without explanation",
        "Say 'When you cancel last-minute, I feel disappointed. Can we find times that work better?'",
        "Cancel on them next time as payback"
      ],
      correct: 1,
      explanation: "Expressing your feelings and suggesting a solution addresses the pattern constructively."
    },
    {
      scenario: "You accidentally step on someone's foot in a crowded hallway. They look angry.",
      question: "What should you do?",
      options: [
        "Keep walking — accidents happen",
        "Say 'Oh, I'm so sorry! Are you okay?'",
        "Tell them it's their fault for standing there"
      ],
      correct: 1,
      explanation: "A quick, sincere apology and concern for them defuses the situation immediately."
    },
    {
      scenario: "Two friends both want you to sit with them at lunch, but they're at different tables.",
      question: "What's a fair solution?",
      options: [
        "Sit with the more popular one",
        "Suggest they all sit together, or alternate days",
        "Skip lunch to avoid choosing"
      ],
      correct: 1,
      explanation: "Proposing an inclusive solution or taking turns keeps both friendships healthy."
    },
    {
      scenario: "Your teammate blames you for losing the game, even though it was a team effort.",
      question: "How do you respond?",
      options: [
        "Blame them back — they made mistakes too",
        "Say 'We all tried our best. Let's figure out how to improve together next time.'",
        "Quit the team"
      ],
      correct: 1,
      explanation: "Redirecting blame to teamwork and growth keeps the relationship constructive."
    },
    {
      scenario: "You see two classmates arguing loudly. One of them is your friend.",
      question: "What should you do?",
      options: [
        "Take your friend's side immediately",
        "Wait for things to calm down, then check in: 'Is everything okay? Need help working it out?'",
        "Record it on your phone"
      ],
      correct: 1,
      explanation: "Offering to help mediate after tensions cool is more effective than jumping in during the heat."
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

  // Counterbalance answer positions to prevent response bias
  const shuffleOptions = (scenario) => {
    const indices = scenario.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {
      ...scenario,
      options: indices.map(i => scenario.options[i]),
      correct: indices.indexOf(scenario.correct),
    };
  };

  useEffect(() => {
    const pool = SCENARIOS[skillFocus] || SCENARIOS.turn_taking;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numScenarios, shuffled.length));
    setScenarios(selected.map(shuffleOptions));
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
        { metric_name: 'social_cue_accuracy', metric_value: Math.round(accuracy * 100) / 100 },
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
