import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a task parser assistant. 
The user will describe tasks in natural language.
Your job is to rewrite each task on a separate line using EXACTLY this format:
due date <date> [<task title>] takes about <duration> priority <1-5>

Rules:
- Use "today", "tomorrow", "this weekend", or a YYYY-MM-DD date for the due date
- Keep task titles short (1-4 words), inside square brackets
- Duration must use h (hours) or d (days), e.g. "2h", "1d"
- Priority: 1 = most urgent, 5 = least urgent
- Output ONLY the formatted lines, no explanation, no preamble

Example input: "I need to finish my report by friday, it should take half a day, it's pretty important"
Example output: due date 2025-05-09 [finish report] takes about 4h priority 2`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: groq('llama-3.1-70b-versatile'),
    system: `You are a task extractor. For every user message, extract:
    - Title (inside brackets [])
    - Due date (YYYY-MM-DD or relative like 'tomorrow')
    - Duration (e.g., '1h', '30m')
    - Priority (1 to 5)
    Always respond in this exact format: 
    due date [DATE] [TITLE] takes [DURATION] priority [NUMBER]`,
    messages,
  });

  return result.toDataStreamResponse();
}