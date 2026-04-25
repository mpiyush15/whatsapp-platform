import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "./theme-script";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import { DomainProvider } from "@/lib/context/DomainContext";
import DomainAwareLayout from "@/components/DomainAwareLayout";

export const metadata: Metadata = {
  title: "Replysys - Business Messaging Platform",
  description: "Transform your customer engagement with our powerful WhatsApp Business API platform. Send messages, automate conversations, and scale your business communication.",
  keywords: ["WhatsApp API", "WhatsApp Business", "Business Messaging", "Customer Engagement", "WhatsApp Automation", "Bulk WhatsApp", "WhatsApp CRM"],
  authors: [{ name: "Replysys" }],
  openGraph: {
    title: "Replysys - Business Messaging Platform",
    description: "Transform your customer engagement with our powerful WhatsApp Business API platform.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Replysys",
    description: "Transform your customer engagement with WhatsApp Business API",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
        {/* Flow B: Embedded Signup - Clean Implementation */}
        <script suppressHydrationWarning>
          {`window.WHATSAPP_CONFIG_ID = '${process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID || '1239299391737840'}';`}
        </script>
        
        {/* Meta SDK for WhatsApp Embedded Signup */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Initialize Facebook SDK
                window.fbAsyncInit = function() {
                  FB.init({
                    appId: '2094709584392829',
                    version: 'v24.0'
                  });
                };

                // Load Facebook SDK
                (function (d, s, id) {
                  var js, fjs = d.getElementsByTagName(s)[0];
                  if (d.getElementById(id)) return;
                  js = d.createElement(s);
                  js.id = id;
                  js.src = "https://connect.facebook.net/en_US/sdk.js";
                  fjs.parentNode.insertBefore(js, fjs);
                }(document, 'script', 'facebook-jssdk'));

                // Launch WhatsApp Embedded Signup (Flow B)
                window.launchWhatsAppSignup = function() {
                  console.log('🚀 Launching WhatsApp Embedded Signup...');
                  
                  if (typeof FB === 'undefined') {
                    console.error('❌ Facebook SDK not loaded yet');
                    return;
                  }
                  
                  const configId = window.WHATSAPP_CONFIG_ID || '1239299391737840';
                  console.log('📋 Using WhatsApp Config ID:', configId);
                  
                  // Launch Embedded Signup popup
                  FB.login(function() {}, {
                    config_id: configId,
                    response_type: 'code',
                    override_default_response_type: true,
                    extras: { 'version': 'v3' }
                  });
                };

                // Listen to postMessage events from popup
                window.addEventListener('message', (event) => {
                  if (event.origin !== "https://www.facebook.com") return;
                  
                  // Meta sends postMessage with JSON string data
                  let parsed = event.data;
                  if (typeof event.data === 'string') {
                    try {
                      parsed = JSON.parse(event.data);
                    } catch (error) {
                      return; // Not JSON, ignore
                    }
                  }
                  
                  if (parsed?.type === 'WA_EMBEDDED_SIGNUP' && parsed?.event === 'FINISH') {
                    const { waba_id, phone_number_id } = parsed.data || {};
                    console.log('✅ FINISH event received in layout:', { waba_id, phone_number_id });
                    // Settings page listener will capture and handle this
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white text-gray-900 transition-colors duration-300">
        <DomainProvider>
          <DomainAwareLayout>
            {children}
          </DomainAwareLayout>
          <WhatsAppWidget />
        </DomainProvider>
      </body>
    </html>
  );
}
