# Know what breaks before you change it

Before your agent touches shared code, it finds everything that depends on it, gives the change a risk score and stops to ask when the score is high. No more "small refactor" that takes down three screens.

Use it when:
- You're changing a shared function, type, API or schema.
- The codebase is big and old and nobody remembers what calls what.
- You want your AI to ask before the risky edits, not after.

Try it: "What's the blast radius of renaming userId to accountId?"
