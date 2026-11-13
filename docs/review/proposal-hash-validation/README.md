# Task-scoped evaluation continuation

The user reopened non-production evaluation so the corrected proposal hash can
receive fresh model validation. The previous 242-call cap was a project policy,
implemented by the historical runner and its authorization file; it was not an
OpenAI or Codex quota. Those records and their execution locks remain unchanged.

[authorization.json](authorization.json) records the actual user request. There is
no new cumulative project cap for this task. The first finite test matrix contains
32 calls: nine affected contexts three times and five negative controls once.
That is the amount of work selected for this comparison, not a newly imposed
spending allowance. Calls must still be reserved durably before sending, confined
to the non-production Responses API and recorded with usage. A spent reservation
is never erased. The runner stops on credential, transport or schema failure;
there are no automatic retries or unplanned evaluation loops.

The runtime remains at checkpoint `60da9e019b7cf20009ba5742061560e60aa75676`:
materializer v0.3.10, proposal v2.5, task policy v1.5, reasoning-v0.3.3,
findings-v0.2, gpt-5.6-terra / low. New scripts and evidence do not change output
generation. Fresh outputs require their own semantic review; original human
acceptance does not transfer. Exact task execution approval and release remain
separate. No deployment, HubSpot request, CRM write or email delivery is permitted.

## Commands

```sh
node scripts/release/proposal-hash-model.js --plan
EVAL_VALIDATION_SOURCE_SHA=$(git rev-parse HEAD) NODE_USE_ENV_PROXY=1 node scripts/release/proposal-hash-model.js --live --non-production
node scripts/release/analyze-proposal-hash-model.js
```

The live command is one-shot and requires a committed source snapshot and the
securely configured `EVAL_OPENAI_API_KEY`; never paste or print its value. Existing
execution locks and journals must not be deleted to repeat a run. Any necessary
continuation must preserve partial results and use a separately recorded finite
matrix. Current results will be recorded after execution; preparation is not a
claim that calls succeeded.
