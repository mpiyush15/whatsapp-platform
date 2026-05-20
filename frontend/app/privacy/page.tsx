'use client'


export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white"><div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600 mb-2"><strong>Replysys Platform</strong></p>
          <p className="text-gray-600 mb-12">operated by <strong>Pixels Digital Solutions</strong> | Last Updated: January 2026</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 mb-4">
                Replysys (operated by Pixels Digital Solutions) ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p className="text-gray-700 mb-4">
                Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our services.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Information You Provide Directly</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Account Information:</strong> Name, email address, phone number, company name, billing address</li>
                <li><strong>Payment Information:</strong> Credit card details, billing address, transaction history</li>
                <li><strong>Communication Data:</strong> Messages, support tickets, feedback, and inquiries you send us</li>
                <li><strong>Customer Data:</strong> Contact lists, customer information you upload for messaging campaigns</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device type</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent, click patterns, search queries</li>
                <li><strong>Cookies:</strong> Session cookies, preference cookies, tracking cookies</li>
                <li><strong>Analytics:</strong> Google Analytics and similar tools for website performance</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">1.3 Information from Third Parties</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Payment processors and financial institutions</li>
                <li>WhatsApp and Meta platforms (for API integration)</li>
                <li>Authentication services and SSO providers</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use collected information for:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Providing and maintaining our services</li>
                <li>Processing payments and billing</li>
                <li>Sending transactional communications (confirmations, updates)</li>
                <li>Customer support and troubleshooting</li>
                <li>Improving and optimizing our platform</li>
                <li>Marketing and promotional communications (with consent)</li>
                <li>Legal compliance and fraud prevention</li>
                <li>Analytics and usage monitoring</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Sharing & Disclosure</h2>
              <p className="text-gray-700 mb-4">We do not sell your personal information. However, we may share data with:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Service Providers:</strong> Payment processors, hosting providers, email services</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Partners:</strong> In case of merger, acquisition, or bankruptcy</li>
                <li><strong>WhatsApp/Meta:</strong> For API integration and message delivery</li>
                <li><strong>Analytics Providers:</strong> For usage tracking and improvement</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement comprehensive security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>256-bit SSL Encryption:</strong> All data in transit is encrypted</li>
                <li><strong>Database Encryption:</strong> Sensitive data is encrypted at rest</li>
                <li><strong>Access Controls:</strong> Role-based access to sensitive information</li>
                <li><strong>Regular Audits:</strong> Security assessments and penetration testing</li>
                <li><strong>Compliance:</strong> GDPR, ISO 27001, and industry standards</li>
                <li><strong>Monitoring:</strong> Continuous monitoring for suspicious activities</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain data for as long as necessary to provide services:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Account Data:</strong> Retained while account is active, deleted 30 days after cancellation</li>
                <li><strong>Message Data:</strong> Retained for 90 days for compliance and troubleshooting</li>
                <li><strong>Payment Data:</strong> Retained for 7 years for tax and legal compliance</li>
                <li><strong>Analytics Data:</strong> Aggregated data retained indefinitely</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights & Choices</h2>
              <p className="text-gray-700 mb-4">You have the following rights regarding your data:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request data deletion (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Receive data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restriction:</strong> Request limitation of data processing</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies & Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use cookies to enhance your experience. You can control cookie settings through your browser:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
                <li><strong>Performance Cookies:</strong> Analytics and optimization</li>
                <li><strong>Marketing Cookies:</strong> Personalized advertising (optional)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Links</h2>
              <p className="text-gray-700 mb-4">
                Our website may contain links to third-party websites. We are not responsible for their privacy practices. Please review their privacy policies before providing information.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. GDPR Compliance</h2>
              <p className="text-gray-700 mb-4">
                For users in the European Union, we comply with the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Legal basis for data processing is explicitly stated</li>
                <li>Data processor agreements are in place with all vendors</li>
                <li>Data breach notification within 72 hours</li>
                <li>Data Protection Impact Assessments (DPIA) conducted</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. CCPA Compliance (California Users)</h2>
              <p className="text-gray-700 mb-4">
                For California residents, we comply with the California Consumer Privacy Act (CCPA). You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Know what personal information is collected</li>
                <li>Know whether your personal information is sold or disclosed</li>
                <li>Say no to the sale or sharing of your personal information</li>
                <li>Access your personal information</li>
                <li>Request deletion of your personal information</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our services are not directed to children under 13. We do not knowingly collect information from children. If we learn that we have collected data from a child under 13, we will promptly delete it.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                If you are located outside India, your information may be transferred to, and stored in, India. By using our services, you consent to such transfer and storage.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Policy Updates</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Last Updated" date. Continued use of our services constitutes acceptance of changes.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For privacy-related questions, data requests, or concerns:
              </p>
              <ul className="text-gray-700 space-y-2">
                <li>Email: privacy@pixelswhatsapp.com</li>
                <li>Support: support@pixelswhatsapp.com</li>
                <li>Phone: +91 98765 43210</li>
                <li>Address: Bangalore, India</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Data Protection Officer</h2>
              <p className="text-gray-700 mb-4">
                For EU/GDPR-related queries, you can contact our Data Protection Officer:
              </p>
              <p className="text-gray-700">
                Email: dpo@pixelswhatsapp.com
              </p>
            </section>
          </div>
        </div>
      </div></div>
  )
}
