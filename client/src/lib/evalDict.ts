import { questions } from "@/lib/questions";
import { evalCriteria } from "@/lib/evalCriteria";

// Create a dictionary where the key is the question text and the value is the criteria text
export const evalDict: Record<string, string> = {};

questions.forEach(q => {
  // Find the matching criteria object by question id
  const criteriaObj = evalCriteria.find(c => c.question === q.id);
  if (criteriaObj && q.text) {
    evalDict[q.text] = criteriaObj.text;
  }
});