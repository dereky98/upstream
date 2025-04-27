"use client";

import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string; timestamp?: number };

interface TranscriptData {
  interview_id: string;
  transcript: Turn[];
  updated_at: string;
}

export default function TranscriptPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Fetch transcript data
  useEffect(() => {
    async function fetchTranscript() {
      if (!id) {
        setError("No transcript ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("interview_transcripts")
          .select("*")
          .eq("interview_id", id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch transcript: ${error.message}`);
        }

        if (!data) {
          throw new Error("Transcript not found");
        }

        const transcriptData = data as TranscriptData;
        setTranscript(transcriptData.transcript || []);
      } catch (err) {
        console.error("Error fetching transcript:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTranscript();
  }, [id]);

  // Process transcript into content
  const processTranscript = useCallback(async () => {
    if (transcript.length === 0) return;

    try {
      setProcessing(true);

      // Format the transcript for processing
      const formattedTranscript = transcript
        .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
        .join("\n\n");

      // Call our API to process the transcript with AI
      const response = await fetch("/api/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: formattedTranscript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process transcript");
      }

      const data = await response.json();
      setProcessedContent(data.content);
    } catch (err) {
      console.error("Error processing transcript:", err);
      setError(err instanceof Error ? err.message : "Error processing transcript");
    } finally {
      setProcessing(false);
    }
  }, [transcript]);

  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold">Interview Transcript</h1>

        {/* Status */}
        {loading ? (
          <div className="mb-6 rounded-lg bg-blue-100 p-4 text-blue-700">Loading transcript...</div>
        ) : error ? (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">Error: {error}</div>
        ) : (
          <>
            {/* Transcript Display */}
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-semibold">Raw Transcript</h2>
              <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 p-4">
                {transcript.length === 0 ? (
                  <p className="text-gray-500">No transcript data available.</p>
                ) : (
                  transcript.map((t, i) => (
                    <div
                      key={i}
                      className={`mb-3 rounded-lg p-3 ${
                        t.role === "assistant"
                          ? "bg-blue-50 text-blue-800"
                          : "ml-4 bg-green-50 text-green-800"
                      }`}
                    >
                      <div className="mb-1 text-xs font-semibold">
                        {t.role === "assistant" ? "AI Assistant" : "Candidate"}
                        {t.timestamp && (
                          <span className="ml-2 text-gray-500">
                            {new Date(t.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {t.content}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Processing Controls */}
            <div className="mb-6">
              <button
                onClick={processTranscript}
                disabled={processing || transcript.length === 0}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:bg-gray-300"
              >
                {processing ? "Processing..." : "Process Transcript"}
              </button>
            </div>

            {/* Processed Content */}
            {processedContent && (
              <div className="mb-6">
                <h2 className="mb-2 text-xl font-semibold">Processed Content</h2>
                <div className="rounded-lg border border-gray-200 p-4">
                  <pre className="whitespace-pre-wrap text-sm">{processedContent}</pre>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => {
                      // Save to Supabase or export
                      navigator.clipboard.writeText(processedContent);
                      alert("Content copied to clipboard!");
                    }}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-white"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
