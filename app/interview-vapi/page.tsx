"use client";

import { getApiKey } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import Vapi from "@vapi-ai/web";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; timestamp?: number };

interface LinkedInData {
  firstName?: string;
  lastName?: string;
  headline?: string;
  skills?: Array<{ name?: string }>;
  fullPositions?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

interface ResumeData {
  name?: string;
  skills?: string[];
  [key: string]: unknown;
}

interface InterviewData {
  id: string;
  linkedin: LinkedInData | null;
  resume: ResumeData | null;
  variables: Record<string, string> | null;
  created_at: string;
}

// Define possible call interfaces
interface PossibleCallMethods {
  stop?: () => void;
  destroy?: () => void;
  [key: string]: unknown;
}

export default function InterviewVapiPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  console.log("Interview page loaded with ID:", id);

  const [messages, setMessages] = useState<Turn[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "connecting" | "connected" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [transcriptFinalized, setTranscriptFinalized] = useState(false);

  // Reference to the Vapi conversation
  const convoRef = useRef<{ stop: () => void } | null>(null);
  // Variables to pass to Vapi
  const varsRef = useRef<Record<string, string>>({});
  // API key reference
  const apiKeyRef = useRef<string>("");
  // Singleton Vapi instance
  const vapiRef = useRef<Vapi | null>(null);

  // Function to save transcript to Supabase
  const saveTranscript = useCallback(
    async (finalize = false) => {
      if (!interviewId || messages.length === 0 || (finalize && transcriptFinalized)) return;
      if (finalize) setTranscriptFinalized(true);
      try {
        console.log("Saving transcript to Supabase... Finalized:", finalize);
        console.log("Upserting with:", {
          interview_id: interviewId,
          transcript: messages,
          updated_at: new Date().toISOString(),
          finalized: finalize,
        });
        const transcript = messages.map((m, index) => ({
          ...m,
          timestamp: m.timestamp || Date.now() + index, // Use existing timestamp or generate one
        }));
        const { data, error } = await supabase.from("interview_transcripts").upsert(
          {
            interview_id: interviewId,
            transcript: transcript,
            updated_at: new Date().toISOString(),
            finalized: finalize,
          },
          {
            onConflict: "interview_id",
          }
        );
        if (error) {
          console.error("Error saving transcript:", error);
          return false;
        }
        console.log("Transcript saved successfully:", data);
        return true;
      } catch (err) {
        console.error("Error in saveTranscript:", err);
        return false;
      }
    },
    [interviewId, messages, transcriptFinalized]
  );

  // Function to navigate to transcript view
  const viewTranscript = useCallback(() => {
    if (interviewId) {
      // Redirect to transcript view page
      window.open(`/interview-transcript?id=${interviewId}`, "_blank");
    }
  }, [interviewId]);

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!id) {
        console.error("No ID provided in URL");
        setError("No interview ID provided");
        return;
      }

      try {
        console.log("Fetching data for ID:", id);
        setStatus("loading");
        setInterviewId(id);

        // Fetch the interview data from Supabase
        const query = supabase.from("experts_hackathon").select("*").eq("id", id).single();

        console.log("Executing query:", query.toString());

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error("Supabase fetch error:", fetchError);
          throw new Error(`Failed to fetch interview data: ${fetchError.message}`);
        }

        if (!data) {
          console.error("No data returned for ID:", id);
          throw new Error("Interview data not found");
        }

        console.log("Raw data from Supabase:", data);
        setInterviewData(data as InterviewData);

        // Create a Record<string, string> for the Vapi client
        const stringVars: Record<string, string> = {};

        // Process variables if available
        if (data.variables && typeof data.variables === "object") {
          Object.entries(data.variables).forEach(([key, value]) => {
            if (typeof value === "string") {
              stringVars[key] = value;
            } else if (value !== null && value !== undefined) {
              // Convert non-string values to strings
              stringVars[key] = JSON.stringify(value);
            }
          });
        }

        // Add basic profile information directly
        if (data.linkedin?.firstName) {
          stringVars.firstName = data.linkedin.firstName;
        }
        if (data.linkedin?.lastName) {
          stringVars.lastName = data.linkedin.lastName;
        }
        if (data.linkedin?.headline) {
          stringVars.headline = data.linkedin.headline;
        }

        // Map LinkedIn positions properly - this is what we need to fix
        if (
          data.linkedin?.position &&
          Array.isArray(data.linkedin.position) &&
          data.linkedin.position.length > 0
        ) {
          // Transform the position data to match the template's expected format
          const transformedPositions = data.linkedin.position.map(
            (pos: Record<string, unknown>) => ({
              company: pos.companyName || "", // Change companyName to company to match template
              title: pos.title || "",
              description: pos.description || "",
            })
          );

          // Store both the original and transformed version
          stringVars["linkedin.position"] = JSON.stringify(transformedPositions);

          // For direct access
          if (data.linkedin.position[0]?.companyName) {
            stringVars.currentCompany = data.linkedin.position[0].companyName as string;
          }
        } else if (
          data.linkedin?.fullPositions &&
          Array.isArray(data.linkedin.fullPositions) &&
          data.linkedin.fullPositions.length > 0
        ) {
          // If using fullPositions instead of position array
          const transformedPositions = data.linkedin.fullPositions.map(
            (pos: Record<string, unknown>) => ({
              company: pos.companyName || "", // Change companyName to company to match template
              title: pos.title || "",
              description: pos.description || "",
            })
          );

          stringVars["linkedin.position"] = JSON.stringify(transformedPositions);

          // For easier access in template
          if (data.linkedin.fullPositions[0]?.companyName) {
            stringVars["currentCompany"] = data.linkedin.fullPositions[0].companyName as string;
          }
        }

        // Create proper nested structure expected by the template
        const linkedinForTemplate = {
          ...data.linkedin,
          // Transform the position array to have the expected structure
          position: Array.isArray(data.linkedin?.position)
            ? data.linkedin.position.map((pos: Record<string, unknown>) => ({
                company: pos.companyName || "", // Change companyName to company
                title: pos.title || "",
                description: pos.description || "",
              }))
            : [],
        };

        // Add the full structured objects
        stringVars.linkedin = JSON.stringify(linkedinForTemplate);
        if (data.resume) {
          stringVars.resume = JSON.stringify(data.resume);
        }

        // Add a direct field for the template to use
        // This matches the prompt format: {{linkedin.position[0]?.company || "your current role"}}
        const latestCompany =
          (Array.isArray(linkedinForTemplate?.position) &&
            linkedinForTemplate.position[0]?.company) ||
          data.linkedin?.headline?.match(/at\s+([^,]+)/)?.[1] ||
          "your current role";

        stringVars["linkedin.position[0].company"] = latestCompany;
        console.log("Latest company for template:", latestCompany);

        varsRef.current = stringVars;

        console.log("Retrieved interview data:", data);
        console.log("Variables for Vapi:", varsRef.current);

        // Debug the specific template variables we're trying to access
        console.log("Template variable check:");
        console.log("- firstName:", stringVars.firstName);
        console.log("- Current company:", stringVars.currentCompany);
        console.log("- linkedin.position:", stringVars["linkedin.position"]);
        try {
          // Parse and access to verify the structure works
          const positionData = JSON.parse(stringVars["linkedin.position"] || "[]");
          console.log("- First position company:", positionData[0]?.company);
        } catch (e) {
          console.error("Error parsing position data:", e);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    }

    if (id) {
      fetchData();
    }
  }, [id]);

  const startInterview = useCallback(async () => {
    try {
      if (!interviewData) {
        throw new Error("No interview data available");
      }

      setStatus("connecting");
      setError(null);
      setMessages([]);

      // Clear any existing content
      try {
        const transcriptContainer = document.getElementById("transcript-container");
        if (transcriptContainer) {
          // Remove all children except the placeholder
          const placeholder = transcriptContainer.querySelector("p.text-gray-400");
          while (transcriptContainer.firstChild) {
            transcriptContainer.removeChild(transcriptContainer.firstChild);
          }
          if (placeholder) {
            transcriptContainer.appendChild(placeholder);
          }
        }
      } catch (clearErr) {
        console.error("Error clearing transcript container:", clearErr);
      }

      // 1️⃣ Initialize Vapi singleton if needed
      if (!vapiRef.current) {
        // Use any available method, preferring env variables
        const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;

        console.log("Final API key status:", apiKey ? "Available" : "Missing");

        if (!apiKey) {
          throw new Error("Missing Vapi API key - please check your environment variables");
        }

        // Store API key for later use
        apiKeyRef.current = apiKey;

        // Initialize with API key
        try {
          console.log(
            "Initializing Vapi with API key (masked):",
            apiKey
              ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
              : "missing"
          );

          // Create Vapi instance with API key
          vapiRef.current = new Vapi(apiKey);
          console.log("Vapi client initialized successfully");
        } catch (vapiError) {
          console.error("Error initializing Vapi client:", vapiError);
          throw new Error(
            `Failed to initialize Vapi: ${
              vapiError instanceof Error ? vapiError.message : String(vapiError)
            }`
          );
        }
      }

      // Get assistant ID directly from environment
      const assistantIdFromEnv = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
      const assistantIdFromHelper = getApiKey("NEXT_PUBLIC_VAPI_ASSISTANT_ID", "");
      const assistantIdFromDotEnv = "3adfed56-acd0-4dab-9813-1d1372530f00"; // Value from .env.local

      console.log("Assistant ID access methods:");
      console.log("- Direct env access:", assistantIdFromEnv ? "Set" : "Missing");
      console.log("- Helper function:", assistantIdFromHelper ? "Set" : "Missing");

      // Use any available method, preferring env variables
      const assistantId = assistantIdFromEnv || assistantIdFromHelper || assistantIdFromDotEnv;

      console.log("Using assistant ID:", assistantId);

      if (!assistantId) {
        throw new Error("Missing Vapi Assistant ID - please check your environment variables");
      }

      // 2️⃣ Remove any existing listeners
      vapiRef.current.removeAllListeners?.();

      // 3️⃣ Add transcript listener with additional error handling
      if (typeof vapiRef.current.on !== "function") {
        console.error("vapiRef.current.on is not a function:", vapiRef.current);
        throw new Error("Vapi client does not have event handling capability");
      }

      try {
        // @ts-expect-error - The "transcript" event is not in the type definition
        vapiRef.current.on("transcript", (t: { user: boolean; text: string }) => {
          console.log("Received transcript:", t);

          // Debug state updates
          console.log("Current messages before update:", messages);

          const newMessage: Turn = {
            role: t.user ? "user" : "assistant",
            content: t.text,
            timestamp: Date.now(),
          };

          // Using functional update to ensure we have the latest state
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages, newMessage];
            console.log("Messages after update:", updatedMessages);
            return updatedMessages;
          });

          // Direct DOM manipulation as a fallback to ensure message is shown
          try {
            const transcriptContainer = document.getElementById("transcript-container");
            if (transcriptContainer) {
              const messageDiv = document.createElement("div");
              messageDiv.className = `mb-3 rounded-lg p-3 ${
                t.user ? "ml-4 bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"
              }`;

              const roleDiv = document.createElement("div");
              roleDiv.className = "mb-1 text-xs font-semibold";
              roleDiv.textContent = t.user ? "You" : "AI Assistant";

              messageDiv.appendChild(roleDiv);
              messageDiv.appendChild(document.createTextNode(t.text));

              transcriptContainer.appendChild(messageDiv);

              // Scroll to bottom
              transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
            }
          } catch (domErr) {
            console.error("Error updating DOM directly:", domErr);
          }

          // Force UI update - in case React batching is causing issues
          setTimeout(() => {
            console.log("Forcing UI update check - current messages:", messages);
          }, 100);
        });

        // Attach call_end event
        console.log("Attaching call_end event listener to Vapi");
        // @ts-expect-error - The "call_end" event is not in the type definition
        vapiRef.current.on("call_end", () => {
          console.log("call_end event fired from Vapi");
          handleCallEnd();
        });
        console.log("call_end event attached");

        // Listen for Vapi error events
        vapiRef.current.on("error", (data: unknown) => {
          console.log("Vapi event - error:", data);
          function hasErrorMsg(obj: unknown): obj is { errorMsg: string } {
            return (
              typeof obj === "object" &&
              obj !== null &&
              "errorMsg" in obj &&
              typeof (obj as Record<string, unknown>).errorMsg === "string"
            );
          }
          if (hasErrorMsg(data) && data.errorMsg === "Meeting has ended") {
            console.log("Detected meeting end via error event. Triggering handleCallEnd.");
            handleCallEnd();
          }
        });
      } catch (transcriptErr) {
        console.error("Error attaching transcript/call_end listener:", transcriptErr);
      }

      // Debug all events
      ["connecting", "connected", "disconnected", "error"].forEach((eventType) => {
        try {
          // @ts-expect-error - These events may not be in the type definition
          vapiRef.current.on(eventType, (data: unknown) => {
            console.log(`Vapi event - ${eventType}:`, data);
          });
        } catch (e) {
          console.warn(`Could not attach listener for ${eventType}:`, e);
        }
      });

      // 4️⃣ Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log("Starting interview with vars:", varsRef.current);

      // 5️⃣ Start the conversation - use only supported options
      const call = await vapiRef.current.start(assistantId, {
        variableValues: varsRef.current,
      });

      // 6️⃣ Create a wrapper with stop method
      convoRef.current = {
        stop: () => {
          try {
            // Try to use available methods to stop the call
            const callObj = call as unknown as PossibleCallMethods;
            if (callObj && typeof callObj.stop === "function") {
              callObj.stop();
            } else if (callObj && typeof callObj.destroy === "function") {
              callObj.destroy();
            }
          } catch (err) {
            console.error("Error stopping call:", err);
          }
        },
      };

      setStatus("connected");
    } catch (e) {
      console.error("Error starting interview:", e);
      setStatus("error");
      setError((e as Error).message);
    }
  }, [interviewData]);

  // Start interview once data is loaded
  useEffect(() => {
    if (interviewData && status === "loading") {
      startInterview();
    }

    // Cleanup function
    return () => {
      if (convoRef.current) {
        try {
          convoRef.current.stop();
        } catch (err) {
          console.error("Error stopping conversation:", err);
        }
      }
    };
  }, [interviewData, startInterview, status]);

  // Reset finalized flag when starting a new interview
  useEffect(() => {
    setTranscriptFinalized(false);
  }, [interviewId]);

  // Debounced save handler for call end
  const handleCallEnd = useCallback(() => {
    console.log("Call ended. Saving transcript...");
    setTimeout(() => {
      saveTranscript(true).then((success) => {
        if (success) {
          console.log("Transcript finalized and saved after call ended");
          if (window.confirm("Interview completed. Would you like to view the transcript now?")) {
            window.open(`/interview-transcript?id=${interviewId}`, "_blank");
          }
        }
      });
    }, 1000);
  }, [saveTranscript, interviewId]);

  // Add test messages for debugging
  const addTestMessages = useCallback(() => {
    const testMessages: Turn[] = [
      {
        role: "assistant",
        content: "Hi there! This is a test message from the AI assistant.",
        timestamp: Date.now(),
      },
      {
        role: "user",
        content: "This is a test user response message.",
        timestamp: Date.now() + 1000,
      },
      {
        role: "assistant",
        content: "Great! The message display is working correctly.",
        timestamp: Date.now() + 2000,
      },
    ];

    setMessages((prev) => [...prev, ...testMessages]);

    // Also add to DOM directly
    try {
      const transcriptContainer = document.getElementById("transcript-container");
      if (transcriptContainer) {
        testMessages.forEach((m) => {
          const messageDiv = document.createElement("div");
          messageDiv.className = `mb-3 rounded-lg p-3 ${
            m.role === "user" ? "ml-4 bg-green-50 text-green-800" : "bg-blue-50 text-blue-800"
          }`;

          const roleDiv = document.createElement("div");
          roleDiv.className = "mb-1 text-xs font-semibold";
          roleDiv.textContent = m.role === "user" ? "You" : "AI Assistant";

          messageDiv.appendChild(roleDiv);
          messageDiv.appendChild(document.createTextNode(m.content));

          transcriptContainer.appendChild(messageDiv);
        });

        // Scroll to bottom
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
      }
    } catch (err) {
      console.error("Error adding test messages to DOM:", err);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold">AI Interview Assistant</h1>

        {/* Status */}
        <div className="mb-6 rounded-lg bg-gray-100 p-4 text-sm">
          {status === "idle" && <span className="text-gray-500">Idle</span>}
          {status === "loading" && <span className="text-blue-500">Loading data...</span>}
          {status === "connecting" && <span className="text-blue-600">Connecting…</span>}
          {status === "connected" && (
            <span className="text-green-600">Connected — speak freely</span>
          )}
          {status === "error" && <span className="text-red-600">Error</span>}
          {error && <div className="mt-2 rounded bg-red-100 p-2 text-red-700">{error}</div>}
        </div>

        {/* Candidate Data Summary */}
        {interviewData && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-sm font-semibold mb-2">Candidate Profile:</h2>
            <div className="text-xs">
              {interviewData.linkedin && (
                <div>
                  <p>✓ LinkedIn data loaded</p>
                  {interviewData.linkedin.firstName && (
                    <p className="ml-4">
                      Name: {interviewData.linkedin.firstName}{" "}
                      {interviewData.linkedin.lastName || ""}
                    </p>
                  )}
                  {interviewData.linkedin.headline && (
                    <p className="ml-4">Headline: {interviewData.linkedin.headline}</p>
                  )}
                </div>
              )}
              {interviewData.resume && <p>✓ Resume data loaded</p>}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div
          id="transcript-container"
          className="mb-6 h-96 overflow-y-auto rounded-lg border border-gray-200 p-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 rounded-lg p-3 ${
                m.role === "assistant"
                  ? "bg-blue-50 text-blue-800"
                  : "ml-4 bg-green-50 text-green-800"
              }`}
            >
              <div className="mb-1 text-xs font-semibold">
                {m.role === "assistant" ? "AI Assistant" : "You"}
              </div>
              {m.content}
            </div>
          ))}
          {messages.length === 0 && (
            <p className="mt-32 text-center text-gray-400">Conversation will appear here…</p>
          )}
        </div>

        {/* Debug Controls */}
        <div className="mt-4">
          <button
            onClick={addTestMessages}
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Add Test Messages (Debug)
          </button>
        </div>

        {/* Export Transcript Button */}
        {messages.length > 0 && (
          <div className="mt-4 flex flex-col space-y-2">
            <button
              onClick={() => saveTranscript(false)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Save Transcript to Database
            </button>

            <button
              onClick={viewTranscript}
              className="w-full rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              View/Process Saved Transcript
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between">
          <button
            onClick={startInterview}
            disabled={status === "connecting" || status === "connected" || status === "loading"}
            className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Start Listening
          </button>

          <button
            onClick={() => handleCallEnd()}
            disabled={status !== "connected"}
            className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Stop Listening
          </button>
        </div>
      </div>
    </main>
  );
}
