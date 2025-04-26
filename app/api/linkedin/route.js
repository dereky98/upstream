import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });
  }

  try {
    // Use fetch directly to call the RapidAPI endpoint
    const response = await fetch(
      `https://linkedin-data-api.p.rapidapi.com/get-profile-data-by-url?url=${encodeURIComponent(
        url
      )}`,
      {
        headers: {
          "x-rapidapi-key": "877c662fb0msh1b90a7c309b4e9ep152b4cjsne2ba253bb5fc",
          "x-rapidapi-host": "linkedin-data-api.p.rapidapi.com",
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching LinkedIn data:", error);
    return NextResponse.json({ error: "Failed to fetch LinkedIn data" }, { status: 500 });
  }
}
