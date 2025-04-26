import Vapi from "@vapi-ai/web";

export type MessageCallback = (m: {
  user: boolean;
  text: string;
  timestamp: number;
}) => void;

type TranscriptEvent = { user: boolean; text: string };
type Conversation = Awaited<ReturnType<Vapi["start"]>>; // 👈 infer from SDK

let vapiSingleton: Vapi | null = null;

export async function createInterviewAssistant(
  vars: Record<string, string>,
  onTurn: MessageCallback
): Promise<Conversation> {
  // 1️⃣ singleton
  if (!vapiSingleton) {
    vapiSingleton = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY!);
  }

  // 2️⃣ listeners
  vapiSingleton.removeAllListeners?.();
  // @ts-expect-error - The type definitions in Vapi SDK need updating, "transcript" is a valid event
  vapiSingleton.on("transcript", (t: TranscriptEvent) =>
    onTurn({ user: t.user, text: t.text, timestamp: Date.now() })
  );

  // 3️⃣ mic permission
  await navigator.mediaDevices.getUserMedia({ audio: true });

  // lib/vapi.ts  – inside createInterviewAssistant()

  return vapiSingleton.start(
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!,  // ① pass the ID as the first arg
    {                                            // ② assistantOverrides object
      variableValues: vars                      //    ← your {{ }} template values
    }
  );

}
