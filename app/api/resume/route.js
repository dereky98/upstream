import { AffindaAPI, AffindaCredential } from "@affinda/affinda";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Resume API route hit!");

  try {
    // Check if API key is configured
    if (!process.env.AFFINDA_API_KEY) {
      console.error("Missing AFFINDA_API_KEY in environment variables");
      return NextResponse.json({ error: "Affinda API key not configured" }, { status: 500 });
    }

    // Create Affinda client with API key
    const credential = new AffindaCredential(process.env.AFFINDA_API_KEY);
    const client = new AffindaAPI(credential);

    // Get the uploaded file from the request
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      console.error("No file uploaded");
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    console.log("File received:", file.name, file.type, file.size);

    // Convert the file to an array buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create document with proper workspace
    const workspaceId = "AkEArPht"; // Your workspace ID

    console.log("Creating document with Affinda client");
    const documentResponse = await client.createDocument({
      file: buffer,
      fileName: file.name,
      workspace: workspaceId,
      wait: "true", // Wait for processing to complete
    });

    // Log the full response structure to find the correct identifier
    console.log("Document upload response:", JSON.stringify(documentResponse, null, 2));

    // Check possible locations for the identifier
    const documentId =
      documentResponse.identifier ||
      documentResponse.id ||
      documentResponse.meta?.identifier ||
      documentResponse.documentId;

    if (!documentId) {
      console.error("Could not find document identifier in response");
      return NextResponse.json(
        {
          error: "Document uploaded but identifier not found in response",
          fullResponse: documentResponse,
        },
        { status: 500 }
      );
    }

    console.log("Document created successfully with ID:", documentId);

    // Now get the full document data with the parsed content
    console.log("Retrieving document data...");
    const documentData = await client.getDocument(documentId);

    // Extract work experience if available
    const workExperience = documentData.data?.workExperience || [];

    const response = {
      documentId: documentId,
      workHistory: workExperience.map((job) => ({
        jobTitle: job.jobTitle || "Unknown Title",
        organization: job.organization || "Unknown Organization",
        location: job.location || null,
        dates: job.dates || null,
        description: job.description || null,
      })),
      fullData: documentData, // Include full data for reference
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Server error processing resume:", error);
    return NextResponse.json(
      {
        error: "Failed to process resume",
        message: error.message,
        stack: error.stack,
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
