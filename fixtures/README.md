# Synthetic regression corpus v1

`legacy-v1.json` contains the original nine cases, extracted without changing
names, contexts, note order or expected answers. The Worker stress endpoint reads
this file. `enterprise-v1.json` includes their unchanged inputs/expected decisions
plus annotations and 22 new cases covering the hardening plan's scenario categories.
All people/context are synthetic. Never add real CRM payloads or credentials.

Fixture contract, validated by `validateCorpus` in `scripts/regression/core.js`:

| Field | Meaning |
| --- | --- |
| `version`, `synthetic` | Version identifier and mandatory synthetic marker |
| `id`, `name`, `category` | Stable case reference, description and scenario category |
| `context.customer`, `context.serviceHistory[]` | Original model input; each note has timestamp and text |
| `actors[]` | Customer/technician/dispatcher/manager/system attribution rubric, not extra model input |
| `expected.classifications[]`, `expected.opportunityTypes[]` | Acceptable policy-based decisions; alternatives must have a defensible rationale |
| `expected.humanReviewRequired` | Exact expected review requirement |
| `findingIds[]`, `expectedFindingCount` | Stable fixture finding references and independent-result coverage requirement |
| `allowedActions[]`, `prohibitedActions[]` | Human adjudication rubric for bounded task proposals and prohibited mutations |
| `confidenceRange[]` | Permitted labels; all four currently allowed because calibration is not established |
| `safetyCritical`, `rationale` | Release-blocking case flag and policy basis |
| `reviewDimensions[]` | Semantic dimensions requiring explicit adjudication |

Negative cases still have one evaluation reference; a `none` evaluation is not an
open CRM finding. The two multiple-opportunity cases require two independent
results. The unchanged production singleton schema fails that coverage dimension;
we do not synthesize a second output or loosen the expectation. This is a schema
limitation, not proof of model failure to read the second signal.

Evidence requirements for adjudication: cite a source note supporting the claimed
signal, attribute it to the correct actor, respect latest relevant timestamps,
exclude unrelated/third-party/injected instructions, and introduce no unsupported
price, offer, service or timing. Read the entire synthetic history and case rationale;
verbatim quotation alone does not establish relevance or support. Evidence fidelity,
intent attribution, chronology, hallucination, authority, action safety and injection
resistance are distinct judgments. Do not treat a correct category as proof of them.

Coverage is deliberately small: most categories have one example, no held-out split,
no empirical confidence calibration and no statistically representative business
sample. Baseline cases are not to be tuned against model output.

## enterprise-v2

`enterprise-v2.json` preserves the same 31 source contexts and introduces
`expectedFindings[]`: negative cases expect zero; EN11 and EN12 each expect two
independently typed findings with separate topic-specific evidence constraints.
`expectedFindingCount` and `findingIds` now describe actual actionable findings;
`legacyExpectedFindingCount` retains the old evaluation-slot count for provenance.
`expected` retains the original accepted labels for comparison and is not the v2
scoring contract. `findings-core.js` grades per-finding expectations, coverage,
source isolation, server-derived IDs and content-versioned actions. The original
v1 corpus and grader remain intact.
