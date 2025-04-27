"use client";

import { useEffect, useState } from "react";

// Sample AI-generated profile data
const SAMPLE_PROFILE = {
  name: "Derek Ye",
  headline: "Software Engineer at Amazon Music",
  summary:
    "Derek is a highly skilled software engineer with a strong background in distributed systems, infrastructure, and AI-driven music technology. He has led technical projects at Amazon Music and contributed to innovative tools at Kits.AI.",
  strengths: [
    "Distributed systems architecture",
    "Cloud infrastructure (AWS)",
    "AI/ML project leadership",
    "Creative problem solving",
    "Technical communication",
  ],
  skills: [
    "Node.js",
    "Python",
    "PyTorch",
    "React.js",
    "TypeScript",
    "AWS",
    "Machine Learning",
    "Next.js",
    "Java",
    "C++",
  ],
  experience: [
    {
      company: "Amazon Music",
      title: "Software Engineer",
      period: "Sep 2022 - Present",
      description:
        "Led the Music Data Foundations team, building scalable infrastructure to serve tens of millions of users. Drove adoption of AI/ML for music recommendations and data analytics.",
    },
    {
      company: "Kits.AI",
      title: "Software Engineer",
      period: "Sep 2021 - Oct 2022",
      description:
        "Developed music creation tools leveraging AI for sound synthesis and user personalization.",
    },
    {
      company: "Workday",
      title: "Software Engineer",
      period: "Sep 2020 - Aug 2022",
      description:
        "Worked on Workday Student platform, focusing on backend services and integrations.",
    },
  ],
  aiSummary:
    "Derek has demonstrated strong AI/ML skills, particularly in applying machine learning to music technology. He is adept at leading projects, collaborating across teams, and quickly learning new technologies.",
  areasForImprovement: [
    "Deepen expertise in LLMs and generative AI",
    "Expand experience with production ML deployment",
    "Broaden exposure to data science workflows",
  ],
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<typeof SAMPLE_PROFILE | null>(null);

  useEffect(() => {
    // In a real app, fetch the profile from your API or Supabase
    setProfile(SAMPLE_PROFILE);
  }, []);

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading profile…</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8 mt-8">
        <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
        <h2 className="text-lg text-gray-600 mb-4">{profile.headline}</h2>
        <p className="mb-6 text-gray-800">{profile.summary}</p>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Key Strengths</h3>
          <ul className="list-disc list-inside text-gray-700">
            {profile.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, i) => (
              <span
                key={i}
                className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Experience</h3>
          <ul className="space-y-4">
            {profile.experience.map((exp, i) => (
              <li key={i} className="border-l-4 border-blue-400 pl-4">
                <div className="font-bold text-gray-900">
                  {exp.title} @ {exp.company}
                </div>
                <div className="text-gray-500 text-sm mb-1">{exp.period}</div>
                <div className="text-gray-700">{exp.description}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">AI/ML Summary</h3>
          <p className="text-gray-800">{profile.aiSummary}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Areas for Improvement</h3>
          <ul className="list-disc list-inside text-gray-700">
            {profile.areasForImprovement.map((area, i) => (
              <li key={i}>{area}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
