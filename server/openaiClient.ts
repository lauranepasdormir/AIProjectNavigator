import OpenAI from "openai";
import { LLM } from "./llm";
import 'dotenv/config';
import { evalDict } from "@/lib/evalDict";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
export class OpenAIClient implements LLM {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set in environment");
      throw new Error("OpenAI API key is not configured");
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate a draft response for a project showcase question
   */
  async generateDraftResponse(
    question: string,
    evalCriteria: string,
    context?: Record<string, string>
  ): Promise<string> {
    try {
      console.log("Starting draft generation with OpenAI for question:", question);

      let contextString = "";
      if (context && Object.keys(context).length > 0) {
        contextString = "Here's some context about the project:\n\n";
        Object.entries(context).forEach(([key, value]) => {
          if (value && value.trim()) {
            contextString += `${key}: ${value}\n`;
          }
        });
      }

      const criteria = evalDict[question] ?? evalCriteria ?? "";

      const prompt = `
You are a helpful assistant for an AI project showcase platform. The user is filling out a form about their project.

Evaluation Criteria:
${criteria}

Generate a suggested answer for the following question:
"${question}"

${contextString || "No additional context is available."}

Make your suggestion helpful, concise, and professional. Write in first person as if from the project creator's perspective.
Limit your response to 3-4 sentences maximum, focusing on the most important aspects.
Output only the example, no other response, no speech marks.
`;

      console.log("Calling OpenAI API...");
      console.log("Using evaluation criteria:", criteria);

      try {
        const response = await this.client.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 200,
        });

        console.log("OpenAI API response received successfully");
        return response.choices[0].message.content || "Sorry, I couldn't generate a suggestion.";
      } catch (modelError) {
        console.error("Error with gpt-4o model, trying fallback model", modelError);

        const fallbackResponse = await this.client.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 200,
        });

        console.log("Fallback model response received successfully");
        return fallbackResponse.choices[0].message.content || "Sorry, I couldn't generate a suggestion.";
      }
    } catch (error) {
      console.error("Error generating draft response:", error);
      throw new Error("Failed to generate a draft response. Please try again later.");
    }
  }

  /**
   * Evaluate an answer suggestion against criteria
   */
  async generateAnswerSuggestion(
    question: string,
    evalCriteria: string,
    answer: string,
    context?: Record<string, string>
  ): Promise<{ satisfied: boolean; feedback: string }> {
    try {
      let contextString = "";
      if (context && Object.keys(context).length > 0) {
        contextString = "Here's some context about the project:\n\n";
        Object.entries(context).forEach(([key, value]) => {
          if (value && value.trim()) {
            contextString += `${key}: ${value}\n`;
          }
        });
      }

      const prompt = `
You are a helpful assistant for an AI project showcase platform.
The user is filling out a form about their project. I'll provide the question, its criteria and the user response.

Question:
${question}

User's Answer:
${answer}

Evaluation Criteria:
${evalCriteria}

${contextString || "No additional context is available."}

Instructions:
- If the answer fully satisfies the evaluation criteria, respond with:
SATISFIED: Yes
FEEDBACK: (e.g., "Great! Let's move on.")
- If the answer does NOT fully satisfy the criteria, respond with:
SATISFIED: No
FEEDBACK: (give concise advice to improve the response, do not give an example or mention the criteria verbatim.)

Respond in this exact format.
`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
      });

      const content = response.choices[0].message.content || "";

      const satisfiedMatch = content.match(/SATISFIED:\s*(Yes|No)/i);
      const feedbackMatch = content.match(/FEEDBACK:\s*([\s\S]*)/i);

      const satisfied = satisfiedMatch ? satisfiedMatch[1].toLowerCase() === "yes" : false;
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : "No feedback provided.";

      return { satisfied, feedback };
    } catch (error) {
      console.error("Error generating answer suggestion:", error);
      throw new Error("Failed to evaluate the answer. Please try again later.");
    }
  }
}