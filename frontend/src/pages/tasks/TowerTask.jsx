/**
 * Tower Planning Task
 * 
 * Medical paradigm: Planning and Executive Function
 * Tower of Hanoi variant for measuring planning ability
 * Key metric: Problems solved at first choice
 * Tracks: Extra moves, planning time, total moves
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const DISK_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

// BFS to compute true optimal (minimum) number of moves from start to goal
function computeOptimalMoves(startState, goalState) {
  const serialize = (state) => JSON.stringify(state);
  const goalKey = serialize(goalState);
  const startKey = serialize(startState);
  if (startKey === goalKey) return 0;

  const visited = new Set([startKey]);
  const queue = [{ state: startState, depth: 0 }];

  while (queue.length > 0) {
    const { state, depth } = queue.shift();
    // Generate all valid moves
    for (let from = 0; from < 3; from++) {
      if (state[from].length === 0) continue;
      const disk = state[from][state[from].length - 1];
      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        if (state[to].length === 0 || state[to][state[to].length - 1] > disk) {
          const next = state.map(peg => [...peg]);
          next[from] = [...state[from]];
          next[from].pop();
          next[to] = [...state[to], disk];
          const key = serialize(next);
          if (key === goalKey) return depth + 1;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ state: next, depth: depth + 1 });
          }
        }
      }
    }
    // Safety: cap BFS to avoid excessive computation for large puzzles
    if (visited.size > 50000) return depth + 1;
  }
  return -1; // Should not happen for valid puzzles
}

function generateSolvablePuzzle(numDisks, minMoves, maxMoves) {
  // Start from solved state and work backwards with random moves
  const solved = [[], [], []];
  for (let i = numDisks; i >= 1; i--) {
    solved[2].push(i); // Goal: all on peg 2
  }

  // Generate random start by making random valid moves from goal
  const start = JSON.parse(JSON.stringify(solved));
  const moves = minMoves + Math.floor(Math.random() * (maxMoves - minMoves + 1));
  
  for (let m = 0; m < moves; m++) {
    const validMoves = [];
    for (let from = 0; from < 3; from++) {
      if (start[from].length === 0) continue;
      const disk = start[from][start[from].length - 1];
      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        if (start[to].length === 0 || start[to][start[to].length - 1] > disk) {
          validMoves.push({ from, to });
        }
      }
    }
    if (validMoves.length > 0) {
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      const disk = start[move.from].pop();
      start[move.to].push(disk);
    }
  }

  // Goal state
  const goal = [[], [], []];
  for (let i = numDisks; i >= 1; i--) {
    goal[2].push(i);
  }

  // Compute TRUE optimal using BFS (not the number of backward moves)
  const optimalMoves = computeOptimalMoves(start, goal);

  // Guard: if puzzle is already solved (0 moves) or trivial, regenerate
  if (optimalMoves <= 0) {
    return generateSolvablePuzzle(numDisks, minMoves, maxMoves);
  }

  return { start, goal, optimalMoves };
}

function TowerTask({ config, onComplete }) {
  const numDisks = config.num_disks || 3;
  const numPuzzles = config.num_puzzles || 5;
  const timeLimitPerPuzzle = config.time_limit_per_puzzle || 60;

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [pegs, setPegs] = useState([[], [], []]);
  const [goal, setGoal] = useState([[], [], []]);
  const [selectedPeg, setSelectedPeg] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [optimalMoves, setOptimalMoves] = useState(0);
  const [puzzleResults, setPuzzleResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(timeLimitPerPuzzle);
  const [phase, setPhase] = useState('playing');
  const [planningTime, setPlanningTime] = useState(null);
  const [puzzleStartTime, setPuzzleStartTime] = useState(null);
  const [firstMoveTime, setFirstMoveTime] = useState(null);
  const timerRef = useRef(null);

  const startPuzzle = useCallback((index) => {
    const minMoves = config.min_moves || 2;
    const maxMoves = config.max_moves || 3;
    const puzzle = generateSolvablePuzzle(numDisks, minMoves, maxMoves);
    setPegs(puzzle.start);
    setGoal(puzzle.goal);
    setOptimalMoves(puzzle.optimalMoves);
    setMoveCount(0);
    setSelectedPeg(null);
    setTimeLeft(timeLimitPerPuzzle);
    setPuzzleStartTime(Date.now());
    setFirstMoveTime(null);
    setPlanningTime(null);
    setPhase('playing');
  }, [numDisks, timeLimitPerPuzzle, config]);

  useEffect(() => {
    startPuzzle(0);
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handlePuzzleEnd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, puzzleIndex]);

  // Check if puzzle is solved
  useEffect(() => {
    if (phase !== 'playing') return;
    const solved = JSON.stringify(pegs) === JSON.stringify(goal);
    if (solved && moveCount > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      handlePuzzleEnd(true);
    }
  }, [pegs, goal, phase, moveCount]);

  const handlePuzzleEnd = (solved) => {
    const planning = planningTime || 0;
    const extraMoves = Math.max(0, moveCount - optimalMoves);
    const result = {
      solved,
      moveCount,
      optimalMoves,
      extraMoves,
      planningTime: planning,
      firstTry: solved && moveCount <= optimalMoves + 1,
    };

    const newResults = [...puzzleResults, result];
    setPuzzleResults(newResults);
    setPhase('feedback');

    setTimeout(() => {
      if (puzzleIndex + 1 < numPuzzles) {
        setPuzzleIndex(prev => prev + 1);
        startPuzzle(puzzleIndex + 1);
      } else {
        // All puzzles done
        const totalSolved = newResults.filter(r => r.solved).length;
        const firstTryCount = newResults.filter(r => r.firstTry).length;
        const avgExtra = newResults.reduce((sum, r) => sum + r.extraMoves, 0) / newResults.length;
        const avgPlanning = newResults.reduce((sum, r) => sum + r.planningTime, 0) / newResults.length;
        const totalMoves = newResults.reduce((sum, r) => sum + r.moveCount, 0);

        onComplete([
          { metric_name: 'problems_solved_first_try', metric_value: firstTryCount },
          { metric_name: 'total_solved', metric_value: totalSolved },
          { metric_name: 'avg_extra_moves', metric_value: Math.round(avgExtra * 100) / 100 },
          { metric_name: 'avg_planning_time', metric_value: Math.round(avgPlanning) },
          { metric_name: 'total_moves', metric_value: totalMoves },
        ]);
      }
    }, 1500);
  };

  const handlePegClick = (pegIndex) => {
    if (phase !== 'playing') return;

    if (selectedPeg === null) {
      // Select source peg
      if (pegs[pegIndex].length > 0) {
        setSelectedPeg(pegIndex);
      }
    } else {
      // Try to move
      if (pegIndex === selectedPeg) {
        setSelectedPeg(null);
        return;
      }

      const sourcePeg = pegs[selectedPeg];
      const targetPeg = pegs[pegIndex];
      const disk = sourcePeg[sourcePeg.length - 1];

      if (targetPeg.length === 0 || targetPeg[targetPeg.length - 1] > disk) {
        // Valid move
        if (!firstMoveTime) {
          setFirstMoveTime(Date.now());
          setPlanningTime(Date.now() - puzzleStartTime);
        }

        const newPegs = pegs.map(p => [...p]);
        newPegs[selectedPeg] = sourcePeg.slice(0, -1);
        newPegs[pegIndex] = [...targetPeg, disk];
        setPegs(newPegs);
        setMoveCount(prev => prev + 1);
      }
      setSelectedPeg(null);
    }
  };

  const renderPeg = (pegDisks, pegIndex, isGoal = false) => {
    const maxWidth = 140;
    const diskHeight = 28;
    const pegHeight = numDisks * (diskHeight + 5) + 20;

    return (
      <div
        className={`tower-peg ${selectedPeg === pegIndex && !isGoal ? 'selected' : ''} ${isGoal ? 'goal-peg' : ''}`}
        onClick={() => !isGoal && handlePegClick(pegIndex)}
        key={pegIndex}
      >
        <div className="peg-rod" style={{ height: pegHeight }} />
        <div className="peg-disks" style={{ minHeight: pegHeight }}>
          {pegDisks.map((diskSize, i) => {
            const width = 40 + (diskSize / numDisks) * (maxWidth - 40);
            return (
              <div
                key={i}
                className={`tower-disk ${selectedPeg === pegIndex && i === pegDisks.length - 1 && !isGoal ? 'selected-disk' : ''}`}
                style={{
                  width,
                  height: diskHeight,
                  backgroundColor: DISK_COLORS[(diskSize - 1) % DISK_COLORS.length],
                }}
              />
            );
          })}
        </div>
        <div className="peg-base" />
      </div>
    );
  };

  return (
    <div className="task-arena tower-task">
      <div className="tower-header">
        <div className="trial-counter">Puzzle {puzzleIndex + 1} / {numPuzzles}</div>
        <div className="tower-stats">
          <span>Moves: {moveCount}</span>
          <span>Time: {timeLeft}s</span>
        </div>
      </div>

      {phase === 'feedback' && (
        <div className="tower-feedback">
          {puzzleResults[puzzleResults.length - 1]?.solved ? '✅ Solved!' : '⏰ Time Up!'}
        </div>
      )}

      <div className="tower-goal-section">
        <div className="goal-label">Goal:</div>
        <div className="tower-pegs goal">
          {goal.map((p, i) => renderPeg(p, i, true))}
        </div>
      </div>

      <div className="tower-play-section">
        <div className="play-label">Your Board:</div>
        <div className="tower-pegs play">
          {pegs.map((p, i) => renderPeg(p, i))}
        </div>
      </div>

      <p className="task-hint">
        {selectedPeg !== null ? 'Click a peg to place the disk' : 'Click a peg to pick up the top disk'}
      </p>
    </div>
  );
}

export default TowerTask;
