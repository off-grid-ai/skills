# score.py

This is the `score.py` file for this skill, stored as Markdown so the skill folder holds no runnable files. To use it, write the code block below, exactly as it is, to a file named `score.py` at the same relative path in a work folder (the "Bundled files" section of SKILL.md has the command that does this for every file at once), then run that copy.

~~~~~python
#!/usr/bin/env python3
"""Total the option scores and work out what would change the answer.

Usage: python3 score.py decision.json

decision.json:
{
  "points": {"Follows the rules": 35, "Checks sources": 30, ...},   # must add to 100
  "options": {"Mix": {"Follows the rules": 8, ...}, "Our own": {...}}  # scores 1-10
}

Prints each option's total out of 1,000, the lead, and for each rival the
smallest move of points between two criteria that would make it win, plus
the plain-words thresholds ("X wins only if <criterion> gets more than N points").
"""
import json
import sys


def totals(points, options):
    return {name: sum(points[c] * s[c] for c in points) for name, s in options.items()}


def flips(points, leader, rival):
    """Smallest points move (from a to b) that makes rival overtake leader."""
    d = {c: leader[c] - rival[c] for c in points}
    gap = sum(points[c] * d[c] for c in points)
    moves = []
    for a in points:
        for b in points:
            if a == b:
                continue
            per_point = d[a] - d[b]  # gap shrinks by this much per point moved a -> b
            if per_point <= 0:
                continue
            needed = gap / per_point  # moving exactly this many ties; more flips it
            if needed < points[a]:
                moves.append((needed, a, b))
    moves.sort()
    return gap, moves


def main():
    data = json.load(open(sys.argv[1]))
    points, options = data["points"], data["options"]
    if sum(points.values()) != 100:
        sys.exit(f"Points add to {sum(points.values())}, not 100.")
    for name, s in options.items():
        missing = set(points) - set(s)
        if missing:
            sys.exit(f"{name} has no score for: {', '.join(sorted(missing))}")

    t = totals(points, options)
    ranked = sorted(t, key=t.get, reverse=True)
    print("Totals (of 1,000):")
    for name in ranked:
        print(f"  {name}: {t[name]}")
    leader = ranked[0]
    if len(ranked) > 1 and t[ranked[1]] == t[leader]:
        print(f"\nTie at the top: {leader} and {ranked[1]}. No single winner.")
        return

    print(f"\n{leader} leads.")
    for rival in ranked[1:]:
        gap, moves = flips(points, options[leader], options[rival])
        print(f"\nAgainst {rival} (behind by {gap}):")
        if not moves:
            print("  No move of points between two criteria makes it win.")
            continue
        needed, a, b = moves[0]
        print(f"  Smallest change that makes it win: move more than {needed:g} points from '{a}' to '{b}'.")
        best_into = {}
        for n, a, b in moves:
            best_into.setdefault(b, (n, a))
        for b, (n, a) in sorted(best_into.items(), key=lambda kv: kv[1][0]):
            print(f"  {rival} wins only if '{b}' gets more than {points[b] + n:g} points (taken from '{a}').")


if __name__ == "__main__":
    main()
~~~~~
