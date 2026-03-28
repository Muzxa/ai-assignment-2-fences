import random

N = 8
POP_SIZE = 500
GENERATIONS = 100
CROSSOVER_PROB = 0.8
MUTATION_PROB = 0.05


def fitness(ch):
    conflicts = 0
    for i in range(N):
        for j in range(i + 1, N):
            if abs(ch[i] - ch[j]) == abs(i - j):
                conflicts += 1
    return 28 - conflicts


def random_chromosome():
    ch = list(range(N))
    random.shuffle(ch)
    return ch


def roulette_select(pop, fits):
    total = sum(fits)
    if total == 0:
        return random.choice(pop)[:]
    pick = random.uniform(0, total)
    s = 0
    for ch, f in zip(pop, fits):
        s += f
        if s >= pick:
            return ch[:]
    return pop[-1][:]


def tournament_select(pop, fits, k=3):
    ids = random.sample(range(len(pop)), k)
    best = ids[0]
    for i in ids[1:]:
        if fits[i] > fits[best]:
            best = i
    return pop[best][:]


def order_crossover(p1, p2):
    a, b = sorted(random.sample(range(N), 2))
    child = [-1] * N
    child[a:b] = p1[a:b]
    fill = [x for x in p2 if x not in child]
    idx = 0
    for i in range(N):
        if child[i] == -1:
            child[i] = fill[idx]
            idx += 1
    return child


def mutate(ch):
    if random.random() < MUTATION_PROB:
        i, j = random.sample(range(N), 2)
        ch[i], ch[j] = ch[j], ch[i]


def run_ga(selection):
    pop = [random_chromosome() for _ in range(POP_SIZE)]
    best = pop[0][:]
    best_fit = fitness(best)
    for _ in range(GENERATIONS):
        fits = [fitness(ch) for ch in pop]
        m = max(fits)
        if m > best_fit:
            best_fit = m
            best = pop[fits.index(m)][:]
        if best_fit == 28:
            break
        new_pop = []
        while len(new_pop) < POP_SIZE:
            if selection == "roulette":
                p1 = roulette_select(pop, fits)
                p2 = roulette_select(pop, fits)
            else:
                p1 = tournament_select(pop, fits)
                p2 = tournament_select(pop, fits)
            if random.random() < CROSSOVER_PROB:
                c1 = order_crossover(p1, p2)
                c2 = order_crossover(p2, p1)
            else:
                c1, c2 = p1[:], p2[:]
            mutate(c1)
            mutate(c2)
            new_pop.append(c1)
            if len(new_pop) < POP_SIZE:
                new_pop.append(c2)
        pop = new_pop
    return best, best_fit


def print_board(ch):
    for r in range(N):
        row = []
        for c in range(N):
            row.append("Q" if ch[c] == r else ".")
        print(" ".join(row))


def main():
    b1, f1 = run_ga("roulette")
    print("Roulette Wheel / Proportionate Selection")
    print("Chromosome:", b1)
    print("Fitness:", f1)
    print_board(b1)
    print()
    b2, f2 = run_ga("tournament")
    print("Tournament Selection")
    print("Chromosome:", b2)
    print("Fitness:", f2)
    print_board(b2)


if __name__ == "__main__":
    main()
