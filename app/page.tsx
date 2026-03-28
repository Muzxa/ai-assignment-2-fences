import { FencesGame } from "@/components/FencesGame";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">AI Assignment - Question 1</p>
        <h1>Fences: Minimax with Alpha-Beta Pruning</h1>
        <p>
          Connect Red from left to right before Blue connects top to bottom. You
          are Red; the computer is Blue.
        </p>
      </section>
      <FencesGame />
    </main>
  );
}
