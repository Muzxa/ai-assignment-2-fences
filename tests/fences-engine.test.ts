import {
  availableMoves,
  aiMove,
  createBoard,
  isPegOwnedByPlayer,
  legalMoves,
  placeToken,
  winner,
} from "@/lib/fences";

describe("fences engine", () => {
  it("detects red left-to-right win", () => {
    let board = createBoard("small");
    board = placeToken(board, [1, 0], "R");
    board = placeToken(board, [1, 1], "R");
    board = placeToken(board, [1, 2], "R");
    expect(winner(board)).toBe("R");
  });

  it("detects blue top-to-bottom win", () => {
    let board = createBoard("small");
    board = placeToken(board, [0, 0], "B");
    board = placeToken(board, [2, 0], "B");
    board = placeToken(board, [4, 0], "B");
    expect(winner(board)).toBe("B");
  });

  it("returns legal move for easy AI", () => {
    const board = createBoard("small");
    const move = aiMove(board, "easy", () => 0.1);
    expect(move).not.toBeNull();
    if (move) {
      expect(board[move[0]][move[1]]).toBe(".");
      expect(move[0] % 2).toBe(0);
    }
  });

  it("hard AI finds immediate winning blue move", () => {
    let board = createBoard("small");
    board = placeToken(board, [0, 0], "B");
    board = placeToken(board, [2, 0], "B");

    const move = aiMove(board, "hard", () => 0.1);
    expect(move).toEqual([4, 0]);

    if (move) {
      const withMove = placeToken(board, move, "B");
      expect(winner(withMove)).toBe("B");
    }
  });

  it("enforces peg ownership by row", () => {
    expect(isPegOwnedByPlayer("B", 0)).toBe(true);
    expect(isPegOwnedByPlayer("R", 0)).toBe(false);
    expect(isPegOwnedByPlayer("R", 1)).toBe(true);
    expect(isPegOwnedByPlayer("B", 1)).toBe(false);
  });

  it("filters legal moves per player-owned rows", () => {
    const board = createBoard("small");
    const redMoves = availableMoves(board, "R");
    const blueMoves = availableMoves(board, "B");

    expect(redMoves.every(([r]) => r % 2 === 1)).toBe(true);
    expect(blueMoves.every(([r]) => r % 2 === 0)).toBe(true);
    expect(redMoves).toHaveLength(6);
    expect(blueMoves).toHaveLength(6);
  });

  it("applies asymmetric geometry across sizes", () => {
    const small = createBoard("small");
    const medium = createBoard("medium");
    const large = createBoard("large");

    expect(small.length).toBe(5);
    expect(small[0]).toHaveLength(2);
    expect(small[1]).toHaveLength(3);

    expect(medium.length).toBe(9);
    expect(medium[0]).toHaveLength(4);
    expect(medium[1]).toHaveLength(5);

    expect(large.length).toBe(19);
    expect(large[0]).toHaveLength(9);
    expect(large[1]).toHaveLength(10);
  });

  it("rejects moves that create colliding fences", () => {
    let board = createBoard("medium");

    board = placeToken(board, [3, 0], "R");
    board = placeToken(board, [3, 1], "R");
    board = placeToken(board, [2, 0], "B");

    const next = placeToken(board, [4, 0], "B");
    expect(next).toBe(board);
  });

  it("filters out collision moves from legalMoves", () => {
    let board = createBoard("medium");

    board = placeToken(board, [3, 0], "R");
    board = placeToken(board, [3, 1], "R");
    board = placeToken(board, [2, 0], "B");

    const legalBlue = legalMoves(board, "B");
    expect(legalBlue).not.toContainEqual([4, 0]);
  });

  it("hard AI reduces immediate red winning threats", () => {
    let board = createBoard("small");
    board = placeToken(board, [1, 0], "R");
    board = placeToken(board, [1, 1], "R");

    const beforeThreats = legalMoves(board, "R").filter((m) => winner(placeToken(board, m, "R")) === "R").length;
    const move = aiMove(board, "hard", () => 0.1);
    expect(move).not.toBeNull();

    if (move) {
      const afterBoard = placeToken(board, move, "B");
      const afterThreats = legalMoves(afterBoard, "R").filter((m) => winner(placeToken(afterBoard, m, "R")) === "R").length;
      expect(afterThreats).toBeLessThanOrEqual(beforeThreats);
    }
  });
});
