# Keep the architecture clean as the team grows

Write down which parts of your app may talk to which. Your agent checks every change against those rules and flags any import that breaks them, with the commit that added it and the fix.

Use it when:
- A PR touches more than one module or service.
- You suspect the codebase is drifting from its design.
- You want a weekly architecture check without a meeting.

Try it: "/stay-in-the-lines on this PR"
