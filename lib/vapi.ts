import Vapi from "@vapi-ai/web";
import { getApiKey } from "./env";

export type MessageCallback = (m: {
  user: boolean;
  text: string;
  timestamp: number;
}) => void;

type TranscriptEvent = { user: boolean; text: string };
// Define a simplified type that includes only what we need
type Conversation = { stop: () => void };

// Define an interface for possible methods on the call object
interface PossibleCallMethods {
  stop?: () => void;
  destroy?: () => void;
  [key: string]: unknown;
}

let vapiSingleton: Vapi | null = null;

export async function createInterviewAssistant(
  vars: Record<string, string>,
  onTurn: MessageCallback
): Promise<Conversation> {
  // 1️⃣ singleton
  if (!vapiSingleton) {
    vapiSingleton = new Vapi(getApiKey('NEXT_PUBLIC_VAPI_API_KEY', ''));
  }

  // 2️⃣ listeners
  vapiSingleton.removeAllListeners?.();
  // Typescript doesn't recognize "transcript" event
  // @ts-expect-error - The "transcript" event is not in the type definition
  vapiSingleton.on("transcript", (t: TranscriptEvent) =>
    onTurn({ user: t.user, text: t.text, timestamp: Date.now() })
  );

  // 3️⃣ mic permission
  await navigator.mediaDevices.getUserMedia({ audio: true });

  // Start the conversation
  const call = await vapiSingleton.start(
    getApiKey('NEXT_PUBLIC_VAPI_ASSISTANT_ID', ''),
    { variableValues: vars }
  );

  // Create an object with the stop method that wraps the original call
  return {
    stop: () => {
      try {
        // Use any available method to stop the call
        const callMethods = call as unknown as PossibleCallMethods;
        if (callMethods && typeof callMethods.stop === 'function') {
          callMethods.stop();
        } else if (callMethods && typeof callMethods.destroy === 'function') {
          callMethods.destroy();
        }
        // If no method is available, the conversation will continue until timeout
      } catch (err) {
        console.error("Error stopping call:", err);
      }
    }
  };
}
