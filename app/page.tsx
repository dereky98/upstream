"use client";

import { supabase } from "@/lib/supabase";
import { useRef, useState } from "react";

export default function Home() {
  // LinkedIn section states
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Resume section states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Helper functions for LinkedIn and Resume extraction
  const fetchLinkedIn = async (url: string) => {
    const res = await fetch(`/api/linkedin?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error("LinkedIn scrape failed");
    return res.json();
  };

  const parseResume = async (file: File) => {
    const fd = new FormData();
    fd.append("resume", file);
    const res = await fetch("/api/resume", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Résumé parse failed");
    return res.json();
  };

  const extractVariables = async (
    li: Record<string, unknown> | null,
    cv: Record<string, unknown> | null
  ) => {
    const res = await fetch("/api/structure-linkedin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkedin: li, resume: cv }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error ?? "Claude extraction failed");
    return json.variables as Record<string, string>;
  };

  // Unified form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!linkedinUrl.trim() && !selectedFile) {
        throw new Error("Provide a LinkedIn URL or upload a résumé.");
      }

      // 1. optional LinkedIn + résumé
      const linkedin = linkedinUrl.trim() ? await fetchLinkedIn(linkedinUrl) : null;
      const resume = selectedFile ? await parseResume(selectedFile) : null;
      const variables = await extractVariables(linkedin, resume);

      // 2. check if record exists
      const { data: existingData, error: existingError } = await supabase
        .from("experts_hackathon")
        .select("id")
        .eq("linkedin_url", linkedinUrl.trim() || null)
        .maybeSingle();

      if (existingError) throw existingError;

      let finalData;
      if (existingData) {
        // Update existing record
        const { data, error: updateError } = await supabase
          .from("experts_hackathon")
          .update({
            linkedin,
            resume,
            variables,
            linkedin_url: linkedinUrl.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id)
          .select()
          .single();
        if (updateError) throw updateError;
        finalData = data;
      } else {
        // Insert new record with UUID
        const newId = crypto.randomUUID();
        const { data, error: insertError } = await supabase
          .from("experts_hackathon")
          .insert({
            id: newId,
            linkedin,
            resume,
            variables,
            linkedin_url: linkedinUrl.trim() || null,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        finalData = data;
      }

      if (!finalData || !finalData.id) {
        throw new Error("Failed to get record ID after save");
      }

      // Redirect to interview-vapi
      window.location.href = `/interview-vapi?id=${encodeURIComponent(finalData.id)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-center text-4xl font-bold">AI Interview Assistant</h1>
        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-bold text-black">Prepare Your Interview</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* LinkedIn URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                LinkedIn Profile (optional)
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/username/"
                className="mt-1 w-full rounded border border-gray-300 p-3 text-black shadow-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Résumé Upload (optional)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="mt-1 block w-full cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 focus:outline-none"
              />
            </div>
            {error && (
              <div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  Processing…
                </>
              ) : (
                "Begin Interview!"
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Providing either input will personalise your interview, but both are optional.
          </p>
        </section>
      </div>
    </main>
  );
}
