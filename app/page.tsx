"use client";

import { useState } from "react";

export default function Page() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!linkedinUrl.trim()) {
      setError("Please enter a LinkedIn URL");
      setSuccess(false);
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Make sure the URL is properly encoded
      const encodedUrl = encodeURIComponent(linkedinUrl);
      const response = await fetch(`/api/linkedin?url=${encodedUrl}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // Log to console instead of showing on page
        console.log("LinkedIn Profile Data:", data);
        setSuccess(true);
      }
    } catch (err) {
      setError("Failed to fetch profile data: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-8">LinkedIn Profile Extractor</h1>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="Enter LinkedIn URL (e.g., https://www.linkedin.com/in/username/)"
              className="flex-grow p-3 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded shadow transition"
              disabled={isLoading}
            >
              {isLoading ? "Extracting..." : "Extract Profile"}
            </button>
          </div>
        </form>

        {error && (
          <div className="w-full p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center w-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}

        {success && (
          <div className="w-full p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            Profile data successfully retrieved! Check the browser console (F12 or right-click →
            Inspect → Console).
          </div>
        )}
      </main>
    </div>
  );
}
