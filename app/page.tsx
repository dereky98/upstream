"use client";

import { useRef, useState } from "react";

export default function Page() {
  // LinkedIn state
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLinkedinLoading, setIsLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState("");
  const [linkedinSuccess, setLinkedinSuccess] = useState(false);

  // Resume state
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleLinkedinSubmit = async (e) => {
    e.preventDefault();

    if (!linkedinUrl.trim()) {
      setLinkedinError("Please enter a LinkedIn URL");
      setLinkedinSuccess(false);
      return;
    }

    setIsLinkedinLoading(true);
    setLinkedinError("");
    setLinkedinSuccess(false);

    try {
      const encodedUrl = encodeURIComponent(linkedinUrl);
      const response = await fetch(`/api/linkedin?url=${encodedUrl}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setLinkedinError(data.error);
      } else {
        console.log("LinkedIn Profile Data:", data);
        setLinkedinSuccess(true);
      }
    } catch (err) {
      setLinkedinError("Failed to fetch profile data: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setIsLinkedinLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setResumeError("");
  };

  const handleResumeSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setResumeError("Please select a resume file");
      return;
    }

    setIsResumeLoading(true);
    setResumeError("");
    setResumeSuccess(false);

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process resume");
      }

      console.log("Resume Data:", data);

      if (data.data) {
        console.log("Parsed Content:", data.data);
      }

      if (data.meta) {
        console.log("Document Metadata:", data.meta);
      }

      setResumeSuccess(true);
    } catch (err) {
      setResumeError("Failed to process resume: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setIsResumeLoading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Profile Data Extractor</h1>

        {/* LinkedIn Section */}
        <div className="w-full p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">LinkedIn Profile Extractor</h2>
          <form onSubmit={handleLinkedinSubmit} className="w-full">
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
          <h2 className="text-xl font-bold mb-4">Resume Extractor</h2>
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
      </main>
    </div>
  );
}
