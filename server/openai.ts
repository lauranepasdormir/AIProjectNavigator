import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a draft response for a project showcase question
 * 
 * @param question The question to generate a response for
 * @param context Additional context about the project (if available)
 * @returns Generated suggestion for an answer
 */
export async function generateDraftResponse(question: string, context?: Record<string, string>): Promise<string> {
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

    const prompt = `
You are a helpful assistant for an AI project showcase platform. The user is filling out a form about their project.

Generate a suggested answer for the following question:
"${question}"

${contextString ? contextString : "No additional context is available."}

Make your suggestion helpful, concise, and professional. Write in first person as if from the project creator's perspective.
Limit your response to 3-4 sentences maximum, focusing on the most important aspects.
`;

    console.log("Calling OpenAI API...");
    
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