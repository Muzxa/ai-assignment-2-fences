import math
import random
from collections import deque

SIZES = {"small": 3, "medium": 5, "large": 10}


def neighbors(r, c, n):
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, 1), (1, -1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < n and 0 <= nc < n:
            yield nr, nc


def winner(board):
    n = len(board)
    q = deque()
    seen = set()
    for c in range(n):
        if board[0][c] == "B":
            q.append((0, c))
            seen.add((0, c))
    while q:
        r, c = q.popleft()
        if r == n - 1:
            return "B"
        for nr, nc in neighbors(r, c, n):
            if board[nr][nc] == "B" and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append((nr, nc))
    q = deque()
    seen = set()
    for r in range(n):
        if board[r][0] == "R":
            q.append((r, 0))
            seen.add((r, 0))
    while q:
        r, c = q.popleft()
        if c == n - 1:
            return "R"
        for nr, nc in neighbors(r, c, n):
            if board[nr][nc] == "R" and (nr, nc) not in seen:
                seen.add((nr, nc))
                q.append((nr, nc))
    return None


def connection_distance(board, player):
    n = len(board)
    inf = 10**9
    dist = [[inf] * n for _ in range(n)]
    dq = deque()
    if player == "B":
        for c in range(n):
            cell = board[0][c]
            if cell == "R":
                continue
            cost = 0 if cell == "B" else 1
            dist[0][c] = cost
            if cost == 0:
                dq.appendleft((0, c))
            else:
                dq.append((0, c))
        targets = {(n - 1, c) for c in range(n)}
        block = "R"
    else:
        for r in range(n):
            cell = board[r][0]
            if cell == "B":
                continue
            cost = 0 if cell == "R" else 1
            dist[r][0] = cost
            if cost == 0:
                dq.appendleft((r, 0))
            else:
                dq.append((r, 0))
        targets = {(r, n - 1) for r in range(n)}
        block = "B"
    while dq:
        r, c = dq.popleft()
        for nr, nc in neighbors(r, c, n):
            if board[nr][nc] == block:
                continue
            w = 0 if board[nr][nc] == player else 1
            nd = dist[r][c] + w
            if nd < dist[nr][nc]:
                dist[nr][nc] = nd
                if w == 0:
                    dq.appendleft((nr, nc))
                else:
                    dq.append((nr, nc))
    best = min(dist[r][c] for r, c in targets)
    return best


def evaluate(board):
    w = winner(board)
    if w == "B":
        return 100000
    if w == "R":
        return -100000
    b = connection_distance(board, "B")
    r = connection_distance(board, "R")
    return r - b


def available_moves(board):
    n = len(board)
    moves = []
    for r in range(n):
        for c in range(n):
            if board[r][c] == ".":
                moves.append((r, c))
    return moves


def ordered_moves(board, maximizing):
    token = "B" if maximizing else "R"
    scored = []
    for r, c in available_moves(board):
        board[r][c] = token
        scored.append((evaluate(board), (r, c)))
        board[r][c] = "."
    scored.sort(reverse=maximizing, key=lambda x: x[0])
    return [m for _, m in scored]


def minimax(board, depth, alpha, beta, maximizing):
    w = winner(board)
    if w or depth == 0 or not available_moves(board):
        return evaluate(board), None
    best_move = None
    if maximizing:
        best_val = -math.inf
        for r, c in ordered_moves(board, True):
            board[r][c] = "B"
            val, _ = minimax(board, depth - 1, alpha, beta, False)
            board[r][c] = "."
            if val > best_val:
                best_val = val
                best_move = (r, c)
            alpha = max(alpha, best_val)
            if beta <= alpha:
                break
        return best_val, best_move
    best_val = math.inf
    for r, c in ordered_moves(board, False):
        board[r][c] = "R"
        val, _ = minimax(board, depth - 1, alpha, beta, True)
        board[r][c] = "."
        if val < best_val:
            best_val = val
            best_move = (r, c)
        beta = min(beta, best_val)
        if beta <= alpha:
            break
    return best_val, best_move


def ai_move(board, difficulty):
    n = len(board)
    if difficulty == "easy":
        depth = 1 if n <= 5 else 0
        if depth == 0:
            return random.choice(available_moves(board))
        choices = []
        for r, c in available_moves(board):
            board[r][c] = "B"
            choices.append((evaluate(board), (r, c)))
            board[r][c] = "."
        choices.sort(reverse=True, key=lambda x: x[0])
        top = choices[: max(1, len(choices) // 3)]
        return random.choice(top)[1]
    depth = 3 if n == 3 else 2
    _, move = minimax(board, depth, -math.inf, math.inf, True)
    if move is None:
        return random.choice(available_moves(board))
    return move


def show(board):
    n = len(board)
    print("  " + " ".join(str(i) for i in range(n)))
    for i, row in enumerate(board):
        print(str(i) + " " + " ".join(row))


def play():
    size_name = input("Choose board size (small/medium/large): ").strip().lower()
    difficulty = input("Choose AI level (easy/hard): ").strip().lower()
    n = SIZES[size_name]
    board = [["."] * n for _ in range(n)]
    turn = "R"
    while True:
        show(board)
        w = winner(board)
        if w:
            if w == "B":
                print("Blue Player wins")
            else:
                print("Red Player wins")
            break
        if not available_moves(board):
            print("Draw")
            break
        if turn == "R":
            r, c = map(int, input("Your move row col: ").split())
            if 0 <= r < n and 0 <= c < n and board[r][c] == ".":
                board[r][c] = "R"
                turn = "B"
        else:
            r, c = ai_move(board, difficulty)
            board[r][c] = "B"
            print("Computer move:", r, c)
            turn = "R"


if __name__ == "__main__":
    play()
