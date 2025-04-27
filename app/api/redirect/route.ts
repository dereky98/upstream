import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const target = searchParams.get("to");
  const id = searchParams.get("id");

  console.log(`Redirect helper requested: to=${target}, id=${id}`);

  if (!target) {
    return NextResponse.json({ error: "Missing 'to' parameter" }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
  }

  // Construct the redirect URL with proper URL encoding
  const redirectUrl = `/${target}?id=${encodeURIComponent(id)}`;
  console.log(`Redirecting to: ${redirectUrl}`);

  // Return a redirect response with a 307 Temporary Redirect
  return NextResponse.redirect(new URL(redirectUrl, request.url), 307);
} 