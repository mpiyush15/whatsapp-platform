import { API_URL } from '@/lib/config/api'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_URL}/demo/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return Response.json(
        { message: data.message || 'Failed to book demo' },
        { status: response.status }
      )
    }

    return Response.json(data, { status: 201 })
  } catch (error) {
    return Response.json(
      { message: 'Failed to book demo' },
      { status: 500 }
    )
  }
}
