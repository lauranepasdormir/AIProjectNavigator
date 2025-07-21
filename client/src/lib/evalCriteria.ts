/**
 * Interface representing a single evaluation criterion.
 */
export interface Criteria {
  id: number;            // Unique identifier for each criterion
  text: string;          // Description or instruction for evaluation
  question?: string;     // Optional: linked field name (e.g., "title", "description")
}

/**
 * Evaluation criteria used to assess project submission fields.
 * 
 * Some criteria are active (e.g., for "title", "problem"), while others are marked as "IGNORE" and are excluded from evaluation.
 */
export const evalCriteria: Criteria[] = [
  {
    id: 0,
    text: "No evaluation needed - IGNORE",  // Used to skip evaluation of this field
    question: "username",
  },
  {
    id: 1,
    text: "2-10 words in length (do not mention the word limit in your advice).",
    question: "title",  // Evaluates project title
  },
  {
    id: 2,
    text: "At least 2 sentences (do not mention the word limit in your advice), mention a specific industry type, mention project purpose, functionality and intended effect",
    question: "description",  // Evaluates project description
  },
  {
    id: 3,
    text: "Clear statement of a single, primary problem, no mention of a solution, and contains at least one key end user or stakeholder",
    question: "problem",  // Evaluates problem definition
  },
  {
    id: 4,
    text: "Mentions at least one key AI technology, uses recognizable AI terminology from the AI domain, and justifies the use of AI technology",
    question: "technology",  // Evaluates technology justification
  },
  {
    id: 5,
    text: "States at least one potential impact and its business value, identifies a beneficiary or affected group, relevant to the problem definition, and it states an impact in at least one of the following areas: social, economical, technological, environmental",
    question: "impact",  // Evaluates business and societal impact
  },
  {
    id: 6,
    text: "No evaluation needed - IGNORE (NO OUTPUT NEEDED)",
    question: "status",  // Ignored field (e.g., internal metadata)
  }
];
