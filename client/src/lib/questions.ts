export interface Question {
  id: string;
  text: string;
  required: boolean;
  placeholder: string;
  type?: 'text' | 'dropdown';
  options?: { value: string; label: string }[];
}

export const questions: Question[] = [
  {
    id: 'username',
    text: "Before we get started, what's your name or username? We'll use this to identify your project submission.",
    required: true,
    placeholder: "Enter your name or username"
  },
  {
    id: 'title',
    text: "What's the title of your AI project? Be sure to keep it short and punchy.",
    required: true,
    placeholder: "Enter project title"
  },
  {
    id: 'description',
    text: "Can you briefly describe what your project does, who it's for, and the effect it aims to have in its industry?",
    required: true,
    placeholder: "Describe your project"
  },
  {
    id: 'problem',
    text: "What key problem does your project aim to solve? Who is your intended end-user? Try not to mention your solution yet.",
    required: true,
    placeholder: "Describe the problem"
  },
  {
    id: 'technology',
    text: "What AI techniques or technologies are you using, and why are they appropriate?",
    required: true,
    placeholder: "List AI technologies"
  },
  {
    id: 'impact',
    text: "What impact will your project have and who will it affect? What is the business value of this impact?",
    required: true,
    placeholder: "Describe impact"
  },
  {
    id: 'team',
    text: "Who are the team members? (Optional)",
    required: false,
    placeholder: "List team members or type 'skip'"
  },
  {
    id: 'status',
    text: "Is your project a work in progress, or completed?",
    required: true,
    placeholder: "e.g., Concept, In development, Prototype, etc.",
    type: "dropdown",
    options: [
      { value: 'Work in progress', label: 'Work in progress' },
      { value: 'Completed', label: 'Completed' }
    ]
  }
];