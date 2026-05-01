import React, { useState, useEffect } from 'react';

/* ───────────────────────────────────────────────────────────────────────────
   FALSE BELIEF TASK – Theory of Mind Assessment
   16 unique scenarios per category (48 total) to avoid repetition across
   multiple test administrations.
   ─────────────────────────────────────────────────────────────────────────── */

const SCENARIOS = {
  diverse_desires: [
    { story: "Maya and Liam are at a snack table. There are cookies and carrots. You love cookies the most!", question: "Maya says she prefers carrots over cookies. If Maya goes to get a snack, what will she choose?", options: ["Cookies", "Carrots"], correct: 1, explanation: "Even though YOU prefer cookies, Maya prefers carrots. She will choose what SHE likes.", characters: "🧑‍🦰 Maya  |  🧑 Liam" },
    { story: "At a toy store, there's a teddy bear and a robot. Carlos loves robots. You think teddy bears are the best!", question: "What toy will Carlos want to buy?", options: ["Teddy bear", "Robot"], correct: 1, explanation: "Carlos likes robots, even though you prefer teddy bears. He'll choose what HE wants.", characters: "👦 Carlos" },
    { story: "It's movie night! There's an action movie and a comedy. Priya always picks comedies.", question: "If Priya gets to choose the movie, what will she pick?", options: ["Action movie", "Comedy"], correct: 1, explanation: "Priya prefers comedies, so she'll choose a comedy regardless of what you'd prefer.", characters: "👧 Priya" },
    { story: "At the ice cream truck, they have chocolate and strawberry. Nour always gets strawberry.", question: "You buy chocolate ice cream. What will Nour buy?", options: ["Chocolate (same as you)", "Strawberry (her favorite)"], correct: 1, explanation: "Nour has her own preference for strawberry.", characters: "👩 Nour" },
    { story: "The art teacher asks everyone to draw their favorite animal. Jake loves drawing dolphins.", question: "What will Jake draw?", options: ["Whatever you would draw", "A dolphin"], correct: 1, explanation: "Jake will draw his own favorite animal, not yours.", characters: "🧒 Jake" },
    { story: "At the park, there's a swing and a slide. Emma runs straight to the slide every time.", question: "When Emma arrives at the park, where will she go first?", options: ["The swing", "The slide"], correct: 1, explanation: "Emma always goes to the slide first because that's her preference.", characters: "👧 Emma" },
    { story: "For breakfast there are pancakes and toast. You love pancakes! But Omar always chooses toast with jam.", question: "What will Omar choose for breakfast?", options: ["Pancakes (like you)", "Toast with jam"], correct: 1, explanation: "Omar has his own preference for toast. People choose based on their OWN likes.", characters: "👦 Omar" },
    { story: "The music teacher lets students pick an instrument. Aisha always picks the drums. You prefer piano.", question: "Which instrument will Aisha choose?", options: ["Piano", "Drums"], correct: 1, explanation: "Aisha consistently picks drums — she doesn't need to pick the same as you.", characters: "👧 Aisha" },
    { story: "It's raining outside. You want to stay inside. But Leo loves jumping in puddles.", question: "Leo looks outside. What will he want to do?", options: ["Stay inside (like you)", "Go jump in puddles"], correct: 1, explanation: "Leo enjoys rain and puddles — his desires are different from yours.", characters: "🧒 Leo" },
    { story: "At the library, there are animal books and space books. You love space! But Mia always picks animal stories.", question: "Which section will Mia go to?", options: ["Space books", "Animal books"], correct: 1, explanation: "Mia's interest is in animals, not space. Her preference guides her choice.", characters: "👧 Mia" },
    { story: "The cafe has orange juice and apple juice. You hate orange juice. But Ravi orders orange juice every time.", question: "What will Ravi order today?", options: ["Apple juice (what you'd pick)", "Orange juice (what he always gets)"], correct: 1, explanation: "Ravi consistently orders OJ. Your dislike doesn't affect his choice.", characters: "🧑 Ravi" },
    { story: "There's soccer and basketball at recess. You're on the soccer team. Fatima plays basketball every day.", question: "When Fatima goes to recess, what will she play?", options: ["Soccer (your sport)", "Basketball (her sport)"], correct: 1, explanation: "Fatima chooses basketball based on her own preference.", characters: "👧 Fatima" },
    { story: "Dad asks if you want to go hiking or swimming. You pick swimming! But your cousin Tyler always picks hiking.", question: "If Tyler is asked the same question, what will he choose?", options: ["Swimming", "Hiking"], correct: 1, explanation: "Tyler's preference is hiking — he decides for himself.", characters: "🧒 Tyler" },
    { story: "At the book fair, there are comic books and mystery novels. You grab a comic. Suki heads straight for mysteries.", question: "What type of book will Suki buy?", options: ["Comic book", "Mystery novel"], correct: 1, explanation: "Suki prefers mystery novels. She makes her own choice.", characters: "👩 Suki" },
    { story: "The pizza shop has pepperoni and veggie pizza. You always pick pepperoni. But Diana is vegetarian.", question: "Which pizza will Diana order?", options: ["Pepperoni (like you)", "Veggie pizza"], correct: 1, explanation: "Diana is vegetarian and will pick based on her own dietary needs.", characters: "👧 Diana" },
    { story: "There are two paths in the park — a short sunny one and a long shady one. You take the short one. Grandma always takes the shady path because she doesn't like sun.", question: "Which path will Grandma take?", options: ["Short sunny path", "Long shady path"], correct: 1, explanation: "Grandma prefers shade, so she'll pick the shady path regardless of your choice.", characters: "👵 Grandma" },
  ],
  knowledge_access: [
    { story: "There's a box on the table. You open it and see a toy car inside. Sam hasn't seen inside the box.", question: "Does Sam know what's inside the box?", options: ["Yes, he knows", "No, he doesn't know"], correct: 1, explanation: "Sam hasn't looked inside the box, so he doesn't know what's there.", characters: "🧑 Sam" },
    { story: "Mom put a surprise gift in the drawer. Only you saw where she put it. Your sister just came home from school.", question: "Does your sister know where the gift is?", options: ["Yes, she knows", "No, she doesn't know"], correct: 1, explanation: "Your sister wasn't there when Mom hid the gift.", characters: "👩 Mom  |  👧 Sister" },
    { story: "The teacher wrote the homework on the board after Kai left early. You stayed and copied it down.", question: "Does Kai know what the homework is?", options: ["Yes", "No"], correct: 1, explanation: "Kai left before the homework was written.", characters: "👦 Kai" },
    { story: "A new student, Zara, joins the class today. She's never been to your school before.", question: "Does Zara know where the cafeteria is?", options: ["Yes, everyone knows", "No, she's never been here"], correct: 1, explanation: "Zara is new and hasn't learned the school layout yet.", characters: "👩 Zara" },
    { story: "You watched a magic show and saw how the trick works. Your friend Alex wasn't there.", question: "Does Alex know how the magic trick works?", options: ["Yes", "No"], correct: 1, explanation: "Alex wasn't at the show, so he doesn't have the knowledge you gained.", characters: "🧑 Alex" },
    { story: "In the kitchen, Dad's baking cookies. The recipe is a family secret that only Dad and Grandma know.", question: "Does your neighbor know the secret recipe?", options: ["Yes", "No, only Dad and Grandma know"], correct: 1, explanation: "The recipe is only known to Dad and Grandma.", characters: "👨 Dad  |  👵 Grandma" },
    { story: "You peeked in the closet and saw your birthday present — a skateboard! Your best friend Ben hasn't been to your house.", question: "Does Ben know what your birthday present is?", options: ["Yes", "No"], correct: 1, explanation: "Ben has never been to your house and never saw inside the closet.", characters: "👦 Ben" },
    { story: "The school canceled tomorrow's field trip due to weather. The announcement was made after Layla went home sick.", question: "Does Layla know the trip is canceled?", options: ["Yes, she heard the announcement", "No, she left before it was announced"], correct: 1, explanation: "Layla was already gone when the announcement was made.", characters: "👧 Layla" },
    { story: "You found a hidden path in the woods behind your house. Nobody else has explored there.", question: "Does your classmate Marcus know about the hidden path?", options: ["Yes", "No, only you know"], correct: 1, explanation: "You discovered it alone — Marcus has no way of knowing.", characters: "🧑 Marcus" },
    { story: "Aunt Sarah sent a letter saying she's visiting next week. Only Mom read the letter so far.", question: "Does Dad know Aunt Sarah is coming?", options: ["Yes", "No, he hasn't read the letter"], correct: 1, explanation: "Dad hasn't read the letter yet, so he doesn't know.", characters: "👩 Mom  |  👨 Dad" },
    { story: "You learned in science class today that butterflies taste with their feet. Your little brother is only 3.", question: "Does your little brother know that butterflies taste with their feet?", options: ["Yes, everyone knows that", "No, he's too young and hasn't learned this"], correct: 1, explanation: "A 3-year-old wouldn't have learned this scientific fact.", characters: "👶 Brother" },
    { story: "The password to the treehouse was changed yesterday. Only you and Maya were there when it was changed. Ryan was at soccer practice.", question: "Does Ryan know the new password?", options: ["Yes", "No, he wasn't there when it changed"], correct: 1, explanation: "Ryan was at soccer practice and missed the password change.", characters: "🧒 Ryan" },
    { story: "You and your friend Jin saw a shooting star last night. Your other friend Tara was already asleep.", question: "Does Tara know there was a shooting star?", options: ["Yes", "No"], correct: 1, explanation: "Tara was asleep and couldn't have seen or known about it.", characters: "👧 Tara" },
    { story: "The ice cream truck changed its schedule to come on Wednesdays instead of Fridays. You heard the driver say so. Your neighbor was inside.", question: "Does your neighbor know the new schedule?", options: ["Yes", "No, she was inside and didn't hear"], correct: 1, explanation: "Your neighbor was inside and didn't hear the announcement.", characters: "👩 Neighbor" },
    { story: "You read a sign at the park saying the playground is closed tomorrow for repairs. Your friend Chris hasn't been to the park today.", question: "Does Chris know the playground will be closed?", options: ["Yes", "No, he hasn't seen the sign"], correct: 1, explanation: "Chris hasn't been to the park so he hasn't seen the notice.", characters: "👦 Chris" },
    { story: "During hide and seek, you saw where everyone hid. Your friend Meera just arrived and didn't see anyone hide.", question: "Does Meera know where everyone is hiding?", options: ["Yes", "No, she just arrived"], correct: 1, explanation: "Meera just got there and didn't see anyone hide.", characters: "👧 Meera" },
  ],
  location_change: [
    { story: "Sally puts her marble in the basket, then goes outside to play. While Sally is away, Anne takes the marble and puts it in the box. Now Sally comes back.", question: "Where will Sally look for her marble?", options: ["In the basket (where she left it)", "In the box (where it actually is)"], correct: 0, explanation: "Sally didn't see Anne move the marble. She still believes it's in the basket.", characters: "👧 Sally  |  👩 Anne" },
    { story: "Max hides his snack in the red cupboard and goes to wash his hands. His brother moves the snack to the blue cupboard. Max returns.", question: "Where will Max look for his snack first?", options: ["Red cupboard (where he put it)", "Blue cupboard (where it is now)"], correct: 0, explanation: "Max doesn't know his brother moved the snack.", characters: "🧒 Max  |  👦 Brother" },
    { story: "Lily puts her book on the shelf before lunch. During lunch, the librarian moves it to the return cart. Lily comes back after lunch.", question: "Where does Lily think her book is?", options: ["On the shelf", "On the return cart"], correct: 0, explanation: "Lily doesn't know the librarian moved her book.", characters: "👧 Lily  |  📚 Librarian" },
    { story: "Dad parks the car in spot A and goes into the store. Mom moves the car to spot B while shopping. Dad comes out of the store.", question: "Where will Dad walk to find the car?", options: ["Spot A (where he parked)", "Spot B (where it actually is)"], correct: 0, explanation: "Dad doesn't know Mom moved the car.", characters: "👨 Dad  |  👩 Mom" },
    { story: "Rosa plants a flower in pot 1. While she's at school, Grandpa replants it in pot 3. Rosa comes home.", question: "Which pot will Rosa water first?", options: ["Pot 1 (where she planted it)", "Pot 3 (where it is now)"], correct: 0, explanation: "Rosa believes her flower is still in pot 1.", characters: "👧 Rosa  |  👴 Grandpa" },
    { story: "Tom leaves his backpack by the front door. His sister puts it in his room while he's eating dinner. Tom finishes dinner.", question: "Where will Tom go to get his backpack?", options: ["Front door (where he left it)", "His room (where it actually is)"], correct: 0, explanation: "Tom doesn't know his sister moved his backpack.", characters: "🧒 Tom  |  👧 Sister" },
    { story: "Amir puts his pencil case in his desk and goes to art class. The cleaner moves it to the lost-and-found bin. Amir comes back.", question: "Where will Amir look for his pencil case?", options: ["In his desk", "In the lost-and-found bin"], correct: 0, explanation: "Amir didn't see the cleaner move it — he thinks it's still in his desk.", characters: "👦 Amir  |  🧹 Cleaner" },
    { story: "Ellie leaves her umbrella by the coat rack. While she's in class, the janitor puts all umbrellas in the umbrella stand. Ellie comes for her umbrella.", question: "Where will Ellie look first?", options: ["By the coat rack", "In the umbrella stand"], correct: 0, explanation: "Ellie doesn't know umbrellas were moved.", characters: "👧 Ellie  |  👨 Janitor" },
    { story: "Noah puts his lunch in the fridge at work and goes to a meeting. His coworker accidentally takes it thinking it's theirs. Noah comes back hungry.", question: "Where will Noah look for his lunch?", options: ["In the fridge", "In his coworker's bag"], correct: 0, explanation: "Noah still believes his lunch is where he left it.", characters: "👨 Noah  |  👩 Coworker" },
    { story: "Chloe parks her bicycle at rack A near the entrance. While she's in the library, a security guard moves all bikes to rack B around back. Chloe exits the library.", question: "Where will Chloe go to find her bike?", options: ["Rack A by the entrance", "Rack B around back"], correct: 0, explanation: "Chloe wasn't informed about bikes being moved.", characters: "👧 Chloe  |  👮 Guard" },
    { story: "Yuki puts her cat's toy under the sofa and leaves for school. Her mom vacuums and puts the toy on the shelf. Yuki comes home.", question: "Where will Yuki look for the cat's toy?", options: ["Under the sofa", "On the shelf"], correct: 0, explanation: "Yuki thinks the toy is still under the sofa.", characters: "👧 Yuki  |  👩 Mom" },
    { story: "Oscar stores his secret treasure map in the hollow tree. While he's at camp, rain washes it away. Oscar returns to the tree.", question: "Does Oscar think the map is still there?", options: ["Yes, he'll look in the tree", "No, he knows rain took it"], correct: 0, explanation: "Oscar wasn't there during the rain — he still expects to find it.", characters: "🧒 Oscar" },
    { story: "Hana puts her art project on the drying rack and goes to recess. The art teacher moves all projects to storage. Hana returns after recess.", question: "Where will Hana go to find her project?", options: ["The drying rack", "Storage"], correct: 0, explanation: "Hana doesn't know the teacher moved the projects.", characters: "👧 Hana  |  👩‍🎨 Teacher" },
    { story: "Daniel leaves his shoes by the pool and goes swimming. The lifeguard puts all loose items in a bin for safety. Daniel finishes swimming.", question: "Where will Daniel look for his shoes?", options: ["By the pool where he left them", "In the safety bin"], correct: 0, explanation: "Daniel didn't hear the lifeguard's action — he expects shoes by the pool.", characters: "👦 Daniel  |  🏊 Lifeguard" },
    { story: "Sophia hides Easter eggs in the garden, then goes to get her camera. While she's gone, the dog digs up three eggs and brings them to the porch. Sophia returns.", question: "Where does Sophia think the eggs are?", options: ["Still in the garden", "On the porch"], correct: 0, explanation: "Sophia didn't see the dog dig them up.", characters: "👧 Sophia  |  🐕 Dog" },
    { story: "Luca puts his finished puzzle on the table to show Dad later. His toddler sister knocks the pieces onto the floor while Luca is in the bathroom. Luca comes back.", question: "What does Luca expect to see on the table?", options: ["His completed puzzle", "Scattered pieces on the floor"], correct: 0, explanation: "Luca doesn't know his sister knocked it over.", characters: "👦 Luca  |  👶 Sister" },
  ]
};

/* ─────────────────────────────────────────────────────────────────────────── */

function FalseBeliefTask({ config = {}, onComplete }) {
  const scenarioType = config.scenario_type || 'location_change';
  const totalScenarios = config.num_scenarios || 6;

  const [scenarios, setScenarios] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('story'); // story | question | feedback | done
  const [responses, setResponses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [trialStartTime, setTrialStartTime] = useState(Date.now());

  // Fisher-Yates shuffle for answer options
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
      _originalOrder: indices,
    };
  };

  useEffect(() => {
    const pool = SCENARIOS[scenarioType] || SCENARIOS.diverse_desires;
    // Shuffle scenarios and randomize answer positions
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(totalScenarios, shuffled.length));
    setScenarios(selected.map(shuffleOptions));
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
        { metric_name: 'accuracy', metric_value: Math.round(accuracy * 100) / 100 },
        { metric_name: 'avg_response_time', metric_value: Math.round(avgRT) },
        { metric_name: 'mental_state_understanding', metric_value: Math.round(consistencyScore * 100) / 100 },
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
