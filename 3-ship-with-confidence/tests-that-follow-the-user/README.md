# Tests that prove what your users actually do

![](overview.png)

Your agent writes and reviews tests that walk the real user journey through the real app, with fakes only at the edges you can't control. You get tests that fail when the product breaks, not tests that pass because they mocked everything.

Use it when:
- Your agent is writing or fixing tests and you want them to mean something.
- You want an audit of an existing test suite.
- A redesign or migration needs proof that nothing got lost and nothing is duplicated.

Try it: "Review the tests in this PR against tests-that-follow-the-user and tell me which ones would pass with the feature deleted."
