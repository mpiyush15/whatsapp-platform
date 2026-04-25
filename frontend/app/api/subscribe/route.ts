import { NextRequest, NextResponse } from "next/server";

// Store emails (in production, this would be a database)
const subscribedEmails: string[] = [];

// Send email via Zepto
async function sendZeptoEmail(toEmail: string) {
  try {
    const response = await fetch("https://api.zeptomail.com/v1.1/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.ZEPTO_API_TOKEN}`,
      },
      body: JSON.stringify({
        from: {
          address: process.env.ZEPTO_FROM || "no-reply@enromatics.com",
          name: "ReplySys",
        },
        to: [
          {
            email_address: {
              address: toEmail,
              name: "Subscriber",
            },
          },
        ],
        subject: "🚀 You're on the ReplySys Launch List!",
        htmlbody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Welcome to ReplySys!</h2>
            <p>Thanks for subscribing! 🎉</p>
            <p>We'll notify you as soon as ReplySys launches. Get ready to turn your WhatsApp conversations into paying customers.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              © 2026 ReplySys. All rights reserved.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }

    return true;
  } catch (error) {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // Add to list
    if (!subscribedEmails.includes(email)) {
      subscribedEmails.push(email);
    }

    // Send confirmation email via Zepto
    await sendZeptoEmail(email);

    return NextResponse.json(
      { success: true, message: "Subscribed successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
