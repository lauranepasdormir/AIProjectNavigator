export interface Criteria {
  id: number;
  text: string;
  question?: string; // Optional, can be used to associate with a specific question
}

export const evalCriteria: Criteria[] = [
  {
    id: 1,
    text: "2-10 words in length (do not mention the word limit in your advice)",
    question: "title"
  },
  {
    id: 2,
    text: "at least 2 sentences (do not mention the word limit in your advice), mention a specific industry type, mention project purpose, functionality and intended effect",
    question: "description"
  },
  {
    id: 3,
    text: "Clear statement of a single, primary problem, no metion of a solution, and contains at least one key end user or stakeholder",
    question: "problem"
  },
  {
    id: 4,
    text: "Mentions at least one key AI technology, uses recognizable Ai terminology from the AI domain, and justifies the use of AI technology",
    question: "technology"
  },
  {
    id: 5,
    text: "States at least one potential impact and its business value, identifies a beneficiary or affected group, relevant to the problem definition, and it states an impact in at least one of the following areas : social, economincal, technological, environmental",
    question: "impact"
  }
];
