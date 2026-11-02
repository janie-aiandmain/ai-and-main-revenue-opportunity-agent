# Codex Kickoff

## First task

Read `AGENTS.md` and `docs/enterprise-hardening-plan.md` completely before making changes.

Then inspect the repository and prepare an enterprise-readiness assessment.

Do not modify files during the assessment task.

Return:

1. current architecture;
2. strengths;
3. risks ranked Critical / High / Medium / Low;
4. regression-test coverage gaps;
5. proposed fixture and harness structure;
6. phased implementation sequence;
7. any business-policy decisions that must be made before implementation;
8. any assumptions in the current code that should be challenged.

Treat the target buyer as a roughly $20M-revenue service business with an internal IT/security team.

Do not broaden permissions, alter production credentials, merge to `main`, or change the production reasoning prompt during this first task.

## After assessment approval

Implement the plan incrementally on `enterprise-hardening`.

Use the repository as the source of truth for:

- engineering constraints: `AGENTS.md`;
- hardening phases and completion criteria: `docs/enterprise-hardening-plan.md`.

Do not weaken test expectations to make the model pass.

When a remaining failure requires a business-policy decision, stop and state the exact decision needed instead of inventing policy.
