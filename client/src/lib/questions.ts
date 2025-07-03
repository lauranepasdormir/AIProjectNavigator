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
    text: "What's the title of your AI project?",
    required: true,
    placeholder: "Enter project title"
  },
  {
    id: 'description',
    text: "Please provide a brief description of your project (2-3 sentences).",
    required: true,
    placeholder: "Describe your project"
  },
  {
    id: 'problem',
    text: "What problem does your project aim to solve?",
    required: true,
    placeholder: "Describe the problem"
  },
  {
    id: 'technology',
    text: "What AI technologies or techniques does your project use?",
    required: true,
    placeholder: "List AI technologies"
  },
  {
    id: 'impact',
    text: "What is the potential impact of your project?",
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
    text: "What's the current status of your project?",
    required: true,
    placeholder: "e.g., Concept, In development, Prototype, etc.",
    type: "dropdown",
    options: [
      { value: 'Work in progress', label: 'Work in progress' },
      { value: 'Completed', label: 'Completed' }
    ]
  }
];
