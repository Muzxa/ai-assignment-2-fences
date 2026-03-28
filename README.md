# Fences Minimax (Q1)

This project implements Question 1 as a React TypeScript app using Next.js.

## Features

- Human vs AI fences game
- Minimax with alpha-beta pruning
- Difficulty levels: easy and hard
- Board sizes: 3x3, 5x5, 10x10
- Restart button
- Move history
- AI thinking indicator

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test and build

```bash
npm run test
npm run build
```

## Notes

- Existing assignment files `23L-1004_Q1.py` and `23L-1004_Q2.py` are preserved.
- TypeScript logic in `lib/fences.ts` mirrors Q1 minimax behavior.
- If you ever see a `Failed to load chunk` error during development, run `npm run clean` and restart with `npm run dev`.
- Hard AI still uses Minimax + alpha-beta pruning, now improved with iterative deepening and transposition caching for stronger play.
