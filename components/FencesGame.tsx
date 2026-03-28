"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Board,
  type Cell,
  type Difficulty,
  type Move,
  type Player,
  type SizeName,
  isPegOwnedByPlayer,
  legalMoves,
  SIZES,
  aiMove,
  createBoard,
  placeToken,
  winner,
} from "@/lib/fences";

type HistoryItem = {
  turn: number;
  player: Player;
  move: Move;
};

const SIZE_OPTIONS: SizeName[] = ["small", "medium", "large"];
const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "hard"];

const DOT_SIZE = 26;
const COL_STEP = 56;
const ROW_STEP = 56;
const ROW_OFFSET = COL_STEP / 2;
const BOARD_PADDING = 36;

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Player;
};

const LOGICAL_FORWARD_STEPS: Move[] = [
  [1, 0],
  [0, 1],
];

export function FencesGame() {
  const [sizeName, setSizeName] = useState<SizeName>("medium");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Board>(() => createBoard("medium"));
  const [turn, setTurn] = useState<Player>("R");
  const [result, setResult] = useState<ReturnType<typeof winner>>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const boardSize = SIZES[sizeName];
  const latestMove = history.length > 0 ? history[history.length - 1].move : null;

  const boardMetrics = useMemo(() => {
    const width = BOARD_PADDING * 2 + (boardSize - 1) * COL_STEP + DOT_SIZE;
    const height = BOARD_PADDING * 2 + (board.length - 1) * ROW_STEP + DOT_SIZE;
    return { width, height };
  }, [board.length, boardSize]);

  const cellPosition = useCallback((r: number, c: number) => {
    const left = BOARD_PADDING + c * COL_STEP + ((r + 1) % 2) * ROW_OFFSET;
    const top = BOARD_PADDING + r * ROW_STEP;
    const cx = left + DOT_SIZE / 2;
    const cy = top + DOT_SIZE / 2;
    return { left, top, cx, cy };
  }, []);

  const boardBounds = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let r = 0; r < board.length; r += 1) {
      for (let c = 0; c < board[r].length; c += 1) {
        const p = cellPosition(r, c);
        minX = Math.min(minX, p.cx);
        maxX = Math.max(maxX, p.cx);
        minY = Math.min(minY, p.cy);
        maxY = Math.max(maxY, p.cy);
      }
    }

    return { minX, maxX, minY, maxY };
  }, [board, cellPosition]);

  const segments = useMemo<Segment[]>(() => {
    const links: Segment[] = [];

    const getLogicalCell = (player: Player, r: number, c: number): Cell => {
      const vr = player === "B" ? r * 2 : r * 2 + 1;
      const vc = c;
      if (vr < 0 || vr >= board.length || vc < 0 || vc >= board[vr].length) {
        return ".";
      }
      return board[vr][vc];
    };

    const logicalToVisual = (player: Player, r: number, c: number): Move => {
      return player === "B" ? [r * 2, c] : [r * 2 + 1, c];
    };

    const addPlayerSegments = (player: Player) => {
      const rows = player === "B" ? boardSize : boardSize - 1;
      const cols = player === "B" ? boardSize - 1 : boardSize;

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (getLogicalCell(player, r, c) !== player) {
            continue;
          }

          for (const [dr, dc] of LOGICAL_FORWARD_STEPS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
              continue;
            }
            if (getLogicalCell(player, nr, nc) !== player) {
              continue;
            }

            const [vr1, vc1] = logicalToVisual(player, r, c);
            const [vr2, vc2] = logicalToVisual(player, nr, nc);
            const p1 = cellPosition(vr1, vc1);
            const p2 = cellPosition(vr2, vc2);
            links.push({ x1: p1.cx, y1: p1.cy, x2: p2.cx, y2: p2.cy, color: player });
          }
        }
      }
    };

    addPlayerSegments("R");
    addPlayerSegments("B");
    return links;
  }, [board, boardSize, cellPosition]);

  const edgeRails = useMemo(() => {
    return {
      topY: boardBounds.minY - 34,
      bottomY: boardBounds.maxY + 34,
      leftX: boardBounds.minX - 34,
      rightX: boardBounds.maxX + 34,
      xStart: boardBounds.minX,
      xEnd: boardBounds.maxX,
      yStart: boardBounds.minY,
      yEnd: boardBounds.maxY,
      bottomXStart: boardBounds.minX,
      bottomXEnd: boardBounds.maxX,
      rightYStart: boardBounds.minY,
      rightYEnd: boardBounds.maxY,
    };
  }, [boardBounds]);

  const statusText = useMemo(() => {
    if (result === "R") {
      return "Game over: You win (Red connected left to right).";
    }
    if (result === "B") {
      return "Game over: Computer wins (Blue connected top to bottom).";
    }
    if (result === "Draw") {
      return "Game over: Draw.";
    }
    return "Place a red fence post to start your path.";
  }, [result]);

  function resetGame(nextSize: SizeName = sizeName, nextDifficulty: Difficulty = difficulty) {
    setSizeName(nextSize);
    setDifficulty(nextDifficulty);
    setBoard(createBoard(nextSize));
    setTurn("R");
    setResult(null);
    setHistory([]);
    setIsThinking(false);
  }

  const appendHistory = useCallback((player: Player, move: Move) => {
    setHistory((prev) => [...prev, { player, move, turn: prev.length + 1 }]);
  }, []);

  const executeMove = useCallback((player: Player, move: Move) => {
    if (!isPegOwnedByPlayer(player, move[0])) {
      return;
    }

    const nextBoard = placeToken(board, move, player);
    if (nextBoard === board) {
      return;
    }

    setBoard(nextBoard);
    appendHistory(player, move);

    const gameWinner = winner(nextBoard);
    if (gameWinner !== null) {
      setResult(gameWinner);
      setIsThinking(false);
      return;
    }

    const nextPlayer: Player = player === "R" ? "B" : "R";
    const nextMoves = legalMoves(nextBoard, nextPlayer);
    if (nextMoves.length === 0) {
      setResult("Draw");
      setIsThinking(false);
      return;
    }

    setTurn(nextPlayer);
    setIsThinking(nextPlayer === "B");
  }, [appendHistory, board]);

  function handleHumanMove(r: number, c: number) {
    if (result !== null || turn !== "R" || isThinking) {
      return;
    }
    executeMove("R", [r, c]);
  }

  useEffect(() => {
    if (turn !== "B" || result !== null || !isThinking) {
      return;
    }

    const timer = setTimeout(() => {
      const move = aiMove(board, difficulty);
      if (!move) {
        setResult("Draw");
        setIsThinking(false);
        return;
      }
      executeMove("B", move);
    }, 420);

    return () => clearTimeout(timer);
  }, [board, difficulty, executeMove, isThinking, result, turn]);

  return (
    <section className="game-shell">
      <article className="panel">
        <div className="controls">
          <label htmlFor="size-select">
            Board Size
            <select
              id="size-select"
              value={sizeName}
              onChange={(e) => resetGame(e.target.value as SizeName, difficulty)}
              disabled={isThinking}
            >
              {SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} ({SIZES[size]}x{SIZES[size]})
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="difficulty-select">
            Difficulty
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(e) => resetGame(sizeName, e.target.value as Difficulty)}
              disabled={isThinking}
            >
              {DIFFICULTY_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="turn-chip" aria-live="polite">
          <span className={`dot ${turn === "R" ? "red" : "blue"}`} />
          {turn === "R" ? "Your Turn (Red)" : "Computer Turn (Blue)"}
        </p>

        <p className="status" aria-live="polite">
          {statusText}
        </p>

        {isThinking && <p className="thinking">Computer is searching with minimax...</p>}

        <div className="board-scroll" aria-label="fences-board-scroll">
          <div
            className="board-canvas"
            role="grid"
            aria-label="fences-board"
            style={{ width: `${boardMetrics.width}px`, height: `${boardMetrics.height}px` }}
          >
            <svg className="board-svg" width={boardMetrics.width} height={boardMetrics.height}>
              <line
                className="rail red"
                x1={edgeRails.xStart}
                y1={edgeRails.topY}
                x2={edgeRails.xEnd}
                y2={edgeRails.topY}
              />
              <line
                className="rail red"
                x1={edgeRails.bottomXStart}
                y1={edgeRails.bottomY}
                x2={edgeRails.bottomXEnd}
                y2={edgeRails.bottomY}
              />
              <line
                className="rail blue"
                x1={edgeRails.leftX}
                y1={edgeRails.yStart}
                x2={edgeRails.leftX}
                y2={edgeRails.yEnd}
              />
              <line
                className="rail blue"
                x1={edgeRails.rightX}
                y1={edgeRails.rightYStart}
                x2={edgeRails.rightX}
                y2={edgeRails.rightYEnd}
              />

              {segments.map((segment, idx) => (
                <line
                  key={`seg-${idx}`}
                  className={`segment ${segment.color === "R" ? "red" : "blue"}`}
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                />
              ))}
            </svg>

            {board.map((row, r) =>
              row.map((cell, c) => {
                const isRecent = latestMove ? latestMove[0] === r && latestMove[1] === c : false;
                const { left, top } = cellPosition(r, c);
                const baseClass = r % 2 === 0 ? "base-blue" : "base-red";
                const fillClass = cell === "." ? "empty" : cell === "R" ? "occupied-red" : "occupied-blue";
                const canHumanPlayHere = isPegOwnedByPlayer("R", r);

                return (
                  <button
                    type="button"
                    key={`cell-${r}-${c}`}
                    className={`cell ${baseClass} ${fillClass} ${isRecent ? "recent" : ""}`.trim()}
                    style={{ left: `${left}px`, top: `${top}px` }}
                    onClick={() => handleHumanMove(r, c)}
                    disabled={
                      cell !== "." ||
                      !canHumanPlayHere ||
                      turn !== "R" ||
                      result !== null ||
                      isThinking
                    }
                    aria-label={`cell-${r}-${c}`}
                  />
                );
              }),
            )}
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <button type="button" onClick={() => resetGame()}>
            Restart Game
          </button>
        </div>
      </article>

      <aside className="panel">
        <h2 style={{ marginTop: 0 }}>Move History</h2>
        <ul className="history-list" aria-label="move-history">
          {history.length === 0 && <li className="history-item">No moves yet.</li>}
          {history.map((item) => (
            <li key={`${item.turn}-${item.player}`} className="history-item">
              #{item.turn} {item.player === "R" ? "Human (R)" : "Computer (B)"}: ({item.move[0]},{" "}
              {item.move[1]})
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
