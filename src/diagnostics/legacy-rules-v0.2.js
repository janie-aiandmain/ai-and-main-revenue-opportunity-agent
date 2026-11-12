// Frozen original diagnostic for explicit historical replay. No network.
export const LEGACY_DIAGNOSTIC_VERSION="deterministic diagnostic rules v0.2";

function evaluateRevenueOpportunity(noteText) {
  const text = (noteText || "").toLowerCase().trim();

  if (!text) {
    return {
      classification: "no opportunity",
      confidence: "low",
      evidence: "No service-note content was available for evaluation.",
      recommendedNextAction: "No action. Wait for new customer activity.",
      humanReviewRequired: false,
    };
  }

  const explicitNoNeed = /(no additional work|nothing else|issue resolved|everything is working well|no further work)/i.test(text);
  const deferredIntent = /(still wants|wanted to finish|finish the current project first|later|after this project|follow up)/i.test(text);
  const strongIntent = /(asked whether|asked if|wants pricing|wants a quote|request.*pricing|interested in|wants.*installed|also install|additional service)/i.test(text);

  if (explicitNoNeed && !strongIntent && !deferredIntent) {
    return {
      classification: "no opportunity",
      confidence: "high",
      evidence: excerpt(noteText),
      recommendedNextAction: "No revenue follow-up. Keep the customer in normal relationship cadence.",
      humanReviewRequired: false,
    };
  }

  if (strongIntent) {
    return {
      classification: "strong cross-sell opportunity",
      confidence: "high",
      evidence: excerpt(noteText),
      recommendedNextAction: "Prepare a relevant follow-up and pricing conversation for human approval.",
      humanReviewRequired: true,
    };
  }

  if (deferredIntent) {
    return {
      classification: "follow-up revenue opportunity",
      confidence: "medium-high",
      evidence: excerpt(noteText),
      recommendedNextAction: "Schedule a timely follow-up based on the customer's stated timing.",
      humanReviewRequired: true,
    };
  }

  return {
    classification: "no clear opportunity",
    confidence: "medium",
    evidence: excerpt(noteText),
    recommendedNextAction: "No automated action. Surface only if a human reviewer sees additional context.",
    humanReviewRequired: false,
  };
}

function excerpt(text, max = 220) {
  const clean = stripHtml(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

export {evaluateRevenueOpportunity as evaluateLegacyRevenueOpportunity};
