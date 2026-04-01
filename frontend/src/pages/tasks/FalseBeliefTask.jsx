/**
 * False Belief / Theory of Mind Task
 * 
 * Medical paradigm: Theory of Mind and Perspective Taking
 * Uses gamified False Belief scenarios (Sally-Anne, Diverse Desires, Knowledge Access)
 * Key metric: Logical consistency score
 * Tracks: Accuracy, response time, mental state understanding
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const SCENARIOS = {
  diverse_desires: [
    {
      story: "Maya and Liam are at a snack table. There are cookies and carrots. You love cookies the most!",
      question: "Maya says she prefers carrots over cookies. If Maya goes to get a snack, what will she choose?",
      options: ["Cookies", "Carrots"],
      correct: 1,
      explanation: "Even though YOU prefer cookies, Maya prefers carrots. She will choose what SHE likes.",
      characters: "🧑‍🦰 Maya  |  🧑 Liam"
    },
    {
      story: "At a toy store, there's a teddy bear and a robot. Carlos loves robots. You think teddy bears are the best!",
      question: "What toy will Carlos want to buy?",
      options: ["Teddy bear", "Robot"],
      correct: 1,
      explanation: "Carlos likes robots, even though you prefer teddy bears. He'll choose what HE wants.",
      characters: "👦 Carlos"
    },
    {
      story: "It's movie night! There's an action movie and a comedy. Priya always picks comedies.",
      question: "If Priya gets to choose the movie, what will she pick?",
      options: ["Action movie", "Comedy"],
      correct: 1,
      explanation: "Priya prefers comedies, so she'll choose a comedy regardless of what you'd prefer.",
      characters: "👧 Priya"
    },
    {
      story: "At the ice cream truck, they have chocolate and strawberry. Nour always gets strawberry.",
      question: "You buy chocolate ice cream. What will Nour buy?",
      options: ["Chocolate (same as you)", "Strawberry (her favorite)"],
      correct: 1,
      explanation: "Nour has her own preference for strawberry. She doesn't have to pick the same as you.",
      characters: "👩 Nour"
    },
    {
      story: "The art teacher asks everyone to draw their favorite animal. Jake loves drawing dolphins.",
      question: "What will Jake draw?",
      options: ["Whatever you would draw", "A dolphin"],
      correct: 1,
      explanation: "Jake will draw his own favorite animal, not yours.",
      characters: "🧒 Jake"
    },
    {
      story: "At the park, there's a swing and a slide. Emma runs straight to the slide every time.",
      question: "When Emma arrives at the park, where will she go first?",
      options: ["The swing", "The slide"],
      correct: 1,
      explanation: "Emma always goes to the slide first because that's her preference.",
      characters: "👧 Emma"
    }
  ],
  knowledge_access: [
    {
      story: "There's a box on the table. You open it and see a toy car inside. Sam hasn't seen inside the box.",
      question: "Does Sam know what's inside the box?",
      options: ["Yes, he knows", "No, he doesn't know"],
      correct: 1,
      explanation: "Sam hasn't looked inside the box, so he doesn't know what's there, even though YOU know.",
      characters: "🧑 Sam"
    },
    {
      story: "Mom put a surprise gift in the drawer. Only you saw where she put it. Your sister just came home from school.",
      question: "Does your sister know where the gift is?",
      options: ["Yes, she knows", "No, she doesn't know"],
      correct: 1,
      explanation: "Your sister wasn't there when Mom hid the gift, so she doesn't know its location.",
      characters: "👩 Mom  |  👧 Sister"
    },
    {
      story: "The teacher wrote the homework on the board after Kai left early. You stayed and copied it down.",
      question: "Does Kai know what the homework is?",
      options: ["Yes", "No"],
      correct: 1,
      explanation: "Kai left before the homework was written, so he doesn't know what it is.",
      characters: "👦 Kai"
    },
    {
      story: "A new student, Zara, joins the class today. She's never been to your school before.",
      question: "Does Zara know where the cafeteria is?",
      options: ["Yes, everyone knows", "No, she's never been here"],
      correct: 1,
      explanation: "Zara is new and hasn't learned the school layout yet.",
      characters: "👩 Zara"
    },
    {
      story: "You watched a magic show and saw how the trick works. Your friend Alex wasn't there.",
      question: "Does Alex know how the magic trick works?",
      options: ["Yes", "No"],
      correct: 1,
      explanation: "Alex wasn't at the show, so he doesn't have the knowledge you gained.",
      characters: "🧑 Alex"
    },
    {
      story: "In the kitchen, Dad's baking cookies. The recipe is a family secret that only Dad and Grandma know.",
      question: "Does your neighbor know the secret recipe?",
      options: ["Yes", "No, only Dad and Grandma know"],
      correct: 1,
      explanation: "The recipe is only known to Dad and Grandma – outsiders don't have access to it.",
      characters: "👨 Dad  |  👵 Grandma"
    }
  ],
  location_change: [
    {
      story: "Sally puts her marble in the basket, then goes outside to play. While Sally is away, Anne takes the marble and puts it in the box. Now Sally comes back.",
      question: "Where will Sally look for her marble?",
      options: ["In the basket (where she left it)", "In the box (where it actually is)"],
      correct: 0,
      explanation: "Sally didn't see Anne move the marble. She still believes it's in the basket where she left it.",
      characters: "👧 Sally  |  👩 Anne"
    },
    {
      story: "Max hides his snack in the red cupboard and goes to wash his hands. His brother moves the snack to the blue cupboard. Max returns.",
      question: "Where will Max look for his snack first?",
      options: ["Red cupboard (where he put it)", "Blue cupboard (where it is now)"],
      correct: 0,
      explanation: "Max doesn't know his brother moved the snack. He'll check where he originally put it.",
      characters: "🧒 Max  |  👦 Brother"
    },
    {
      story: "Lily puts her book on the shelf before lunch. During lunch, the librarian moves it to the return cart. Lily comes back after lunch.",
      question: "Where does Lily think her book is?",
      options: ["On the shelf", "On the return cart"],
      correct: 0,
      explanation: "Lily doesn't know the librarian moved her book. She believes it's still on the shelf.",
      characters: "👧 Lily  |  📚 Librarian"
    },
    {
      story: "Dad parks the car in spot A and goes into the store. Mom moves the car to spot B while shopping. Dad comes out of the store.",
      question: "Where will Dad walk to find the car?",
      options: ["Spot A (where he parked)", "Spot B (where it actually is)"],
      correct: 0,
      explanation: "Dad doesn't know Mom moved the car. He'll go to where he remembers parking.",
      characters: "👨 Dad  |  👩 Mom"
    },
    {
      story: "Rosa plants a flower in pot 1. While she's at school, Grandpa replants it in pot 3. Rosa comes home.",
      question: "Which pot will Rosa water first?",
      options: ["Pot 1 (where she planted it)", "Pot 3 (where it is now)"],
      correct: 0,
      explanation: "Rosa believes her flower is still in pot 1 because she didn't see Grandpa move it.",
      characters: "👧 Rosa  |  👴 Grandpa"
    },
    {
      story: "Tom leaves his backpack by the front door. His sister puts it in his room while he's eating dinner. Tom finishes dinner.",
      question: "Where will Tom go to get his backpack?",
      options: ["Front door (where he left it)", "His room (where it actually is)"],
      correct: 0,
      explanation: "Tom doesn't know his sister moved his backpack. He'll look at the front door first.",
      characters: "🧒 Tom  |  👧 Sister"
    }
  ]
};

function FalseBeliefTask({ config, onComplete }) {
  const scenarioType = config.scenario_type || 'diverse_desires';
  const totalScenarios = config.total_scenarios || 6;
  const timeLimit = config.time_limit_per_scenario || 60;

  const [scenarios, setScenarios] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [phase, setPhase] = useState('story'); // story, question, feedback
  const [trialStartTime, setTrialStartTime] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const pool = SCENARIOS[scenarioType] || SCENARIOS.diverse_desires;
    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setScenarios(shuffled.slice(0, Math.min(totalScenarios, shuffled.length)));
    setTrialStartTime(Date.now());
  }, []);

  // Completion
  useEffect(() => {
    if (currentIndex >= scenarios.length && scenarios.length > 0 && phase !== 'done') {
      setPhase('done');
      let correct = 0;
      const rts = [];

      responses.forEach(resp => {
        if (resp.correct) correct++;
        if (resp.rt) rts.push(resp.rt);
      });

      const accuracy = scenarios.length > 0 ? (correct / scenarios.length) * 100 : 0;
      const avgRT = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;

      // Logical consistency: percentage of scenarios where user correctly
      // attributed mental state distinct from their own knowledge
      const consistencyScore = accuracy;

      onComplete([
        { metric_name: 'logical_consistency_score', metric_value: Math.round(consistencyScore * 100) / 100 },
        { metric_name: 'accuracy', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'avg_response_time', metric_value: Math.round(avgRT) },
        { metric_name: 'mental_state_understanding', metric_value: Math.round(accuracy * 100) / 100 },
      ]);
    }
  }, [currentIndex, scenarios.length, phase]);

  const handleAnswer = (optionIndex) => {
    if (phase !== 'question') return;
    const scenario = scenarios[currentIndex];
    const rt = Date.now() - trialStartTime;
    const isCorrect = optionIndex === scenario.correct;
    
    setSelected(optionIndex);
    setResponses(prev => [...prev, { answer: optionIndex, correct: isCorrect, rt }]);
    setPhase('feedback');
  };

  const handleNext = () => {
    setSelected(null);
    setCurrentIndex(prev => prev + 1);
    setPhase('story');
    setTrialStartTime(Date.now());
  };

  const progress = scenarios.length > 0 ? (currentIndex / scenarios.length) * 100 : 0;
  const currentScenario = scenarios[currentIndex];

  if (!currentScenario && phase !== 'done') return <div className="task-arena">Preparing scenarios...</div>;

  return (
    <div className="task-arena false-belief-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">Scenario {Math.min(currentIndex + 1, scenarios.length)} / {scenarios.length}</div>

      {currentScenario && (
        <div className="fb-content">
          <div className="fb-characters">{currentScenario.characters}</div>
          
          <div className="fb-story">
            <p>{currentScenario.story}</p>
          </div>

          {phase === 'story' && (
            <button className="btn btn-primary fb-continue" onClick={() => setPhase('question')}>
              I understand — Show Question
            </button>
          )}

          {(phase === 'question' || phase === 'feedback') && (
            <div className="fb-question-area">
              <div className="fb-question">{currentScenario.question}</div>
              <div className="fb-options">
                {currentScenario.options.map((opt, idx) => (
                  <button
                    key={idx}
                    className={`fb-option ${
                      phase === 'feedback' && idx === currentScenario.correct ? 'correct' : ''
                    } ${
                      phase === 'feedback' && selected === idx && idx !== currentScenario.correct ? 'wrong' : ''
                    }`}
                    onClick={() => handleAnswer(idx)}
                    disabled={phase === 'feedback'}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'feedback' && (
            <div className="fb-feedback">
              <div className={`fb-result ${selected === currentScenario.correct ? 'correct' : 'incorrect'}`}>
                {selected === currentScenario.correct ? '✅ Correct!' : '❌ Not quite'}
              </div>
              <p className="fb-explanation">{currentScenario.explanation}</p>
              <button className="btn btn-primary fb-next" onClick={handleNext}>
                Next Scenario
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FalseBeliefTask;
