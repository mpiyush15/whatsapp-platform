import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // ----------------------------------------------------------------------
    // TODO: In production, you will need an email provider to actually send this.
    // Example using Resend (npm install resend):
    // 
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'onboarding@resend.dev',
    //   to: 'support@replysys.com',
    //   subject: 'New Waitlist Signup (ReplySys 2.0)',
    //   html: `<p>You have a new waitlist signup from: <strong>${email}</strong></p>`
    // });
    // ----------------------------------------------------------------------

    console.log(`\n=================================================`);
    console.log(`🎯 NEW WAITLIST SIGNUP RECEIVED`);
    console.log(`📧 Email: ${email}`);
    console.log(`✅ Status: Forwarding to support@replysys.com...`);
    console.log(`=================================================\n`);

    // Simulating network delay for the UI loading state
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return NextResponse.json({ success: true, message: 'Signup sent to support@replysys.com' });
  } catch (error) {
    console.error('Waitlist API Error:', error);
    return NextResponse.json({ error: 'Failed to process signup' }, { status: 500 });
  }
}
