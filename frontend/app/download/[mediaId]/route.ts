import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export async function GET(
  request: Request,
  { params }: { params: { mediaId: string } }
) {
  try {
    const mediaId = params.mediaId;

    if (!mediaId) {
      return new NextResponse('Media ID is required', { status: 400 });
    }

    // Call the backend public endpoint to get the signed URL
    const response = await fetch(`${API_URL}/media-library/public/${mediaId}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      return new NextResponse('File not found or expired', { status: 404 });
    }

    const data = await response.json();

    if (!data.success || !data.url) {
      return new NextResponse('Failed to generate secure link', { status: 500 });
    }

    // Redirect the user to the fresh S3 signed URL
    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error('Download redirect error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
