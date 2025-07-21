import { LLM } from "./llm";
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';

export class GeminiAIClient implements LLM {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment");
      throw new Error("GeminiAI API key is not configured");
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate a draft response for a project showcase question.
   */
  async generateDraftResponse(
    question: string,
    evalCriteria: string,
    context?: Record<string, string>
  ): Promise<string> {
    try {
      console.log("Starting draft generation with Gemini AI for question:", question);

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
You are a helpful assistant for an AI project showcase platform. The user is filling out a form about their project.

Evaluation Criteria:
${evalCriteria}

Generate a suggested answer for the following question:
"${question}"

${contextString || "No additional context is available."}

Make your suggestion helpful, concise, and professional. Write in first person as if from the project creator's perspective.
Limit your response to 3-4 sentences maximum, focusing on the most important aspects.
Output only the example, no other response, no speech marks.
`;

      console.log("Calling Gemini AI API for draft generation...");

      const result = await this.client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No valid text content returned in the Gemini AI response.");
      }

      return text;
    } catch (error) {
      console.error("Error generating draft response with Gemini AI:", error);
      throw new Error("Failed to generate a draft response. Please try again later.");
    }
  }

  /**
   * Evaluate a user's answer against criteria, returning satisfied status and feedback.
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
The user is filling out a form about their project. I'll provide the question, its criteria, and the user's answer.

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
FEEDBACK: (provide concise advice to improve the response, do not give an example or mention the criteria verbatim)

Respond in this exact format.
`;

      console.log("Calling Gemini AI API for answer evaluation...");

      const result = await this.client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("No valid text content returned in the Gemini AI response.");
      }

      const satisfiedMatch = content.match(/SATISFIED:\s*(Yes|No)/i);
      const feedbackMatch = content.match(/FEEDBACK:\s*([\s\S]*)/i);

      const satisfied = satisfiedMatch ? satisfiedMatch[1].toLowerCase() === "yes" : false;
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : "No feedback provided.";

      return { satisfied, feedback };
    } catch (error) {
      console.error("Error generating answer suggestion with Gemini AI:", error);
      throw new Error("Failed to evaluate the answer. Please try again later.");
    }
  }
}