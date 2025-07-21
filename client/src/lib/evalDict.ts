import { questions } from "@/lib/questions";
import { evalCriteria } from "@/lib/evalCriteria";

/**
 * Builds a dictionary mapping question text to its corresponding evaluation criteria text.
 * 
 * This is useful for looking up what should be evaluated based on the visible question text.
 * Only includes questions that have matching criteria entries.
 */
export const evalDict: Record<string, string> = {};

questions.forEach((q) => {
  // Match question to corresponding evaluation criteria by question id
  const criteriaObj = evalCriteria.find((c) => c.question === q.id);

  // Only include if both a matching criteria and question text exist
  if (criteriaObj && q.text) {
    evalDict[q.text] = criteriaObj.text;
  }
});
