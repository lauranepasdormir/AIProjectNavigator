import { OpenAIClient } from "./openaiClient";
import { GeminiAIClient } from "./geminiaiClient";
import { LLM } from "./llm";

export function getLLMClient(): LLM {
    const provider = process.env.LLM_PROVIDER;

    switch (provider) {
        case "gemini":
            console.log("Using Gemini AI client");
            return new GeminiAIClient(process.env.GEMINI_API_KEY!);
        case "openai":
            console.log("Using OpenAI client");
            return new OpenAIClient(process.env.OPENAI_API_KEY!);
        default:
            throw new Error("Unsupported LLM_PROVIDER. Use 'gemini' or 'openai'.");
    }

}