import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Resume API route hit!");

  try {
    if (!process.env.AFFINDA_API_KEY) {
      console.error("Missing AFFINDA_API_KEY in environment variables");
      return NextResponse.json({ error: "Affinda API key not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      console.error("No file uploaded");
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    console.log("File received:", file.name, file.type, file.size);

    try {
      console.log("Uploading resume to Affinda API directly");

      // Create form data for the API request
      const formDataForAffinda = new FormData();
      formDataForAffinda.append("file", file);
      formDataForAffinda.append("wait", "true");

      // Make the request to the Affinda API using v2 endpoint
      const response = await fetch("https://api.affinda.com/v2/resumes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AFFINDA_API_KEY}`,
        },
        body: formDataForAffinda,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upload failed with status ${response.status}: ${errorText}`);
        return NextResponse.json(
          {
            error: "Failed to upload resume to Affinda",
            status: response.status,
            details: errorText,
          },
          { status: response.status }
        );
      }

      // Parse the response
      const result = await response.json();

      // Detailed console logging
      console.log("====== FULL RESUME RESPONSE PAYLOAD ======");
      console.log(JSON.stringify(result, null, 2));
      console.log("======= DOCUMENT ID =======");
      console.log(result.identifier || result.meta?.identifier);
      console.log("======= PERSONAL INFO =======");
      console.log(JSON.stringify(result.data?.name, null, 2));
      console.log(JSON.stringify(result.data?.emails, null, 2));
      console.log(JSON.stringify(result.data?.phoneNumbers, null, 2));
      console.log("======= WORK EXPERIENCE =======");
      console.log(JSON.stringify(result.data?.workExperience, null, 2));
      console.log("======= EDUCATION =======");
      console.log(JSON.stringify(result.data?.education, null, 2));
      console.log("======= SKILLS =======");
      console.log(JSON.stringify(result.data?.skills, null, 2));
      console.log("====== END RESUME PAYLOAD ======");

      // Extract document ID
      const documentId = result.identifier || result.meta?.identifier;

      if (!documentId) {
        return NextResponse.json(
          {
            error: "Resume uploaded but no identifier returned",
            result,
          },
          { status: 500 }
        );
      }

      console.log(`Resume uploaded successfully with ID: ${documentId}`);

      // Check if we have any parsed data
      if (!result.data || Object.keys(result.data).length === 0) {
        console.log("No parsed data available in the response");
        return NextResponse.json({
          message: "Resume was uploaded but no parsed data available",
          documentId,
          rawResponse: result,
        });
      }

      // Structured extraction
      const parsed = result.data;

      const structuredData = {
        personal: {
          name: {
            first: parsed?.name?.first || null,
            middle: parsed?.name?.middle || null,
            last: parsed?.name?.last || null,
            raw: parsed?.name?.raw || null,
          },
          emails: parsed?.emails || [],
          phoneNumbers: parsed?.phoneNumbers || [],
          location: parsed?.location || {},
          websites: parsed?.websites || [],
        },
        workExperience: (parsed?.workExperience || []).map((job) => ({
          jobTitle: job?.jobTitle || null,
          organization: job?.organization || null,
          location: job?.location || null,
          dates: {
            start: job?.dates?.start || null,
            end: job?.dates?.end || null,
            isCurrent: job?.dates?.isCurrent || false,
          },
          description: job?.description || null,
        })),
        education: (parsed?.education || []).map((edu) => ({
          institution: edu?.organization || null,
          degree: edu?.accreditation?.education || null,
          field: edu?.accreditation?.inputStr || null,
          grade: edu?.grade || null,
          location: edu?.location || null,
          dates: {
            start: edu?.dates?.start || null,
            end: edu?.dates?.end || null,
          },
        })),
        skills: (parsed?.skills || []).map((skill) => skill?.name || skill),
        languages: parsed?.languages || [],
        certifications: (parsed?.certifications || []).map((cert) => ({
          name: cert?.name || null,
          issuer: cert?.issuer || null,
          date: cert?.date || null,
        })),
      };

      // Return the successfully parsed data
      return NextResponse.json({
        message: "Resume processed successfully",
        documentId,
        structuredData,
        meta: result.meta,
      });
    } catch (processError) {
      console.error("Error processing resume:", processError);

      // Return a more detailed error
      return NextResponse.json(
        {
          error: "Failed to process resume",
          message: processError.message,
          details: processError.toString(),
        },
        { status: 500 }
      );
    }
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
