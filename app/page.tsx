"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  // LinkedIn section states
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLinkedinLoading, setIsLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState("");
  const [linkedinSuccess, setLinkedinSuccess] = useState(false);

  // Resume section states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [networks, setNetworks] = useState([
    { id: 1, name: "GLG", selected: true },
    { id: 2, name: "Tegus", selected: false },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState("");
  const [logs, setLogs] = useState([]);

  // Poll for logs when application is in progress
  useEffect(() => {
    let interval;

    if (isSubmitting && currentNetwork) {
      // Set up polling
      interval = setInterval(async () => {
        try {
          const networkLower = currentNetwork.toLowerCase();
          const response = await fetch(`/api/hyperbrowser-${networkLower}`);
          const data = await response.json();

          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
          }
        } catch (error) {
          console.error("Error fetching logs:", error);
        }
      }, 1000); // Poll every second
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSubmitting, currentNetwork]);

  const handleLinkedinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validation
    if (!linkedinUrl.trim() || !linkedinUrl.includes("linkedin.com/")) {
      setLinkedinError("Please enter a valid LinkedIn URL");
      return;
    }

    setIsLinkedinLoading(true);
    setLinkedinError("");
    setLinkedinSuccess(false);

    try {
      // Call the existing LinkedIn extraction API route
      const response = await fetch(`/api/linkedin?url=${encodeURIComponent(linkedinUrl)}`);
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || data.message || "Failed to extract profile data");
      }

      console.log("LinkedIn profile data:", data);
      setLinkedinSuccess(true);
    } catch (error) {
      console.error("LinkedIn extraction error:", error);
      setLinkedinError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLinkedinLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleResumeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Resume submission handler logic would go here
    if (!selectedFile) {
      setResumeError("Please select a file first");
      return;
    }

    setIsResumeLoading(true);
    // Mock success for demonstration
    setTimeout(() => {
      setIsResumeLoading(false);
      setResumeSuccess(true);
      console.log("Resume data processed for file:", selectedFile.name);
    }, 1500);
  };

  const toggleNetwork = (id) => {
    setNetworks(
      networks.map((network) =>
        network.id === id ? { ...network, selected: !network.selected } : network
      )
    );
  };

  const submitApplications = async () => {
    const selectedNetworks = networks.filter((network) => network.selected);

    if (selectedNetworks.length === 0) {
      setError("Please select at least one expert network");
      return;
    }

    setIsSubmitting(true);
    setResults([]);
    setError("");
    setSuccess(false);
    setLogs([]);

    try {
      for (const network of selectedNetworks) {
        setCurrentNetwork(network.name);

        // Call the API for this network
        const networkLower = network.name.toLowerCase();
        const response = await fetch(`/api/hyperbrowser-${networkLower}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ networks: [network] }),
        });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();
        console.log("API response:", data);

        // Add the network to results
        setResults((prev) => [
          ...prev,
          {
            name: network.name,
            status: "Success",
            details: "Application completed",
          },
        ]);
      }

      setSuccess(true);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
      setCurrentNetwork("");
    }
  };

  // Display the latest log
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : "Initializing...";

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex flex-col">
        <h1 className="text-4xl font-bold mb-8 text-center">AI Assistant Tools</h1>

        {/* Voice AI Interview Section */}
        <section className="mb-16 w-full">
          <h2 className="text-3xl font-bold mb-6 text-center">Voice AI Interview</h2>
          <div className="text-center mt-4 space-y-4">
            <div>
              <h3 className="text-xl mb-2">New Implementation</h3>
              <Link
                href="/interview-vapi"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Vapi AI
              </Link>
            </div>
          </div>
        </section>

        {/* Profile Data Extractor Section */}
        <section className="w-full">
          <h2 className="text-3xl font-bold mb-6 text-center">Profile Data Extractor</h2>

          {/* LinkedIn Section */}
          <div className="w-full p-6 bg-white rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-black mb-4">LinkedIn Profile Extractor</h3>\
            <form onSubmit={handleLinkedinSubmit} className="w-full">
              <div className="flex flex-col sm:flex-row gap-4 w-full text-black">
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="Enter LinkedIn URL (e.g., https://www.linkedin.com/in/username/)"
                  className="flex-grow text-black p-3 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded shadow transition"
                  disabled={isLinkedinLoading}
                >
                  {isLinkedinLoading ? "Extracting..." : "Extract Profile"}
                </button>
              </div>
            </form>
            {linkedinError && (
              <div className="w-full p-4 mt-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {linkedinError}
              </div>
            )}
            {isLinkedinLoading && (
              <div className="flex items-center justify-center w-full mt-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            )}
            {linkedinSuccess && (
              <div className="w-full p-4 mt-4 bg-green-100 border border-green-400 text-green-700 rounded">
                Profile data successfully retrieved! Check the browser console.
              </div>
            )}
          </div>

          {/* Resume Section */}
          <div className="w-full p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl text-black font-bold mb-4">Resume Extractor</h3>
            <form onSubmit={handleResumeSubmit} className="w-full">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col">
                  <label className="mb-2 text-sm font-medium text-gray-700">
                    Upload Resume (PDF, DOCX, DOC)
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    accept=".pdf,.doc,.docx"
                  />
                  <p className="mt-1 text-xs text-gray-500">Supported formats: PDF, DOC, DOCX</p>
                </div>

                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded shadow transition"
                  disabled={isResumeLoading || !selectedFile}
                >
                  {isResumeLoading ? "Processing..." : "Extract Resume Data"}
                </button>
              </div>
            </form>

            {resumeError && (
              <div className="w-full p-4 mt-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {resumeError}
              </div>
            )}

            {isResumeLoading && (
              <div className="flex items-center justify-center w-full mt-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
              </div>
            )}

            {resumeSuccess && (
              <div className="w-full p-4 mt-4 bg-green-100 border border-green-400 text-green-700 rounded">
                Resume data successfully processed! Check the browser console.
              </div>
            )}
          </div>
        </section>

        {/* Status display with latest log */}
        {isSubmitting && (
          <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-2 text-black">Application Status</h2>
            <div className="flex flex-col space-y-2">
              <div className="text-black">
                <span className="font-medium">Applying to:</span> {currentNetwork}
              </div>
              <div className="text-black">
                <span className="font-medium">Status:</span> {latestLog}
              </div>
            </div>

            {/* Log history */}
            <div className="mt-4 p-2 bg-black text-white rounded max-h-40 overflow-auto">
              {logs.map((log, i) => (
                <div key={i} className="font-mono text-sm">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
