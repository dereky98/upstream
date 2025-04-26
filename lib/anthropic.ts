import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are a helpful AI interviewer. Your task is to conduct a professional interview with the user.
Ask one question at a time, listen to the response, and then ask a logical follow-up question.
Be conversational, engaging, and professional.`;

/**
 * Get a response from Claude for interview reasoning
 * @param messages Previous messages in the conversation
 * @returns Claude's response
 */
export async function getClaudeResponse(messages: { role: string; content: string }[]) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Error getting Claude response:', error);
    throw error;
  }
} 