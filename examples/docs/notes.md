# Longer notes

These notes are useful background but they are not needed for every task.
They cover the history of the preflight idea, alternatives that were
considered, and questions that remain open for a later version.

One alternative was to summarise every file with a model before deciding
what to include. That spends the tokens the tool is trying to save, so it
was rejected for version zero. Another alternative was to truncate every
file at a fixed length. That is cheap but it can cut a file in the middle
of the one section that matters.

Open questions include how to handle binary files, how to rank prose when
size alone is a poor proxy for value, and whether budgets should be set
per task or per run. None of those are answered here. They are recorded
so a future version can address them with evidence rather than guessing.
