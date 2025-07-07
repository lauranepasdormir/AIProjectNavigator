export interface Criteria {
  id: number;
  text: string;
  question?: string; // Optional, can be used to associate with a specific question
}

export const evalCriteria: Criteria[] = [
  {
    id: 1,
    text: "2-10 words in length, indicate purpose or domain, avoids filler words or project codes, only contains letters, numbers, and spaces.",
    question: "title"
  },
  {
    id: 2,
    text: "at least 2 sentences, mention the industry type, mention project purpose, functionality and intended effect",
    question: "description"
  },
  {
    id: 3,
    text: "Please provide a brief description of your project (2-3 sentences).",
    question: "problem"
  }
];
