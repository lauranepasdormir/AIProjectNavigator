export interface LLM {
    generateDraftResponse(
        question: string,
        evalCriteria: string,
        context?: Record<string, string>
    ): Promise<string>

    generateAnswerSuggestion(
        question: string,
        evalCriteria: string,
        answer: string,
        context?: Record<string, string>
    ): Promise<{ satisfied: boolean; feedback: string }>;
}