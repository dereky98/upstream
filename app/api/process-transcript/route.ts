import { getApiKey } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;
    
    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }
    
    // Get OpenAI API key from environment
    const apiKey = getApiKey("OPENAI_API_KEY", "");
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is not configured" },
        { status: 500 }
      );
    }
    
    // Call OpenAI API to process the transcript
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert interview analyzer. Extract key insights, strengths, and areas for improvement from the following interview transcript."
          },
          {
            role: "user",
            content: `Please analyze this interview transcript and provide a structured summary including:\n\n1. Candidate's key strengths\n2. Technical skills demonstrated\n3. Areas for improvement\n4. Overall assessment\n\nTranscript:\n${transcript}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error("Error from OpenAI:", result);
      return NextResponse.json(
        { error: result.error?.message || "Failed to process transcript" },
        { status: response.status }
      );
    }
    
    const content = result.choices[0]?.message?.content || "";
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error processing transcript:", error);
    return NextResponse.json(
      { error: "Failed to process transcript" },
      { status: 500 }
    );
  }
} 