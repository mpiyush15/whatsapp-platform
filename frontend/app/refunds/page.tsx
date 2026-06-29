'use client'

import { CheckCircle, AlertCircle, Clock, DollarSign, ShieldAlert } from 'lucide-react'

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white"><div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Refunds & Cancellations</h1>
          <p className="text-gray-600 mb-12">Last Updated: January 2026</p>

          <div className="space-y-12">
            {/* Overview */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Policy Overview
              </h2>
              <p className="text-gray-700 leading-relaxed">
                At Replysys (operated by Pixels Digital Solutions), we want you to be completely satisfied with your subscription. 
                If you're not happy with our service, we offer a straightforward refund and cancellation policy that protects your interests.
              </p>
            </section>

            {/* Money Back Guarantee */}
            <section className="bg-green-50 rounded-lg p-8 border border-green-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                30-Day Money-Back Guarantee
              </h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>100% Refund:</strong> If you're not satisfied within 30 days of purchase, we'll refund your entire payment.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>No Questions Asked:</strong> You don't need to provide a detailed reason for requesting a refund.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Full Feature Access:</strong> You get complete access to all features during the trial period.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Easy Process:</strong> Simply contact our support team with your request.</span>
                </li>
              </ul>
            </section>

            {/* Refund Eligibility */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-blue-600" />
                Refund Eligibility
              </h2>
              <div className="space-y-4">
                <div className="border-l-4 border-green-600 pl-6 py-4">
                  <h3 className="font-bold text-gray-900 mb-2">✅ Eligible for Refund:</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• You're within 30 days of your purchase date</li>
                    <li>• You have an active subscription with us</li>
                    <li>• You've submitted the refund request in writing</li>
                    <li>• Your account is in good standing (no violations)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-600 pl-6 py-4">
                  <h3 className="font-bold text-gray-900 mb-2">❌ Not Eligible for Refund:</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Request made after 30 days from purchase</li>
                    <li>• Refund already processed for this billing cycle</li>
                    <li>• Account used in violation of Terms & Conditions</li>
                    <li>• Spam, harassment, or fraudulent activities detected</li>
                    <li>• Service abuse or excessive resource usage</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Refund Process */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-6 w-6 text-orange-600" />
                Refund Process & Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">1</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Submit Refund Request</h3>
                    <p className="text-gray-700">Email support@replysys.com with "Refund Request" as the subject line, including your account details.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">2</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Verification (1-2 Business Days)</h3>
                    <p className="text-gray-700">Our team verifies your eligibility and checks the refund policy criteria.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">3</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Approval & Processing (1-2 Business Days)</h3>
                    <p className="text-gray-700">Once approved, we initiate the refund to your original payment method.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">4</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Refund Received (3-7 Business Days)</h3>
                    <p className="text-gray-700">Refund appears in your account. Timeline depends on your bank/payment provider.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Total Processing Time:</strong> 5-11 business days from submission to receiving the refund in your account.
                </p>
              </div>
            </section>

            {/* Subscription Cancellation */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                Subscription Cancellation
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Cancel Anytime</h3>
                  <p className="text-gray-700 mb-4">
                    You can cancel your subscription at any time through your dashboard settings or by contacting us. 
                    There are no long-term contracts or hidden cancellation fees.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <h3 className="font-bold text-gray-900">Cancellation Options:</h3>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">1. Self-Service Cancellation (Recommended)</h4>
                    <p className="text-gray-700 mb-3">Via your account dashboard:</p>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                      <li>Log in to your Replysys account</li>
                      <li>Go to Settings → Subscription</li>
                      <li>Click "Cancel Subscription"</li>
                      <li>Choose cancellation reason (optional)</li>
                      <li>Confirm cancellation</li>
                    </ol>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">2. Manual Cancellation</h4>
                    <p className="text-gray-700">
                      Email <strong>support@replysys.com</strong> with "Cancel Subscription" as subject line.
                      Include your account email and confirmation that you want to cancel.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* What Happens on Cancellation */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Happens When You Cancel?</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Immediate Effect:</strong> Your subscription is canceled immediately upon confirmation.</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Data Access:</strong> You retain access to your account until the end of your current billing cycle.</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>No Refund:</strong> If you cancel mid-cycle, no partial refunds are issued (unless within 30-day guarantee).</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Data Export:</strong> You can export your data before cancellation. After 30 days, your account is deleted.</span>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Reactivation:</strong> You can reactivate your account anytime by subscribing again.</span>
                </div>
              </div>
            </section>

            {/* Downgrade Option */}
            <section className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">💡 Alternative: Plan Downgrade</h2>
              <p className="text-gray-700 mb-4">
                Don't want to cancel completely? Consider downgrading to a lower-tier plan instead:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>Pro Plan → Starter Plan:</strong> Save costs while keeping your data</li>
                <li>• <strong>Flexible Change:</strong> Downgrade anytime during your billing cycle</li>
                <li>• <strong>Pro-rata Credit:</strong> Unused portion is credited to your account</li>
                <li>• <strong>Easy Upgrade:</strong> Upgrade back to Pro anytime</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Contact <strong>support@replysys.com</strong> to discuss downgrading options tailored to your needs.
              </p>
            </section>

            {/* Refund Requests */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Request a Refund</h2>
              <div className="bg-green-50 rounded-lg p-8 border border-green-200">
                <p className="font-semibold text-gray-900 mb-4">Send an email to:</p>
                <p className="text-2xl font-bold text-green-600 mb-6">support@replysys.com</p>
                
                <p className="font-semibold text-gray-900 mb-3">Include in your email:</p>
                <ul className="space-y-2 text-gray-700 ml-6">
                  <li>✓ Your account email address</li>
                  <li>✓ Your full name</li>
                  <li>✓ Purchase date and amount</li>
                  <li>✓ Brief reason for refund request (optional)</li>
                </ul>

                <div className="mt-6 p-4 bg-white rounded border border-green-200">
                  <p className="text-sm text-gray-700">
                    <strong>Example Subject Line:</strong> "Refund Request - [Your Account Email]"
                  </p>
                </div>
              </div>
            </section>

            {/* Exceptions */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Special Cases & Exceptions</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-yellow-600 pl-6 py-4 bg-yellow-50 rounded">
                  <h3 className="font-bold text-gray-900 mb-2">Technical Issues</h3>
                  <p className="text-gray-700">
                    If you experience technical issues preventing service use, we'll work with you to resolve them. 
                    Refund eligibility may be extended beyond 30 days if we cannot resolve your issue.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-600 pl-6 py-4 bg-yellow-50 rounded">
                  <h3 className="font-bold text-gray-900 mb-2">Billing Errors</h3>
                  <p className="text-gray-700">
                    If you were double-charged or charged incorrectly, we'll issue a full refund immediately upon verification.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-600 pl-6 py-4 bg-yellow-50 rounded">
                  <h3 className="font-bold text-gray-900 mb-2">Service Unavailability</h3>
                  <p className="text-gray-700">
                    Extended service outages (&gt;24 hours) may make you eligible for a pro-rata refund or credit, even outside the 30-day window.
                  </p>
                </div>
              </div>
            </section>

            {/* Questions */}
            <section className="bg-blue-50 rounded-lg p-8 border border-blue-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Have Questions?</h2>
              <p className="text-gray-700 mb-4">
                Our support team is here to help. Reach out with any questions about refunds or cancellations:
              </p>
              <div className="space-y-2">
                <p><strong>📧 Email:</strong> <a href="mailto:support@replysys.com" className="text-blue-600 hover:underline">support@replysys.com</a></p>
                <p><strong>📞 Phone:</strong> <a href="tel:+919999999999" className="text-blue-600 hover:underline">+91 9999 999 999</a></p>
                <p><strong>💬 Response Time:</strong> Within 24 hours</p>
              </div>
            </section>

            {/* Last Updated */}
            <div className="text-center pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Last Updated: January 21, 2026<br/>
                © 2026 Replysys by Pixels Digital Solutions. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div></div>
  )
}
