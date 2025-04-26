"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ExpertNetworkApplicationsPage() {
  const [networks, setNetworks] = useState([
    { id: 1, name: "GLG", selected: true },
    { id: 2, name: "Tegus", selected: false },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // New state for tracking current application status
  const [currentNetwork, setCurrentNetwork] = useState("");
  const [currentLogMessage, setCurrentLogMessage] = useState("");

  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);

  // Add a logs array to capture and display console messages
  const [logs, setLogs] = useState([]);

  // Polling effect for log updates
  useEffect(() => {
    let interval;

    if (isSubmitting && currentNetwork) {
      interval = setInterval(async () => {
        try {
          const networkLower = currentNetwork.toLowerCase();
          const response = await fetch(`/api/hyperbrowser-${networkLower}`);

          if (response.ok) {
            const data = await response.json();
            if (data.logs && data.logs.length > 0) {
              setLogs(data.logs);
              // Update current log message with the latest log
              setCurrentLogMessage(data.logs[data.logs.length - 1]);
            }
          }
        } catch (error) {
          console.error("Error fetching logs:", error);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSubmitting, currentNetwork]);

  const toggleNetwork = (id) => {
    setNetworks(
      networks.map((network) =>
        network.id === id ? { ...network, selected: !network.selected } : network
      )
    );
  };

  useEffect(() => {
    let timer;
    if (steps.length > 0 && stepIndex < steps.length) {
      setCurrentLogMessage(steps[stepIndex].action);

      timer = setTimeout(() => {
        setStepIndex((prev) => prev + 1);
      }, 1500); // Show each step for 1.5 seconds
    }

    return () => clearTimeout(timer);
  }, [steps, stepIndex]);

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
    setCurrentNetwork("Initializing...");
    setCurrentLogMessage("Preparing to start application process...");
    console.log("Starting applications process");
    setLogs([]); // Clear previous logs

    try {
      const allResults = [];

      // Process each selected network
      for (const network of selectedNetworks) {
        try {
          // Update current network being processed
          setCurrentNetwork(network.name);
          setCurrentLogMessage(`Starting ${network.name} application...`);
          console.log(`Processing network: ${network.name}`);

          // Dynamically create API endpoint based on network name
          const networkNameLower = network.name.toLowerCase();
          const apiEndpoint = `/api/hyperbrowser-${networkNameLower}`;

          console.log(`Calling ${apiEndpoint} for ${network.name}`);
          setCurrentLogMessage(`Connecting to ${network.name} application system...`);

          const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              networks: [network],
            }),
          });

          if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
          }

          const data = await response.json();
          console.log(`${network.name} API response:`, data);

          // Display the latest log message from the API
          if (data.latestLog) {
            setCurrentLogMessage(data.latestLog);
            console.log(`Setting log message to: ${data.latestLog}`);
          } else if (data.message) {
            setCurrentLogMessage(data.message);
            console.log(`Setting log message to: ${data.message}`);
          } else {
            setCurrentLogMessage(`Completed ${network.name} application`);
          }

          if (data.results) {
            allResults.push(...data.results);
            addLog(`Added ${data.results.length} results from ${network.name}`);
          } else {
            allResults.push({
              name: network.name,
              status: "Success",
              details: `Application submitted on ${new Date().toLocaleString()}`,
            });
            addLog(`No results data from ${network.name}, added default success result`);
          }
        } catch (err) {
          console.error(`Error with ${network.name}:`, err);
          setCurrentLogMessage(`Error: ${err.message}`);

          allResults.push({
            name: network.name,
            status: "Failed",
            details: err instanceof Error ? err.message : "Unknown error occurred",
          });
        }
      }

      setResults(allResults);
      setSuccess(true);
      setCurrentNetwork("Complete");
      setCurrentLogMessage("All applications completed");
      addLog("All applications completed");
    } catch (error) {
      console.error("Error submitting applications:", error);
      setError(error instanceof Error ? error.message : "Failed to submit applications");
      addLog(`Error submitting applications: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-3xl font-bold mb-6">Expert Network Application Tool</h1>

        <div className="w-full p-6 bg-white rounded-lg shadow-md mb-6">
          <p className="text-black mb-4">
            This tool helps you apply to multiple expert networks with one click.
          </p>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 text-black">Expert Network Name</th>
                <th className="text-left py-2 px-4 text-black">Apply?</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((network) => (
                <tr key={network.id} className="border-b">
                  <td className="py-3 px-4 text-black">{network.name}</td>
                  <td className="py-3 px-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={network.selected}
                        onChange={() => toggleNetwork(network.id)}
                        disabled={isSubmitting}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={submitApplications}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded shadow transition"
          >
            {isSubmitting ? "Submitting..." : "Submit All Applications"}
          </button>
        </div>

        {/* Simple status display section */}
        {isSubmitting && (
          <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-2 text-black">Application Status</h2>
            <div className="flex flex-col space-y-2">
              <div className="text-black">
                <span className="font-medium">Applying to:</span> {currentNetwork}
              </div>
              <div className="text-black">
                <span className="font-medium">Status:</span> {currentLogMessage}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="w-full p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && results.length > 0 && (
          <div className="w-full p-6 bg-white rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4 text-black">Application Results</h2>

            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 text-black">Network</th>
                  <th className="text-left py-2 px-4 text-black">Status</th>
                  <th className="text-left py-2 px-4 text-black">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4 text-black">{result.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          result.status === "Success"
                            ? "bg-green-100 text-green-800"
                            : result.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-black">{result.details || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Console logs display */}
        {logs.length > 0 && (
          <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-2 text-black">Application Logs</h2>
            <div className="bg-black text-white p-4 rounded font-mono text-sm h-32 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
