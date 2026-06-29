import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "./theme-script";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import { DomainProvider } from "@/lib/context/DomainContext";
import DomainAwareLayout from "@/components/DomainAwareLayout";
import { AuthProvider } from "@/lib/auth-context";

const faviconUrl = "https://pixels-official.s3.ap-south-1.amazonaws.com/whatsapp-media/edited-photo.png";

export const metadata: Metadata = {
  title: "Replysys - Business Messaging Platform",
  description: "Transform your customer engagement with our powerful WhatsApp Business API platform. Send messages, automate conversations, and scale your business communication.",
  keywords: ["WhatsApp API", "WhatsApp Business", "Business Messaging", "Customer Engagement", "WhatsApp Automation", "Bulk WhatsApp", "WhatsApp CRM"],
  authors: [{ name: "Replysys" }],
  icons: {
    icon: faviconUrl,
    shortcut: faviconUrl,
    apple: faviconUrl,
  },
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
        <link rel="icon" href={faviconUrl} type="image/png" />
        <link rel="shortcut icon" href={faviconUrl} type="image/png" />
        <link rel="apple-touch-icon" href={faviconUrl} />
        <ThemeScript />
        {/* Flow B: Embedded Signup - Clean Implementation */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.WHATSAPP_CONFIG_ID = '${process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID || '1239299391737840'}';`
          }}
        />
        
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
                    version: 'v20.0' // Use a stable version
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
                window.launchWhatsAppSignup = function(callback) {
                  console.log('🚀 Launching WhatsApp Embedded Signup...');
                  
                  if (typeof FB === 'undefined') {
                    console.error('❌ Facebook SDK not loaded yet');
                    if (callback) callback({ error: 'SDK_NOT_LOADED' });
                    return;
                  }
                  
                  const configId = window.WHATSAPP_CONFIG_ID || '1239299391737840';
                  console.log('📋 Using WhatsApp Config ID:', configId);
                  
                  try {
                    // Launch Embedded Signup popup
                    FB.login(function(response) {
                      console.log('FB login response:', response);
                      if (callback) callback(response);
                    }, {
                      config_id: configId,
                      response_type: 'code',
                      override_default_response_type: true,
                      extras: { 'feature': 'whatsapp_embedded_signup', 'version': '2' }
                    });
                  } catch (e) {
                    console.error('Failed to launch FB login:', e);
                    if (callback) callback({ error: e.message });
                  }
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
        <AuthProvider>
          <DomainProvider>
            <DomainAwareLayout>
              {children}
            </DomainAwareLayout>
            <WhatsAppWidget />
          </DomainProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
