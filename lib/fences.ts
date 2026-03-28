export type Cell = "." | "R" | "B";
export type Player = "R" | "B";
export type Winner = Player | "Draw" | null;
export type Difficulty = "easy" | "hard";
export type SizeName = "small" | "medium" | "large";
export type Move = [number, number];
export type Board = Cell[][];
type TTValue = { score: number; move: Move | null };

export const SIZES: Record<SizeName, number> = {
  small: 3,
  medium: 5,
  large: 10,
};

const NEIGHBOR_STEPS: ReadonlyArray<Move> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };

export function createBoard(sizeName: SizeName): Board {
  const size = SIZES[sizeName];
  const visualRows = size * 2 - 1;
  return Array.from({ length: visualRows }, (_, r) => {
    const rowLength = r % 2 === 0 ? size - 1 : size;
    return Array.from({ length: rowLength }, () => "." as Cell);
  });
}

function inBounds(board: Board, r: number, c: number): boolean {
  return r >= 0 && r < board.length && c >= 0 && c < board[r].length;
}

function neighbors(r: number, c: number, rows: number, cols: number): Move[] {
  const result: Move[] = [];
  for (const [dr, dc] of NEIGHBOR_STEPS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      result.push([nr, nc]);
    }
  }
  return result;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isPegOwnedByPlayer(player: Player, row: number): boolean {
  return player === "B" ? row % 2 === 0 : row % 2 === 1;
}

function logicalSize(board: Board): number {
  return Math.floor((board.length + 1) / 2);
}

function playerDimensions(board: Board, player: Player): { rows: number; cols: number } {
  const n = logicalSize(board);
  if (player === "B") {
    return { rows: n, cols: n - 1 };
  }
  return { rows: n - 1, cols: n };
}

function toVisualCoords(player: Player, r: number, c: number): Move {
  return player === "B" ? [r * 2, c] : [r * 2 + 1, c];
}

function visualPoint(row: number, col: number): Point {
  return { x: 2 * col + (row % 2 === 0 ? 1 : 0), y: 2 * row };
}

function getPlayerCell(board: Board, player: Player, r: number, c: number): Cell {
  const [vr, vc] = toVisualCoords(player, r, c);
  return board[vr][vc];
}

function collectPlayerSegments(board: Board, player: Player): Segment[] {
  const { rows, cols } = playerDimensions(board, player);
  const segments: Segment[] = [];
  const forwardSteps: Move[] = [
    [1, 0],
    [0, 1],
  ];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (getPlayerCell(board, player, r, c) !== player) {
        continue;
      }

      for (const [dr, dc] of forwardSteps) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
          continue;
        }
        if (getPlayerCell(board, player, nr, nc) !== player) {
          continue;
        }

        const [vr1, vc1] = toVisualCoords(player, r, c);
        const [vr2, vc2] = toVisualCoords(player, nr, nc);
        segments.push({ a: visualPoint(vr1, vc1), b: visualPoint(vr2, vc2) });
      }
    }
  }

  return segments;
}

function collectAllSegments(board: Board): Segment[] {
  return [...collectPlayerSegments(board, "R"), ...collectPlayerSegments(board, "B")];
}

function toLogicalCoords(player: Player, move: Move): Move {
  const [vr, vc] = move;
  return player === "B" ? [Math.floor(vr / 2), vc] : [Math.floor((vr - 1) / 2), vc];
}

function segmentsFromNewMove(board: Board, player: Player, move: Move): Segment[] {
  const { rows, cols } = playerDimensions(board, player);
  const [lr, lc] = toLogicalCoords(player, move);
  const segments: Segment[] = [];

  if (lr < 0 || lr >= rows || lc < 0 || lc >= cols) {
    return segments;
  }

  for (const [nr, nc] of neighbors(lr, lc, rows, cols)) {
    if (getPlayerCell(board, player, nr, nc) !== player) {
      continue;
    }
    const [vr1, vc1] = toVisualCoords(player, lr, lc);
    const [vr2, vc2] = toVisualCoords(player, nr, nc);
    segments.push({ a: visualPoint(vr1, vc1), b: visualPoint(vr2, vc2) });
  }

  return segments;
}

function pointsEqual(p1: Point, p2: Point): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}

function orientation(a: Point, b: Point, c: Point): number {
  const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (v === 0) {
    return 0;
  }
  return v > 0 ? 1 : -1;
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    b.x >= Math.min(a.x, c.x) &&
    b.x <= Math.max(a.x, c.x) &&
    b.y >= Math.min(a.y, c.y) &&
    b.y <= Math.max(a.y, c.y)
  );
}

function segmentsCollide(s1: Segment, s2: Segment): boolean {
  if (
    pointsEqual(s1.a, s2.a) ||
    pointsEqual(s1.a, s2.b) ||
    pointsEqual(s1.b, s2.a) ||
    pointsEqual(s1.b, s2.b)
  ) {
    return false;
  }

  const o1 = orientation(s1.a, s1.b, s2.a);
  const o2 = orientation(s1.a, s1.b, s2.b);
  const o3 = orientation(s2.a, s2.b, s1.a);
  const o4 = orientation(s2.a, s2.b, s1.b);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  if (o1 === 0 && onSegment(s1.a, s2.a, s1.b)) {
    return true;
  }
  if (o2 === 0 && onSegment(s1.a, s2.b, s1.b)) {
    return true;
  }
  if (o3 === 0 && onSegment(s2.a, s1.a, s2.b)) {
    return true;
  }
  if (o4 === 0 && onSegment(s2.a, s1.b, s2.b)) {
    return true;
  }

  return false;
}

export function placeToken(board: Board, move: Move, token: Player): Board {
  const [r, c] = move;
  if (!inBounds(board, r, c) || board[r][c] !== "." || !isPegOwnedByPlayer(token, r)) {
    return board;
  }
  const next = cloneBoard(board);
  next[r][c] = token;

  const existingSegments = collectAllSegments(board);
  const newSegments = segmentsFromNewMove(next, token, move);
  for (const seg of newSegments) {
    for (const existing of existingSegments) {
      if (segmentsCollide(seg, existing)) {
        return board;
      }
    }
  }

  return next;
}

export function availableMoves(board: Board, player?: Player): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      if (board[r][c] === "." && (!player || isPegOwnedByPlayer(player, r))) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

export function legalMoves(board: Board, player: Player): Move[] {
  return availableMoves(board, player).filter((move) => placeToken(board, move, player) !== board);
}

function hasWinningPath(board: Board, player: Player): boolean {
  const { rows, cols } = playerDimensions(board, player);
  const queue: Move[] = [];
  const seen = new Set<string>();

  if (player === "B") {
    for (let c = 0; c < cols; c += 1) {
      if (getPlayerCell(board, "B", 0, c) === "B") {
        queue.push([0, c]);
        seen.add(`0:${c}`);
      }
    }
  } else {
    for (let r = 0; r < rows; r += 1) {
      if (getPlayerCell(board, "R", r, 0) === "R") {
        queue.push([r, 0]);
        seen.add(`${r}:0`);
      }
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift() as Move;

    if (player === "B" && r === rows - 1) {
      return true;
    }
    if (player === "R" && c === cols - 1) {
      return true;
    }

    for (const [nr, nc] of neighbors(r, c, rows, cols)) {
      const key = `${nr}:${nc}`;
      if (seen.has(key)) {
        continue;
      }
      if (getPlayerCell(board, player, nr, nc) !== player) {
        continue;
      }
      seen.add(key);
      queue.push([nr, nc]);
    }
  }

  return false;
}

export function winner(board: Board): Winner {
  if (hasWinningPath(board, "B")) {
    return "B";
  }

  if (hasWinningPath(board, "R")) {
    return "R";
  }

  if (legalMoves(board, "R").length === 0 && legalMoves(board, "B").length === 0) {
    return "Draw";
  }

  return null;
}

export function connectionDistance(board: Board, player: Player): number {
  const { rows, cols } = playerDimensions(board, player);
  const inf = Number.MAX_SAFE_INTEGER;
  const dist: number[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => inf));
  const deque: Move[] = [];

  const targets: Move[] = [];

  if (player === "B") {
    for (let c = 0; c < cols; c += 1) {
      const cell = getPlayerCell(board, "B", 0, c);
      const cost = cell === "B" ? 0 : 1;
      dist[0][c] = cost;
      if (cost === 0) {
        deque.unshift([0, c]);
      } else {
        deque.push([0, c]);
      }
    }
    for (let c = 0; c < cols; c += 1) {
      targets.push([rows - 1, c]);
    }
  } else {
    for (let r = 0; r < rows; r += 1) {
      const cell = getPlayerCell(board, "R", r, 0);
      const cost = cell === "R" ? 0 : 1;
      dist[r][0] = cost;
      if (cost === 0) {
        deque.unshift([r, 0]);
      } else {
        deque.push([r, 0]);
      }
    }
    for (let r = 0; r < rows; r += 1) {
      targets.push([r, cols - 1]);
    }
  }

  while (deque.length > 0) {
    const [r, c] = deque.shift() as Move;

    for (const [nr, nc] of neighbors(r, c, rows, cols)) {
      const w = getPlayerCell(board, player, nr, nc) === player ? 0 : 1;
      const nd = dist[r][c] + w;
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd;
        if (w === 0) {
          deque.unshift([nr, nc]);
        } else {
          deque.push([nr, nc]);
        }
      }
    }
  }

  let best = inf;
  for (const [r, c] of targets) {
    best = Math.min(best, dist[r][c]);
  }
  return best;
}

export function evaluate(board: Board): number {
  const w = winner(board);
  if (w === "B") {
    return 100000;
  }
  if (w === "R") {
    return -100000;
  }

  const b = connectionDistance(board, "B");
  const r = connectionDistance(board, "R");

  const bMobility = legalMoves(board, "B").length;
  const rMobility = legalMoves(board, "R").length;

  return (r - b) * 100 + (bMobility - rMobility) * 2;
}

function immediateWinningMoves(board: Board, player: Player): Move[] {
  const wins: Move[] = [];
  for (const move of legalMoves(board, player)) {
    const trial = placeToken(board, move, player);
    if (winner(trial) === player) {
      wins.push(move);
    }
  }
  return wins;
}

function boardKey(board: Board): string {
  return board.map((row) => row.join("")).join("|");
}

function timeExceeded(deadlineTs?: number): boolean {
  return deadlineTs !== undefined && Date.now() >= deadlineTs;
}

function centerBias(board: Board, move: Move): number {
  const [r, c] = move;
  const rowCenter = (board.length - 1) / 2;
  const colCenter = (board[r].length - 1) / 2;
  return -Math.abs(r - rowCenter) - Math.abs(c - colCenter);
}

export function orderedMoves(board: Board, maximizing: boolean): Move[] {
  const token: Player = maximizing ? "B" : "R";
  const scored: Array<{ move: Move; score: number; tie: number }> = [];

  for (const move of legalMoves(board, token)) {
    const trial = placeToken(board, move, token);
    scored.push({ move, score: evaluate(trial), tie: centerBias(board, move) });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) {
      return maximizing ? b.score - a.score : a.score - b.score;
    }
    return b.tie - a.tie;
  });
  return scored.map((x) => x.move);
}

export function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  cache?: Map<string, TTValue>,
  deadlineTs?: number,
): { score: number; move: Move | null } {
  if (timeExceeded(deadlineTs)) {
    return { score: evaluate(board), move: null };
  }

  const cacheKey = `${boardKey(board)}|${depth}|${maximizing ? 1 : 0}`;
  if (cache) {
    const hit = cache.get(cacheKey);
    if (hit) {
      return hit;
    }
  }

  const w = winner(board);
  if (w !== null || depth === 0) {
    const terminal = { score: evaluate(board), move: null };
    cache?.set(cacheKey, terminal);
    return terminal;
  }

  const currentPlayer: Player = maximizing ? "B" : "R";
  const legal = legalMoves(board, currentPlayer);
  if (legal.length === 0) {
    const exhausted = { score: evaluate(board), move: null };
    cache?.set(cacheKey, exhausted);
    return exhausted;
  }

  let bestMove: Move | null = null;

  if (maximizing) {
    let bestVal = Number.NEGATIVE_INFINITY;
    for (const move of orderedMoves(board, true)) {
      const trial = placeToken(board, move, "B");
      const result = minimax(trial, depth - 1, alpha, beta, false, cache, deadlineTs);
      if (result.score > bestVal) {
        bestVal = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestVal);
      if (beta <= alpha) {
        break;
      }
      if (timeExceeded(deadlineTs)) {
        break;
      }
    }
    const resolved = { score: bestVal, move: bestMove };
    cache?.set(cacheKey, resolved);
    return resolved;
  }

  let bestVal = Number.POSITIVE_INFINITY;
  for (const move of orderedMoves(board, false)) {
    const trial = placeToken(board, move, "R");
    const result = minimax(trial, depth - 1, alpha, beta, true, cache, deadlineTs);
    if (result.score < bestVal) {
      bestVal = result.score;
      bestMove = move;
    }
    beta = Math.min(beta, bestVal);
    if (beta <= alpha) {
      break;
    }
    if (timeExceeded(deadlineTs)) {
      break;
    }
  }
  const resolved = { score: bestVal, move: bestMove };
  cache?.set(cacheKey, resolved);
  return resolved;
}

function randomChoice<T>(items: T[], rng: () => number): T {
  const idx = Math.floor(rng() * items.length);
  return items[idx];
}

export function aiMove(board: Board, difficulty: Difficulty, rng: () => number = Math.random): Move | null {
  const moves = legalMoves(board, "B");
  if (moves.length === 0) {
    return null;
  }

  const n = logicalSize(board);
  if (difficulty === "easy") {
    const depth = n <= 5 ? 1 : 0;
    if (depth === 0) {
      return randomChoice(moves, rng);
    }

    const choices = moves.map((move) => {
      const trial = placeToken(board, move, "B");
      return { move, score: evaluate(trial) };
    });

    choices.sort((a, b) => b.score - a.score);
    const topCount = Math.max(1, Math.floor(choices.length / 3));
    const top = choices.slice(0, topCount).map((x) => x.move);
    return randomChoice(top, rng);
  }

  for (const move of moves) {
    const trial = placeToken(board, move, "B");
    if (winner(trial) === "B") {
      return move;
    }
  }

  // Threat-aware preselection: if red has immediate wins, prioritize moves that reduce them.
  const redThreatsNow = immediateWinningMoves(board, "R");
  let candidateMoves = moves;
  if (redThreatsNow.length > 0) {
    let bestThreatCount = Number.POSITIVE_INFINITY;
    const filtered: Move[] = [];

    for (const move of moves) {
      const trial = placeToken(board, move, "B");
      const redThreatCount = immediateWinningMoves(trial, "R").length;
      if (redThreatCount < bestThreatCount) {
        bestThreatCount = redThreatCount;
        filtered.length = 0;
        filtered.push(move);
      } else if (redThreatCount === bestThreatCount) {
        filtered.push(move);
      }
    }

    candidateMoves = filtered.length > 0 ? filtered : moves;
  }

  const maxDepth = n === 3 ? 7 : n === 5 ? 5 : 4;
  const timeBudgetMs = n === 3 ? 1800 : n === 5 ? 1600 : 1200;
  const deadlineTs = Date.now() + timeBudgetMs;
  const cache = new Map<string, TTValue>();

  let best: Move | null = candidateMoves[0] ?? null;
  for (let depth = 2; depth <= maxDepth; depth += 1) {
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestMoveAtDepth: Move | null = null;

    for (const move of candidateMoves) {
      const trial = placeToken(board, move, "B");
      const result = minimax(
        trial,
        depth - 1,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        false,
        cache,
        deadlineTs,
      );
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMoveAtDepth = move;
      }
      if (timeExceeded(deadlineTs)) {
        break;
      }
    }

    if (bestMoveAtDepth) {
      best = bestMoveAtDepth;
    }
    if (timeExceeded(deadlineTs)) {
      break;
    }
  }

  return best ?? randomChoice(moves, rng);
}
