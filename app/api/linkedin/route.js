import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });
  }

  // Check if API key is configured
  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/get-profile-data-by-url?url=${encodeURIComponent(url)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.RAPIDAPI_HOST,
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

export async function POST(request) {
  // Check if API key is configured
  if (!process.env.AFFINDA_API_KEY) {
    return NextResponse.json({ error: "Affinda API key not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    // Convert file to array buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a form data object to send to Affinda
    const affindaFormData = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    affindaFormData.append("file", blob, file.name);

    // Make request to Affinda API
    const response = await fetch("https://api.affinda.com/v3/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AFFINDA_API_KEY}`,
        // No Content-Type header needed as it's set automatically with FormData
      },
      body: affindaFormData,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing resume:", error);
    return NextResponse.json({ error: "Failed to process resume" }, { status: 500 });
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
