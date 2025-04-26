import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Resume API route hit!");

  try {
    // Check if API key is configured
    if (!process.env.AFFINDA_API_KEY) {
      console.error("Missing AFFINDA_API_KEY in environment variables");
      return NextResponse.json({ error: "Affinda API key not configured" }, { status: 500 });
    }

    // First, try to fetch existing workspaces
    const organizationId = "JJRIFpPk"; // Your org ID from screenshots
    console.log("Using organization ID:", organizationId);

    const workspacesResponse = await fetch(
      `https://api.affinda.com/v3/workspaces?organization=${organizationId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AFFINDA_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    let workspaceId = "";

    if (workspacesResponse.ok) {
      const workspacesData = await workspacesResponse.json();

      // Log the entire response structure to debug
      console.log("Workspaces response:", JSON.stringify(workspacesData, null, 2));

      // Check if there are any workspaces
      if (
        workspacesData &&
        Array.isArray(workspacesData.results) &&
        workspacesData.results.length > 0
      ) {
        // Use existing workspace
        workspaceId = workspacesData.results[0].identifier;
        console.log("Using existing workspace:", workspaceId);
      } else {
        // Use the workspace we've previously created
        workspaceId = "AkEArPht"; // This is the workspace ID that worked previously
        console.log("Using hardcoded workspace ID:", workspaceId);
      }
    } else {
      // If we can't fetch workspaces, use the known working ID
      workspaceId = "AkEArPht";
      console.log("Failed to fetch workspaces, using hardcoded workspace ID:", workspaceId);
    }

    // Get the uploaded file from the request
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      console.error("No file uploaded");
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    console.log("File received:", file.name, file.type, file.size);

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create multipart form data
    const formDataForAffinda = new FormData();
    const blob = new Blob([buffer], { type: file.type });
    formDataForAffinda.append("file", blob, file.name);
    formDataForAffinda.append("workspace", workspaceId);

    console.log("Making request to Affinda API with workspace:", workspaceId);

    // Upload document for parsing
    const uploadResponse = await fetch("https://api.affinda.com/v3/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AFFINDA_API_KEY}`,
      },
      body: formDataForAffinda,
    });

    console.log("Upload response status:", uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload error:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          {
            error: "Failed to upload document to Affinda",
            details: errorData,
          },
          { status: uploadResponse.status }
        );
      } catch (e) {
        return NextResponse.json(
          {
            error: "Failed to upload document to Affinda",
            details: errorText,
          },
          { status: uploadResponse.status }
        );
      }
    }

    const uploadData = await uploadResponse.json();
    console.log("Document uploaded successfully");

    // Return the full data to be logged in the browser console
    return NextResponse.json(uploadData);
  } catch (error) {
    console.error("Server error processing resume:", error);
    return NextResponse.json(
      {
        error: "Failed to process resume",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Optional: Configure body size limit
export const config = {
  api: {
    // Increase limit for file uploads if needed
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
