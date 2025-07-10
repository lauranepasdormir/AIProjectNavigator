import OpenAI from "openai";
import 'dotenv/config';
import { evalDict } from "@/lib/evalDict";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a draft response for a project showcase question
 * 
 * @param question The question to generate a response for
 * @param context Additional context about the project (if available)
 * @returns Generated suggestion for an answer
 */
export async function generateDraftResponse(question: string, evalCriteria: string, context?: Record<string, string>): Promise<string> {
  try {
    // Validate API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set in environment");
      throw new Error("OpenAI API key is not configured");
    }
    
    console.log("Starting draft generation with OpenAI for question:", question);
    
    // Format context as a string if available
    let contextString = "";
    if (context && Object.keys(context).length > 0) {
      contextString = "Here's some context about the project:\n\n";
      Object.entries(context).forEach(([key, value]) => {
        if (value && value.trim()) {
          contextString += `${key}: ${value}\n`;
        }
      });
    }

    console.log("WORLDDDDDD" , contextString)
    
const criteria = evalDict[question];
    // Build the prompt including the evaluation criteria
    const prompt = `
You are a helpful assistant for an AI project showcase platform. The user is filling out a form about their project.

Evaluation Criteria:
${criteria}
If the answer provided by the user satisfies all the criteria for a particular question, then 

Generate a suggested answer for the following question:
"${question}"

${contextString ? contextString : "No additional context is available."}

Make your suggestion helpful, concise, and professional. Write in first person as if from the project creator's perspective.
Limit your response to 3-4 sentences maximum, focusing on the most important aspects.
`;

    console.log("Calling OpenAI API...");
    console.log("Using evaluation criteria:", criteria); // Should print the text, not [object Object]    
    try {
      // First attempt with gpt-4o model
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      });
      
      console.log("OpenAI API response received successfully");
      return response.choices[0].message.content || "Sorry, I couldn't generate a suggestion.";
    } catch (modelError) {
      // If the first model fails, try the fallback model
      console.error("Error with gpt-4o model, trying fallback model", modelError);
      
      const fallbackResponse = await openai.chat.completions.create({
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
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // If it's an API error, log more details
    if (error && typeof error === 'object' && 'response' in error) {
      console.error("API Response error:", error.response);
    }
    
    throw new Error("Failed to generate a draft response. Please try again later.");
  }
}

console.log("OPENAI_API_KEY in env:", process.env.OPENAI_API_KEY);

export async function generateAnswerSuggestion(
  question: string,
  evalCriteria: string,
  answer: string,
  context?: Record<string, string>
): Promise<{ satisfied: boolean; feedback: string }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set in environment");
      throw new Error("OpenAI API key is not configured");
    }

    // Format context as a string if available
    let contextString = "";
    if (context && Object.keys(context).length > 0) {
      contextString = "Here's some context about the project:\n\n";
      Object.entries(context).forEach(([key, value]) => {
        if (value && value.trim()) {
          contextString += `${key}: ${value}\n`;
        }
      });
    }

    console.log("HELLOOOOOOOOO" , contextString)

    // Build the prompt for evaluation
    const prompt = `
You are an expert evaluator for an AI project showcase platform. 
Your job is to review user answers to project questions and determine if they meet the evaluation criteria.

Question:
${question}

User's Answer:
${answer}

Evaluation Criteria:
${evalCriteria}

${contextString ? contextString : "No additional context is available."}

Instructions:
- If the answer fully satisfies the evaluation criteria, respond with:
SATISFIED: Yes
FEEDBACK: (optional, short positive feedback)
- If the answer does NOT fully satisfy the criteria, respond with:
SATISFIED: No
FEEDBACK: (explain what is missing or how to improve)
Respond in this exact format.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content || "";

    // Parse the response
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