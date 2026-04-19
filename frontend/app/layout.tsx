import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "./theme-script";
import WhatsAppWidget from "@/components/WhatsAppWidget";

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
        {/* Set WhatsApp Config ID from environment */}
        <script suppressHydrationWarning>
          {`window.WHATSAPP_CONFIG_ID = '${process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID || '1239299391737840'}';`}
        </script>
        {/* Meta SDK for Embedded Signup */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId            : '2094709584392829',
                  autoLogAppEvents : true,
                  xfbml            : true,
                  version          : 'v24.0'
                });
              };

              (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));

              // WhatsApp Embedded Signup Message Listener
              window.addEventListener('message', (event) => {
                if (event.origin !== "https://www.facebook.com") return;
                try {
                  const data = JSON.parse(event.data);
                  if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    console.log('✅ WhatsApp Embedded Signup Data Received:', data);
                    // Store session info for Settings page to access
                    sessionStorage.setItem('wa_signup_data', JSON.stringify(data));
                    // Dispatch custom event for Settings page to listen
                    window.dispatchEvent(new CustomEvent('wa_embedded_signup', { detail: data }));
                  }
                } catch (error) {
                  console.error('❌ Error processing WhatsApp Embedded Signup message:', error);
                }
              });

              // Facebook Business Login Callback
              window.fbLoginCallback = function(response) {
                console.log('📱 Facebook Login Response:', response);
                if (response.authResponse) {
                  const code = response.authResponse.code;
                  console.log('✅ Authorization Code Received:', code.substring(0, 20) + '...');
                  
                  // Store code for backend exchange
                  sessionStorage.setItem('fb_login_code', code);
                  sessionStorage.setItem('fb_login_time', new Date().toISOString());
                  
                  // Dispatch custom event so Settings page can handle it
                  window.dispatchEvent(new CustomEvent('fb_login_success', { detail: { code } }));
                  
                  console.log('🔄 Ready to exchange code for token');
                } else {
                  console.error('❌ User cancelled login or did not fully authorize');
                  window.dispatchEvent(new CustomEvent('fb_login_error', { detail: { message: 'User cancelled or did not authorize' } }));
                }
              };

              // Launch WhatsApp Embedded Signup Flow
              window.launchWhatsAppSignup = function() {
                console.log('🚀 Launching WhatsApp Embedded Signup...');
                if (typeof FB === 'undefined') {
                  console.error('❌ Facebook SDK not loaded yet');
                  return;
                }
                
                const configId = window.WHATSAPP_CONFIG_ID || '1239299391737840';
                console.log('📋 Using WhatsApp Config ID:', configId);
                
                FB.login(window.fbLoginCallback, {
                  config_id: configId,
                  response_type: 'code',
                  override_default_response_type: true,
                  extras: { 'version': 'v3' }
                });
              };
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white text-gray-900 transition-colors duration-300">
        {children}
        <WhatsAppWidget />
      </body>
    </html>
  );
}
