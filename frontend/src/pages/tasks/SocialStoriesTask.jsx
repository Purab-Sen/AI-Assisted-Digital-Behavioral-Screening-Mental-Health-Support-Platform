/**
 * Social Stories Comprehension Task
 * 
 * Medical paradigm: Social narrative comprehension (Gray Sentence Ratio)
 * Maintains 2-5 descriptive/perspective sentences per directive sentence
 * Key metric: Comprehension assessment score
 * Difficulty: concrete routines → perspective focus → interactive resolution
 * 
 * 8 short, 6 medium, 4 long stories (18 total) for non-repetition.
 */
import { useState, useEffect, useCallback } from 'react';

const STORIES = {
  short: [
    {
      title: "Using Inside Voices",
      sentences: [
        { type: "descriptive", text: "When I am inside a building, there are other people around me." },
        { type: "perspective", text: "Some people might be reading, working, or having quiet conversations." },
        { type: "descriptive", text: "Loud sounds inside can echo off the walls and surprise people." },
        { type: "affirmative", text: "It is okay to talk — I just need to use a quieter voice." },
        { type: "descriptive", text: "An 'inside voice' is softer than an 'outside voice.'" },
        { type: "directive", text: "I will try to use my inside voice when I am in a building." },
        { type: "perspective", text: "Other people will feel comfortable when voices are calm and soft." },
      ],
      questions: [
        { q: "Why should you use an inside voice?", options: ["Because sounds echo and can surprise people", "Because talking is not allowed", "Because you might get in trouble"], correct: 0 },
        { q: "How do other people feel when you use a calm voice?", options: ["Sad", "Comfortable", "Scared"], correct: 1 },
      ]
    },
    {
      title: "Waiting in Line",
      sentences: [
        { type: "descriptive", text: "Sometimes at school or a store, I need to wait in a line." },
        { type: "descriptive", text: "A line is when people stand one behind the other and take turns." },
        { type: "perspective", text: "Everyone in the line is waiting for their turn, just like me." },
        { type: "affirmative", text: "Waiting can feel slow, but it helps things stay fair for everyone." },
        { type: "descriptive", text: "While waiting, I can think of something I enjoy or look around me." },
        { type: "directive", text: "I will try to wait patiently for my turn in line." },
        { type: "perspective", text: "When I wait my turn, people around me feel respected." },
      ],
      questions: [
        { q: "Why do people wait in lines?", options: ["It's a rule that makes no sense", "To keep things fair for everyone", "Because they like standing"], correct: 1 },
        { q: "What can you do while waiting?", options: ["Push ahead", "Think of something you enjoy", "Leave the line"], correct: 1 },
      ]
    },
    {
      title: "Greeting Someone",
      sentences: [
        { type: "descriptive", text: "When I meet someone, they often say 'hello' or wave." },
        { type: "descriptive", text: "A greeting is a way of noticing that someone is there." },
        { type: "perspective", text: "When someone greets me, they want me to know they see me." },
        { type: "affirmative", text: "I can greet people in different ways — a wave, a smile, or saying 'hi.'" },
        { type: "directive", text: "I will try to greet people when I see them." },
        { type: "perspective", text: "People feel happy when someone says hello to them." },
      ],
      questions: [
        { q: "What is a greeting?", options: ["A way to say goodbye", "A way of noticing someone is there", "A type of game"], correct: 1 },
        { q: "How do people feel when you greet them?", options: ["Annoyed", "Happy", "Confused"], correct: 1 },
      ]
    },
    {
      title: "Washing Hands",
      sentences: [
        { type: "descriptive", text: "My hands touch many things during the day — doors, toys, books." },
        { type: "descriptive", text: "Tiny germs can get on my hands, even if I can't see them." },
        { type: "perspective", text: "Washing hands keeps me and the people around me healthy." },
        { type: "descriptive", text: "I use soap and water, and wash for about 20 seconds." },
        { type: "affirmative", text: "Washing hands before eating and after the bathroom is a smart choice." },
        { type: "directive", text: "I will try to wash my hands at the right times." },
      ],
      questions: [
        { q: "Why should you wash your hands?", options: ["To make them wet", "To remove germs and stay healthy", "Because soap smells nice"], correct: 1 },
        { q: "When is it important to wash hands?", options: ["Only when they look dirty", "Before eating and after the bathroom", "Only at night"], correct: 1 },
      ]
    },
    {
      title: "Sharing Toys",
      sentences: [
        { type: "descriptive", text: "When I play with others, there are sometimes toys that everyone wants." },
        { type: "perspective", text: "Other children also get excited about fun toys." },
        { type: "descriptive", text: "Sharing means taking turns or letting someone else use something for a while." },
        { type: "affirmative", text: "It can feel hard to share, but it helps me keep my friendships." },
        { type: "directive", text: "I will try to share or take turns with toys when I play with others." },
        { type: "perspective", text: "Friends feel happy and included when I share with them." },
      ],
      questions: [
        { q: "What does sharing mean?", options: ["Giving all your things away", "Taking turns or letting someone use something for a while", "Only playing alone"], correct: 1 },
        { q: "How do friends feel when you share?", options: ["Angry", "Happy and included", "Worried"], correct: 1 },
      ]
    },
    {
      title: "Asking for Help",
      sentences: [
        { type: "descriptive", text: "Sometimes I find something too difficult to do on my own." },
        { type: "descriptive", text: "This could be a hard math problem, a jar I can't open, or a word I can't read." },
        { type: "perspective", text: "Adults and friends are usually happy to help when I ask." },
        { type: "affirmative", text: "Asking for help doesn't mean I can't do things — it means I'm smart enough to know when I need support." },
        { type: "directive", text: "I will try to say 'Can you help me, please?' when I'm stuck." },
        { type: "perspective", text: "People feel trusted when I ask for their help." },
      ],
      questions: [
        { q: "What does asking for help mean about you?", options: ["You can't do anything right", "You're smart enough to know when you need support", "You're bothering people"], correct: 1 },
        { q: "How do people feel when you ask for help?", options: ["Annoyed", "Trusted", "Confused"], correct: 1 },
      ]
    },
    {
      title: "Saying Sorry",
      sentences: [
        { type: "descriptive", text: "Sometimes I accidentally hurt someone's feelings or break something." },
        { type: "perspective", text: "The other person might feel sad, surprised, or upset." },
        { type: "descriptive", text: "Saying 'I'm sorry' lets the other person know I understand they are hurt." },
        { type: "affirmative", text: "Everyone makes mistakes — what matters is what I do after." },
        { type: "directive", text: "I will try to say 'I'm sorry' when I accidentally hurt someone." },
        { type: "perspective", text: "People feel better when they hear a sincere apology." },
      ],
      questions: [
        { q: "Why do we say 'I'm sorry'?", options: ["Because we have to", "To show we understand the other person is hurt", "To avoid punishment"], correct: 1 },
        { q: "Does everyone make mistakes?", options: ["No, only some people", "Yes, everyone does", "Only children"], correct: 1 },
      ]
    },
    {
      title: "Following Instructions",
      sentences: [
        { type: "descriptive", text: "Teachers and parents give instructions to help me know what to do." },
        { type: "descriptive", text: "Instructions might have more than one step, like 'put away your book and sit down.'" },
        { type: "perspective", text: "When I follow instructions, it helps things run smoothly for everyone." },
        { type: "affirmative", text: "It's okay to ask someone to repeat the instructions if I didn't catch them." },
        { type: "directive", text: "I will listen carefully and try to follow the steps in order." },
        { type: "perspective", text: "Teachers feel respected when students listen to instructions." },
      ],
      questions: [
        { q: "What can you do if you didn't hear the instructions?", options: ["Guess what to do", "Ask the person to repeat them", "Do nothing"], correct: 1 },
        { q: "Why do people give instructions?", options: ["To boss people around", "To help me know what to do", "For no reason"], correct: 1 },
      ]
    },
  ],
  medium: [
    {
      title: "Joining a Group Activity",
      sentences: [
        { type: "descriptive", text: "Sometimes I want to join a game or activity that others are already playing." },
        { type: "perspective", text: "The other kids might be focused on what they're doing." },
        { type: "descriptive", text: "Walking up to a group and just starting to play can confuse them." },
        { type: "perspective", text: "They might not understand that I want to join." },
        { type: "descriptive", text: "A good way to join is to watch for a moment, then ask 'Can I play too?'" },
        { type: "perspective", text: "Most kids feel happy when someone asks to join politely." },
        { type: "affirmative", text: "Even if they say 'not right now,' I can try again later or find another activity." },
        { type: "descriptive", text: "Sometimes groups have rules I might need to learn first." },
        { type: "perspective", text: "Learning the rules shows the others that I respect their game." },
        { type: "directive", text: "I will try asking 'Can I play?' before joining a group." },
        { type: "perspective", text: "When I ask nicely, others are more likely to welcome me." },
      ],
      questions: [
        { q: "What should you do before joining a group game?", options: ["Just start playing", "Watch and then ask 'Can I play?'", "Tell them they have to let you play"], correct: 1 },
        { q: "Why is it good to learn the group's rules?", options: ["So you can change them", "It shows you respect their game", "Rules don't matter"], correct: 1 },
        { q: "If they say 'not right now,' what can you do?", options: ["Get angry", "Try again later or find another activity", "Tell the teacher on them"], correct: 1 },
      ]
    },
    {
      title: "Dealing with Losing a Game",
      sentences: [
        { type: "descriptive", text: "When I play games, sometimes I win and sometimes I lose." },
        { type: "perspective", text: "Everyone feels disappointed when they don't win — that's normal." },
        { type: "descriptive", text: "Winning and losing are both parts of playing any game." },
        { type: "perspective", text: "The other players feel proud when they win, just like I do." },
        { type: "descriptive", text: "Saying 'Good game!' shows that I can handle both outcomes." },
        { type: "affirmative", text: "Losing doesn't mean I'm bad at the game — it means I'm learning." },
        { type: "perspective", text: "Others enjoy playing with someone who is a good sport." },
        { type: "descriptive", text: "I can think about what I might try differently next time." },
        { type: "directive", text: "I will try to say 'Good game!' even when I don't win." },
        { type: "perspective", text: "When I'm a good sport, people want to play with me again." },
      ],
      questions: [
        { q: "Is it normal to feel disappointed when you lose?", options: ["No, you should never care", "Yes, everyone feels that way", "Only small kids feel disappointed"], correct: 1 },
        { q: "What is a good thing to say after a game?", options: ["That game was stupid", "Good game!", "I would have won if..."], correct: 1 },
        { q: "Why do people enjoy playing with a good sport?", options: ["Because good sports always lose", "It makes the game more fun for everyone", "They don't really"], correct: 1 },
      ]
    },
    {
      title: "Understanding Personal Space",
      sentences: [
        { type: "descriptive", text: "Personal space is the area right around someone's body." },
        { type: "descriptive", text: "Most people feel comfortable when others stay about an arm's length away." },
        { type: "perspective", text: "If I stand too close, someone might feel crowded or uncomfortable." },
        { type: "descriptive", text: "Different situations have different space rules — friends might be closer than strangers." },
        { type: "perspective", text: "Noticing if someone leans away or steps back is a clue I'm too close." },
        { type: "affirmative", text: "It's okay to need reminders about space — many people learn this gradually." },
        { type: "descriptive", text: "In a line or crowd, less space is expected and that's okay." },
        { type: "directive", text: "I will try to keep about an arm's length from people in conversations." },
        { type: "perspective", text: "People feel more relaxed and happy to talk when I give them comfortable space." },
      ],
      questions: [
        { q: "How much space do most people prefer?", options: ["As close as possible", "About an arm's length away", "The whole room"], correct: 1 },
        { q: "What's a clue that you're too close?", options: ["They smile bigger", "They lean away or step back", "They talk louder"], correct: 1 },
        { q: "Is personal space the same in all situations?", options: ["Yes, always the same", "No, it depends on the relationship and situation", "Only adults have personal space"], correct: 1 },
      ]
    },
    {
      title: "Taking Turns in Conversation",
      sentences: [
        { type: "descriptive", text: "A conversation is like a ball being passed back and forth." },
        { type: "descriptive", text: "One person talks, and then the other person gets a turn." },
        { type: "perspective", text: "When I talk for a very long time without pausing, the other person might feel left out." },
        { type: "descriptive", text: "I can watch for clues that someone wants to speak — like opening their mouth or raising a finger." },
        { type: "affirmative", text: "It's normal to get excited and want to share a lot. I can practice pausing." },
        { type: "perspective", text: "Other people have interesting things to say too." },
        { type: "descriptive", text: "Asking a question like 'What do you think?' passes the ball to the other person." },
        { type: "directive", text: "I will try to pause after a few sentences and let the other person speak." },
        { type: "perspective", text: "People enjoy conversations more when both sides get to share." },
      ],
      questions: [
        { q: "What is a conversation compared to?", options: ["A race to finish first", "A ball being passed back and forth", "A TV show"], correct: 1 },
        { q: "What can you do to give someone else a turn?", options: ["Talk louder", "Ask them 'What do you think?'", "Walk away"], correct: 1 },
        { q: "How might someone feel if you talk without pausing?", options: ["Included", "Left out", "Excited"], correct: 1 },
      ]
    },
    {
      title: "Handling Mistakes",
      sentences: [
        { type: "descriptive", text: "Everyone makes mistakes — adults, children, and even experts." },
        { type: "perspective", text: "When I make a mistake, I might feel embarrassed or frustrated." },
        { type: "affirmative", text: "These feelings are normal, and they don't last forever." },
        { type: "descriptive", text: "A mistake is actually a chance to learn something new." },
        { type: "perspective", text: "Other people don't usually think badly of me for making a mistake." },
        { type: "descriptive", text: "I can say 'Oops, let me try again' and move on." },
        { type: "directive", text: "I will try to be kind to myself when I make a mistake." },
        { type: "perspective", text: "When I stay calm after mistakes, others respect my attitude." },
      ],
      questions: [
        { q: "What can a mistake help you do?", options: ["Nothing useful", "Learn something new", "Get punished"], correct: 1 },
        { q: "Do other people think badly of you for a mistake?", options: ["Yes, always", "Usually not", "They never notice"], correct: 1 },
        { q: "What can you say after a mistake?", options: ["I'm terrible at everything", "Oops, let me try again", "I quit"], correct: 1 },
      ]
    },
    {
      title: "Being a Good Listener",
      sentences: [
        { type: "descriptive", text: "Listening means paying attention when someone else is speaking." },
        { type: "descriptive", text: "Good listeners face the person, make eye contact, and think about what's being said." },
        { type: "perspective", text: "When someone listens to me, I feel important and cared about." },
        { type: "descriptive", text: "Sometimes my mind wanders, and that's okay — I can gently bring my attention back." },
        { type: "affirmative", text: "Being a good listener takes practice, and it's okay if it's hard sometimes." },
        { type: "perspective", text: "The speaker can tell when I'm paying attention by my face and body language." },
        { type: "descriptive", text: "Nodding, saying 'uh-huh,' and asking questions shows I'm listening." },
        { type: "directive", text: "I will try to look at the speaker and think about their words." },
        { type: "perspective", text: "Good listeners make people feel heard and valued." },
      ],
      questions: [
        { q: "How can you show someone you're listening?", options: ["Look at your phone", "Nod and ask questions", "Walk away"], correct: 1 },
        { q: "Is it okay if your mind wanders sometimes?", options: ["No, that means you're a bad listener", "Yes, you can gently bring your attention back", "You should never listen anyway"], correct: 1 },
        { q: "How do people feel when they're listened to?", options: ["Unimportant", "Important and cared about", "Bored"], correct: 1 },
      ]
    },
  ],
  long: [
    {
      title: "Responding to Teasing",
      sentences: [
        { type: "descriptive", text: "Sometimes someone at school might say something unkind or teasing." },
        { type: "perspective", text: "The person teasing might be trying to get a reaction or may not realize their words are hurtful." },
        { type: "descriptive", text: "When I hear something that hurts my feelings, my body might tense up and I might feel hot." },
        { type: "perspective", text: "These feelings are my body's way of telling me I'm upset." },
        { type: "affirmative", text: "It's okay to feel upset — everyone has moments when words bother them." },
        { type: "descriptive", text: "I have several choices for how to respond." },
        { type: "descriptive", text: "I can walk away calmly, I can tell them 'That's not funny,' or I can talk to a trusted adult." },
        { type: "perspective", text: "If I react with shouting or hitting, it might make the situation worse." },
        { type: "perspective", text: "The other person might tease more if they see it upsets me a lot." },
        { type: "descriptive", text: "Taking three deep breaths can help me feel calmer before choosing what to do." },
        { type: "perspective", text: "A trusted adult can help figure out the best way to handle the situation." },
        { type: "directive", text: "I will try to stay calm, and if I need help, I can talk to someone I trust." },
      ],
      questions: [
        { q: "Why might someone tease others?", options: ["They are always mean people", "They might want a reaction or not realize it's hurtful", "They were told to"], correct: 1 },
        { q: "What might happen if you react by shouting?", options: ["The person will stop", "It could make the situation worse", "Everyone will be impressed"], correct: 1 },
        { q: "What is a good first step when you feel upset?", options: ["Hit something", "Take three deep breaths", "Run away screaming"], correct: 1 },
      ],
      interactiveChoices: [
        {
          scenario: "Someone at lunch says 'Your lunch looks weird.' You feel upset. What do you do?",
          options: [
            { text: "Say 'I like my lunch' and keep eating", outcome: "positive", feedback: "Great choice! You stood up for yourself calmly." },
            { text: "Throw your lunch away", outcome: "negative", feedback: "This lets the teaser affect your choices. Your lunch is fine!" },
            { text: "Yell at them", outcome: "negative", feedback: "This might make the situation bigger. A calm response is more powerful." },
          ]
        }
      ]
    },
    {
      title: "Managing Unexpected Changes",
      sentences: [
        { type: "descriptive", text: "Sometimes plans change without warning — a class gets cancelled, or a trip gets moved." },
        { type: "perspective", text: "Many people feel confused or frustrated when things don't go as expected." },
        { type: "descriptive", text: "My body might feel tight, and I might want things to go back to the original plan." },
        { type: "affirmative", text: "It is completely normal to feel uncomfortable with sudden changes." },
        { type: "perspective", text: "The person making the change usually has a good reason, even if I don't know it yet." },
        { type: "descriptive", text: "I can ask 'What is the new plan?' to understand what will happen next." },
        { type: "descriptive", text: "Knowing the new plan helps my brain adjust." },
        { type: "perspective", text: "Sometimes the new plan can turn out to be even better than the original." },
        { type: "descriptive", text: "Taking slow breaths and counting to five can help me feel more settled." },
        { type: "directive", text: "I will try to ask about the new plan and give it a chance." },
        { type: "perspective", text: "Adults appreciate when I can be flexible, and it helps me feel proud of myself." },
      ],
      questions: [
        { q: "Why do plans sometimes change?", options: ["To trick people", "The person making the change usually has a good reason", "Plans should never change"], correct: 1 },
        { q: "What can help your brain adjust to a change?", options: ["Refusing to do anything", "Asking 'What is the new plan?'", "Ignoring everyone"], correct: 1 },
        { q: "Can a new plan ever be good?", options: ["No, original plans are always better", "Yes, sometimes new plans can be even better", "It doesn't matter"], correct: 1 },
      ],
      interactiveChoices: [
        {
          scenario: "Your teacher says today's outdoor class is moved indoors because of rain. You were really looking forward to being outside.",
          options: [
            { text: "Ask what the indoor activity will be", outcome: "positive", feedback: "Good approach! Understanding the new plan helps you adjust." },
            { text: "Refuse to participate", outcome: "negative", feedback: "This means you miss out completely. Giving it a chance might surprise you." },
            { text: "Take a deep breath and join the indoor class", outcome: "positive", feedback: "Excellent flexibility! You're adapting to the change calmly." },
          ]
        }
      ]
    },
    {
      title: "Understanding Different Feelings",
      sentences: [
        { type: "descriptive", text: "People show their feelings in different ways — some are loud, some are quiet." },
        { type: "descriptive", text: "A person's face, voice, and body can give clues about how they feel." },
        { type: "perspective", text: "Someone with crossed arms and a frown might be feeling frustrated or upset." },
        { type: "perspective", text: "Someone bouncing and smiling is probably feeling happy or excited." },
        { type: "descriptive", text: "Sometimes people feel more than one thing at once — like excited AND nervous." },
        { type: "affirmative", text: "All feelings are okay. There are no 'bad' feelings, only difficult ones." },
        { type: "perspective", text: "When I notice how someone else feels, I can respond in a way that helps." },
        { type: "descriptive", text: "If a friend looks sad, I might ask 'Are you okay?' If they look excited, I might say 'That's awesome!'" },
        { type: "descriptive", text: "Reading emotions gets easier with practice." },
        { type: "directive", text: "I will try to notice how people around me are feeling by watching their face and body." },
        { type: "perspective", text: "People feel understood and cared about when I notice their emotions." },
      ],
      questions: [
        { q: "How can you tell how someone feels?", options: ["You can't — feelings are invisible", "Watch their face, voice, and body language", "Just ask every person you see"], correct: 1 },
        { q: "Can you feel more than one emotion at once?", options: ["No, only one at a time", "Yes, like excited AND nervous", "Only adults can"], correct: 1 },
        { q: "What might you do if a friend looks sad?", options: ["Ignore them", "Ask 'Are you okay?'", "Tell them to cheer up"], correct: 1 },
      ],
      interactiveChoices: [
        {
          scenario: "Your friend comes to school looking tired with their head down. They barely say hi. What do you do?",
          options: [
            { text: "Gently ask 'Hey, are you alright today?'", outcome: "positive", feedback: "Checking in shows you noticed and care about how they feel." },
            { text: "Ignore them — they'll talk if they want to", outcome: "negative", feedback: "They might need a friend right now. A gentle check-in can help." },
            { text: "Tell them to stop being grumpy", outcome: "negative", feedback: "This might make them feel worse. They can't always control how they feel." },
          ]
        }
      ]
    },
    {
      title: "Working Together in a Team",
      sentences: [
        { type: "descriptive", text: "In a team, several people work together toward a shared goal." },
        { type: "descriptive", text: "Each person might have a different job or skill to contribute." },
        { type: "perspective", text: "Not everyone works the same way — some people are fast, some are careful, some are creative." },
        { type: "affirmative", text: "Different strengths make the team stronger." },
        { type: "perspective", text: "My teammates might have ideas I haven't thought of." },
        { type: "descriptive", text: "Good teamwork involves listening to each other, dividing tasks fairly, and helping when someone is stuck." },
        { type: "perspective", text: "If I do all the work myself, my teammates might feel unimportant or left out." },
        { type: "descriptive", text: "Saying 'What do you think?' or 'Would you like to do this part?' includes everyone." },
        { type: "descriptive", text: "Disagreements happen in teams — the key is to discuss and compromise, not argue." },
        { type: "directive", text: "I will try to include all team members and value different ideas." },
        { type: "perspective", text: "Teams that work well together feel proud and enjoy the experience." },
      ],
      questions: [
        { q: "Why are different strengths good for a team?", options: ["They cause arguments", "They make the team stronger and more creative", "Only one type of person should be on a team"], correct: 1 },
        { q: "What might happen if you do all the work yourself?", options: ["The team will love you", "Teammates might feel unimportant or left out", "You'll finish faster"], correct: 1 },
        { q: "How should team disagreements be handled?", options: ["By arguing loudly", "By discussing and compromising", "By letting one person always decide"], correct: 1 },
      ],
      interactiveChoices: [
        {
          scenario: "Your group is making a poster. You have a great idea, but your teammate suggests something different. What do you do?",
          options: [
            { text: "Listen to their idea and combine the best parts of both", outcome: "positive", feedback: "Combining ideas often creates something better than either one alone!" },
            { text: "Insist your idea is better and ignore theirs", outcome: "negative", feedback: "This might make your teammate feel unvalued. Their idea might have great parts too." },
            { text: "Let them do whatever they want even if you disagree", outcome: "negative", feedback: "Your input matters too! It's better to share your thoughts and find a compromise." },
          ]
        }
      ]
    },
  ]
};

function SocialStoriesTask({ config, onComplete }) {
  const storyLength = config.story_length || 'short';
  const numStories = config.num_stories || 4;
  const questionType = config.question_type || 'comprehension';

  const [stories, setStories] = useState([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [phase, setPhase] = useState('reading'); // reading, questions, interactive, feedback
  const [questionIndex, setQuestionIndex] = useState(0);
  const [storyResults, setStoryResults] = useState([]);
  const [currentStoryCorrect, setCurrentStoryCorrect] = useState(0);
  const [currentStoryTotal, setCurrentStoryTotal] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(Date.now());
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const pool = STORIES[storyLength] || STORIES.short;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(numStories, shuffled.length));
    // Randomize question answer positions to eliminate response bias
    const withShuffledAnswers = selected.map(story => ({
      ...story,
      questions: story.questions.map(q => {
        const indices = q.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        return {
          ...q,
          options: indices.map(i => q.options[i]),
          correct: indices.indexOf(q.correct),
        };
      }),
    }));
    setStories(withShuffledAnswers);
  }, []);

  // Completion check
  useEffect(() => {
    if (storyIndex >= stories.length && stories.length > 0 && phase !== 'done') {
      setPhase('done');
      const totalQ = storyResults.reduce((s, r) => s + r.total, 0);
      const totalCorrect = storyResults.reduce((s, r) => s + r.correct, 0);
      const comprehensionScore = totalQ > 0 ? (totalCorrect / totalQ) * 100 : 0;
      const avgRT = storyResults.length > 0
        ? storyResults.reduce((s, r) => s + r.avgRT, 0) / storyResults.length : 0;

      onComplete([
        { metric_name: 'comprehension_score', metric_value: Math.round(comprehensionScore * 100) / 100 },
        { metric_name: 'avg_response_time', metric_value: Math.round(avgRT) },
      ]);
    }
  }, [storyIndex, stories.length, phase]);

  const handleAnswer = (optionIndex) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    const story = stories[storyIndex];
    const question = story.questions[questionIndex];
    const isCorrect = optionIndex === question.correct;
    const rt = Date.now() - trialStartTime;

    const newCorrect = currentStoryCorrect + (isCorrect ? 1 : 0);
    const newTotal = currentStoryTotal + 1;
    setCurrentStoryCorrect(newCorrect);
    setCurrentStoryTotal(newTotal);

    setTimeout(() => {
      setSelected(null);
      if (questionIndex + 1 < story.questions.length) {
        setQuestionIndex(prev => prev + 1);
        setTrialStartTime(Date.now());
      } else if (questionType === 'interactive' && story.interactiveChoices?.length > 0 && phase !== 'interactive') {
        setPhase('interactive');
        setQuestionIndex(0);
      } else {
        // Story complete
        setStoryResults(prev => [...prev, {
          correct: newCorrect, total: newTotal,
          avgRT: rt,
        }]);
        setCurrentStoryCorrect(0);
        setCurrentStoryTotal(0);
        setQuestionIndex(0);
        setStoryIndex(prev => prev + 1);
        setPhase('reading');
        setTrialStartTime(Date.now());
      }
    }, 1200);
  };

  const handleInteractiveChoice = (optionIndex) => {
    setSelected(optionIndex);
    setTimeout(() => {
      setSelected(null);
      // Story complete
      setStoryResults(prev => [...prev, {
        correct: currentStoryCorrect, total: currentStoryTotal,
        avgRT: Date.now() - trialStartTime,
      }]);
      setCurrentStoryCorrect(0);
      setCurrentStoryTotal(0);
      setQuestionIndex(0);
      setStoryIndex(prev => prev + 1);
      setPhase('reading');
      setTrialStartTime(Date.now());
    }, 2000);
  };

  const progress = stories.length > 0 ? (storyIndex / stories.length) * 100 : 0;
  const currentStory = stories[storyIndex];

  if (!currentStory && phase !== 'done') return <div className="task-arena">Preparing stories...</div>;

  return (
    <div className="task-arena social-stories-task">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <div className="trial-counter">Story {Math.min(storyIndex + 1, stories.length)} / {stories.length}</div>

      {currentStory && phase === 'reading' && (
        <div className="ss-reading">
          <h3 className="ss-title">{currentStory.title}</h3>
          <div className="ss-sentences">
            {currentStory.sentences.map((s, i) => (
              <p key={i} className={`ss-sentence ss-${s.type}`}>
                {s.text}
              </p>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => {
            setPhase('questions');
            setTrialStartTime(Date.now());
          }}>
            I've Read the Story — Continue to Questions
          </button>
        </div>
      )}

      {currentStory && phase === 'questions' && (
        <div className="ss-questions">
          <h3 className="ss-title">{currentStory.title}</h3>
          <div className="ss-question">
            <p className="ss-q-text">{currentStory.questions[questionIndex]?.q}</p>
            <div className="ss-options">
              {currentStory.questions[questionIndex]?.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`ss-option ${
                    selected !== null && idx === currentStory.questions[questionIndex].correct ? 'correct' : ''
                  } ${selected === idx && idx !== currentStory.questions[questionIndex].correct ? 'wrong' : ''}`}
                  onClick={() => handleAnswer(idx)}
                  disabled={selected !== null}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="ss-q-progress">
              Question {questionIndex + 1} / {currentStory.questions.length}
            </div>
          </div>
        </div>
      )}

      {currentStory && phase === 'interactive' && currentStory.interactiveChoices && (
        <div className="ss-interactive">
          <h3 className="ss-title">What Would You Do?</h3>
          <p className="ss-scenario">{currentStory.interactiveChoices[0]?.scenario}</p>
          <div className="ss-options">
            {currentStory.interactiveChoices[0]?.options.map((opt, idx) => (
              <button
                key={idx}
                className={`ss-option ${selected === idx ? (opt.outcome === 'positive' ? 'correct' : 'wrong') : ''}`}
                onClick={() => handleInteractiveChoice(idx)}
                disabled={selected !== null}
              >
                {opt.text}
              </button>
            ))}
          </div>
          {selected !== null && (
            <p className="ss-feedback">{currentStory.interactiveChoices[0].options[selected]?.feedback}</p>
          )}
        </div>
      )}

      <p className="task-hint">Read carefully and answer based on what you learned in the story.</p>
    </div>
  );
}

export default SocialStoriesTask;
