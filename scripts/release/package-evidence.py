"""Package retained synthetic evidence without changing raw model captures.

Run from the repository root after replay-evaluations.js and replay-identity.js.
No API calls, credentials, approvals, deployments or CRM writes are performed.
"""
import hashlib
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/release/evidence"
OUT.mkdir(parents=True, exist_ok=True)
digest = lambda data: hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_text())


def save(name, data):
    (OUT / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


files = sorted((ROOT / "reports").glob("release*.json"))
for source in files:
    if source.name == "release-start.json":
        # Cloudflare account metadata is not needed to establish deployment state.
        def redact(value):
            if isinstance(value, dict):
                return {k: redact(v) for k, v in value.items() if k != "author_email"}
            if isinstance(value, list):
                return [redact(v) for v in value]
            return value
        save(source.name, {
            "sanitization": "Removed author_email account metadata only",
            "originalWorkspaceFileSha256": digest(source.read_bytes()),
            "receipt": redact(load(source)),
        })
    else:
        shutil.copyfile(source, OUT / source.name)

for name in ["release-all-tests.txt", "release-local-worker.txt",
             "release-browser.txt", "release-resume-demo-build.txt",
             "release-resume-owner-build.txt", "release-evidence-before.txt",
             "release-evidence-after.txt", "release-negative-before.txt"]:
    shutil.copyfile(pathlib.Path("/tmp") / name, OUT / name)
shutil.copyfile(ROOT / "reports/release-browser-preview.png", OUT / "release-browser-preview.png")

replay = load(OUT / "release-final-policy-replay.json")
capture = "release-model-v0.3.4-2026-11-07T16-54-46-329Z.json"
ids = ["ST03", "ST04", "ST07", "ST08", "EN11", "EN12", "EN31"]
rows = [r for r in replay["rows"] if r["id"] in ids and r["captureFile"] == capture]
corpus = load(ROOT / "fixtures/enterprise-v2.json")
contexts = {c["id"]: c["context"] for c in corpus["cases"]}
proposals = []
for row in rows:
    for finding in row["actual"]["findings"]:
        proposals.append({
            "caseId": row["id"], "sourceContext": contexts[row["id"]],
            "providerCapture": capture, "rawOutputHash": row["rawOutputHash"],
            "materializedOutputHash": row["outputHash"], "finding": finding,
            "humanSemanticVerdict": "PENDING_FOR_THIS_OUTPUT",
            "finalExecutionApproval": False,
            "executionBlock": "No final task timing, CRM association, correlation or exact final-payload approval",
        })
assert len(proposals) == 9
save("revised-proposals.json", {"kind": "SYNTHETIC_REVISED_DRAFTS_NOT_EXECUTABLE_PAYLOADS",
                              "sourceCommit": "dcf6abc69b53d34c423034e88328aa4ece079dd7",
                              "materializationVersion": "source-evidence-v0.3.6",
                              "proposals": proposals})

save("operator-supplied-connection-receipts.json", {
    "kind": "CHAT_ATTRIBUTED_OPERATOR_BROWSER_RECEIPTS_NOT_CODEX_DIRECT_OBSERVATION",
    "receiptTime": "Not supplied by operator; message sequence only",
    "receipts": [
        {"order": 1, "status": "rejected_credential", "credential": "STAGING_HUBSPOT_READ_TOKEN",
         "check": "/account-info/v3/details", "httpStatus": 401,
         "originalDemoCredentialProof": {
             "checks": [{"credential": "HUBSPOT_ACCESS_TOKEN", "status": "PASS", "portalId": "247646122"},
                        {"credential": "HUBSPOT_WRITE_TOKEN", "status": "PASS", "portalId": "247646122"}],
             "writes": 0, "contactMarkerVerified": True},
         "credentialsNotSubstituted": True},
        {"order": 2, "status": "missing_credential", "credential": "STAGING_HUBSPOT_WRITE_TOKEN",
         "limitations": "Short blocker text supplied; no complete renewed read-portal/contact receipt. Does not establish write credential validity."}
    ],
    "nextAction": "Configure the existing Writeback Lab credential value as STAGING_HUBSPOT_WRITE_TOKEN Secret on the namespace-owner Worker, then repeat authenticated read-only preflight.",
    "humanSemanticApproval": False, "finalExecutionApproval": False,
})

summary = replay["summary"]
groups = summary["consistency"]
save("validation-summary.json", {
    "kind": "RELEASE_VALIDATION_WITH_SEPARATE_AUTOMATED_AND_HUMAN_STATUS",
    "codeCommit": "dcf6abc69b53d34c423034e88328aa4ece079dd7",
    "modelCalls": 206, "modelCallCap": 210, "newHubSpotTasksThisCycle": 0,
    "independentProviderCaptures": 205, "uniqueCases": len({r["id"] for r in replay["rows"]}),
    "finalPolicyAutomatedPasses": summary["passed"], "finalPolicyAutomatedFailures": summary["failures"],
    "repeatedGroups": len(groups), "stableSemanticDecisionGroups": sum(g["semanticDecisionStable"] for g in groups),
    "semanticConsistencyRate": summary["semanticConsistencyRate"],
    "unstableSemanticCases": [g["id"] for g in groups if not g["semanticDecisionStable"]],
    "rawKeyDriftCases": summary["rawKeyDriftCases"],
    "exactDraftVersionStableGroups": sum(g["exactDraftVersionsStable"] for g in groups),
    "exactRecommendationStableGroups": sum(g["exactRecommendationsStable"] for g in groups),
    "deterministicTests": {"passed": 151, "failed": 0},
    "demoDryRunBuild": "PASS", "namespaceOwnerDryRunBuild": "PASS",
    "humanSemanticAcceptanceOfRevisedOutputs": "PENDING", "finalReleaseAcceptance": "PENDING",
    "latestHostedWorkflow": "BLOCKED_CREDENTIAL_PREFLIGHT_AND_FINAL_SOURCE_NOT_DEPLOYED",
    "limitations": [
        "Replay passes apply final deterministic policy to captured independent provider outputs; these are not 205 new calls with final policy.",
        "Heuristic automated evidence/authority checks do not establish full human semantic correctness or calibrated confidence.",
        "UV11 varies between current pricing preparation and conservative internal verification of an older renovation gate.",
        "Same-source offline durable identity reuse does not establish universal identity stability after arbitrary source edits.",
        "Local SQLite/HTTP/browser tasks are not HubSpot tasks; injected response loss is not a naturally occurring network outage.",
        "Targeted capture reports base commit 64ec9e5 while review-policy edits were in progress; it is not an exact committed tree snapshot.",
    ],
})

# Hash every package member except this manifest. Model captures were copied byte-for-byte.
members = {str(p.relative_to(OUT)): digest(p.read_bytes()) for p in sorted(OUT.iterdir())
           if p.is_file() and p.name != "manifest.json"}
save("manifest.json", {
    "kind": "SYNTHETIC_RELEASE_EVIDENCE_MANIFEST",
    "codeCommit": "dcf6abc69b53d34c423034e88328aa4ece079dd7",
    "recordingCommit": "The Git commit containing this manifest; deliberately not self-referential",
    "providerPromptVersion": "reasoning-v0.3.3", "schemaVersion": "findings-v0.2",
    "promptHash": "9f03c4a4f700e386def81eac10a231d2d3ef5b85eca8bddfafdaf3af28434c69",
    "requestHash": "c3d526465d5041266574799e5101e8537896a9b5228b50fc117601c01b60f984",
    "materializationVersion": "source-evidence-v0.3.6", "evidencePolicyVersion": "source-clause-closure-v1.1",
    "proposalVersion": "internal-task-proposal-v2.2", "reviewPolicy": "finding-review-v2.6",
    "model": "gpt-5.6-terra", "reasoningEffort": "low", "files": members,
})
print(json.dumps({"packagedFiles": len(members), "revisedFindingDrafts": len(proposals), "networkCalls": 0}))
