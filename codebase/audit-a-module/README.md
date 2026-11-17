# Should you refactor it, rewrite it, or leave it alone?

Your agent audits one module on one screen: what it does, who depends on it, how risky it is, how well it's tested and how often it breaks. Then it tells you what to do and the three changes that would help most.

Use it when:
- Someone wants to rewrite a scary part of the codebase.
- You're deciding where to spend a cleanup sprint.
- A module keeps causing bugs and you want to know why.

Try it: "/audit-a-module src/billing"
