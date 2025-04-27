import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { linkedin, resume } = await req.json();

    /* --- craft prompt --- */
    const sysPrompt = `
You are a JSON utility. Extract the following flat keys:

candidate_name        – full name or first name
current_company       – most recent employer (fallback "unknown")
ai_skill_list         – comma-separated AI / ML skills, or "" if none
has_ai_background     – "true" if any AI skills or projects found, else "false"

Respond ONLY with minified JSON. No markdown, no explanations.
`;

    const userContent = `
LINKEDIN_JSON:
${JSON.stringify(linkedin ?? {})}

RESUME_JSON:
${JSON.stringify(resume ?? {})}
`;

    const completion = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 200,
      temperature: 0,
      system: sysPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const variables = JSON.parse(completion.content[0].text);

    return Response.json({ variables });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e.message ?? "Claude error" }, { status: 500 });
  }
}
