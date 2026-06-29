import { NextRequest, NextResponse } from "next/server";

/**
 * API route to upload prescription PDF to backend
 * Backend will handle S3 upload and return the S3 URL
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "No projectId provided" },
        { status: 400 }
      );
    }

    // Validate PDF
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF file." },
        { status: 400 }
      );
    }

    // Create FormData for backend
    const backendFormData = new FormData();
    backendFormData.append("file", file);
    backendFormData.append("projectId", projectId);
    backendFormData.append("type", type || "prescription-pdf");

    // Call backend API to upload to S3
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/clinic/upload-pdf`, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Backend upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
