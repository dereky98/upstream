"use client";

import Link from "next/link";
import { useState } from "react";

export default function ExpertNetworkApplicationsPage() {
  const [networks, setNetworks] = useState([
    {
      id: 1,
      name: "GLG",
      selected: true,
      apiRoute: "/api/hyperbrowser-glg",
      url: "https://glginsights.com/experts/apply",
    },
    {
      id: 2,
      name: "Tegus",
      selected: false,
      apiRoute: "/api/hyperbrowser-tegus",
      url: "https://www.tegus.com/become-an-expert",
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

    try {
      const allResults = [];

      // Process each selected network
      for (const network of selectedNetworks) {
        try {
          // Call the appropriate API route for each network
          const response = await fetch(network.apiRoute, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              networks: [network],
              url: network.url,
            }),
          });

          if (!response.ok) {
            throw new Error(`API responded with status ${response.status}`);
          }

          const data = await response.json();
          console.log(`${network.name} API response:`, data);

          if (data.results) {
            allResults.push(...data.results);
          } else {
            allResults.push({
              name: network.name,
              status: "Success",
              details: `Application submitted to ${network.url}`,
            });
          }
        } catch (err) {
          console.error(`Error with ${network.name}:`, err);
          allResults.push({
            name: network.name,
            status: "Failed",
            details: err instanceof Error ? err.message : "Unknown error occurred",
          });
        }
      }

      setResults(allResults);
      setSuccess(true);
    } catch (error) {
      console.error("Error submitting applications:", error);
      setError(error instanceof Error ? error.message : "Failed to submit applications");
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

        {error && (
          <div className="w-full p-4 mb-6 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isSubmitting && (
          <div className="flex items-center justify-center w-full mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
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

        <div className="mt-6">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
