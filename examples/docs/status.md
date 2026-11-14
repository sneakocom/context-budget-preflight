# Service status log

This file is a sample status document. Most lines are background prose that
an agent does not need when it only wants the current facts. Keeping the
whole file in context wastes tokens on history, repetition, and explanation.

version: 0.1.0
The service was first sketched as a small local check. Early runs printed
everything they read. That was simple but expensive in context terms because
large JSON responses and long documents were copied in full.

Background note. A run list can contain dozens of entries, each with ids,
timestamps, urls, actor objects, and nested fields. Only a few fields answer
the actual question, such as the conclusion of the latest run.

status: ok
Another background note. A status document can grow over weeks. Old entries
remain useful for humans browsing the history, but they rarely change the
answer to what is the current revision or whether the last deploy passed.

More filler prose to make the extraction saving visible in the example.
This paragraph repeats the point in different words. It describes routine
checks, log retention, and why archives are kept, none of which is a current
fact. An extractor that keeps only the matching lines drops all of it.

revision: abc1234
Final background note. When the matching lines are three short lines and
the file is several dozen lines, the saving is large even though the method
is trivial. That is the point of the demo. No model call is needed to do it.
