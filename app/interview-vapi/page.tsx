"use client";

import { createInterviewAssistant } from "@/lib/vapi";
import { useCallback, useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

export default function VapiInterviewPage() {
  /* ─────────── UI state ─────────── */
  const [messages, setMessages] = useState<Turn[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  /* ─────────── conversation handle ─────────── */
  const convoRef = useRef<{ stop: () => void } | null>(null);

  /* helper to create / recreate a conversation */
  const startInterview = useCallback(async () => {
    try {
      setStatus("connecting");
      setError(null);
      setMessages([]);

      // ‼️  createInterviewAssistant already starts the call
      convoRef.current = await createInterviewAssistant(
        {
          candidate_name: "Derek",
          li_skills: "React,TypeScript,Next.js",
          li_experience: "Senior Front-End at Amazon",
        },
        (t) => setMessages((m) => [...m, { role: t.user ? "user" : "assistant", content: t.text }])
      );

      // seed UI with first system greeting if you like:
      setMessages([
        {
          role: "assistant",
          content:
            "Hi, I'm your interview assistant. Let's get started—feel free to speak when ready.",
        },
      ]);

      setStatus("connected");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  }, []);

  /* auto-start on first mount */
  useEffect(() => {
    startInterview();
    return () => convoRef.current?.stop(); // cleanup
  }, [startInterview]);

  /* ─────────── UI ─────────── */
  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold">AI Interview Assistant</h1>

        {/* Status */}
        <div className="mb-6 rounded-lg bg-gray-100 p-4 text-sm">
          {status === "idle" && <span className="text-gray-500">Idle</span>}
          {status === "connecting" && <span className="text-blue-600">Connecting…</span>}
          {status === "connected" && (
            <span className="text-green-600">Connected — speak freely</span>
          )}
          {status === "error" && <span className="text-red-600">Error</span>}
          {error && <div className="mt-2 rounded bg-red-100 p-2 text-red-700">{error}</div>}
        </div>

        {/* Transcript */}
        <div className="mb-6 h-96 overflow-y-auto rounded-lg border border-gray-200 p-4">
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

        {/* Controls */}
        <div className="flex justify-between">
          <button
            onClick={startInterview}
            disabled={status === "connecting" || status === "connected"}
            className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Start Listening
          </button>

          <button
            onClick={() => {
              convoRef.current?.stop();
              setStatus("idle");
            }}
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
