'use client'

import { ShoppingBag, Stethoscope, Home, BookOpen, ArrowRight, Check, Users, BarChart3, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ServicesPage() {
  const industries = [
    {
      icon: ShoppingBag,
      name: 'E-Commerce',
      description: 'Boost sales with personalized customer engagement',
      useCases: [
        'Order Status Updates - Keep customers informed in real-time',
        'Abandoned Cart Recovery - Win back customers with timely reminders',
        'Product Recommendations - Drive repeat purchases with personalized offers',
        'Flash Sale Announcements - Create urgency with time-limited deals',
        'Customer Support - Quick responses on WhatsApp for better satisfaction'
      ],
      benefits: [
        '40% increase in customer engagement',
        '25% improvement in order recovery',
        '60% faster customer support',
        'Real-time inventory updates',
        'Automated billing & invoices'
      ],
      stats: { customers: '2.5K+', increase: '35%', satisfaction: '94%' }
    },
    {
      icon: Stethoscope,
      name: 'Healthcare',
      description: 'Improve patient engagement and clinic management',
      useCases: [
        'Appointment Reminders - Reduce no-shows by 45%',
        'Prescription Updates - Send digital prescriptions instantly',
        'Test Results Notification - Immediate delivery to patients',
        'Consultation Follow-up - Post-appointment care instructions',
        'Medicine Reminders - Medication adherence tracking'
      ],
      benefits: [
        '45% reduction in no-shows',
        'HIPAA-compliant messaging',
        'Patient database integration',
        'Secure medical data transmission',
        'Automated insurance coordination'
      ],
      stats: { clinics: '500+', patients: '2M+', satisfaction: '98%' }
    },
    {
      icon: Home,
      name: 'Real Estate',
      description: 'Drive sales with instant property inquiries',
      useCases: [
        'Property Alerts - Send new listings directly to buyers',
        'Virtual Tour Links - Share 360° property views',
        'Document Sharing - Send contracts, agreements, papers securely',
        'Site Visit Scheduling - Automated booking system',
        'Price Negotiations - Direct communication with buyers'
      ],
      benefits: [
        '3x faster property inquiries',
        'Qualified lead generation',
        'Secure document exchange',
        'Automated site scheduling',
        'Transaction tracking'
      ],
      stats: { agents: '1.2K+', properties: '50K+', deals: '₹500Cr+' }
    },
    {
      icon: BookOpen,
      name: 'Education',
      description: 'Enhance student engagement and campus operations',
      useCases: [
        'Class Announcements - Send updates to students instantly',
        'Assignment Reminders - Help students stay on track',
        'Admission Notifications - Automated offer letters & updates',
        'Fee Reminders - Payment status and due dates',
        'Parent Communication - Keep parents informed about progress'
      ],
      benefits: [
        '80% parent engagement increase',
        'Reduced fee defaults by 30%',
        'Automated student communications',
        'Document delivery integration',
        'Multi-language support'
      ],
      stats: { institutions: '300+', students: '500K+', engagement: '+75%' }
    },
    {
      icon: Users,
      name: 'Restaurants & Food',
      description: 'Drive orders and improve customer loyalty',
      useCases: [
        'Order Confirmation - Instant order acknowledgment',
        'Delivery Status - Real-time tracking updates',
        'Menu Updates - Seasonal specials and new dishes',
        'Loyalty Rewards - Exclusive offers to repeat customers',
        'Feedback Requests - Post-delivery satisfaction surveys'
      ],
      benefits: [
        '50% increase in repeat orders',
        'Real-time order management',
        'Delivery partner integration',
        'Automated loyalty programs',
        'Customer data analytics'
      ],
      stats: { restaurants: '800+', orders: '2M+', growth: '60%' }
    },
    {
      icon: BarChart3,
      name: 'Finance & Insurance',
      description: 'Secure communication for financial services',
      useCases: [
        'Policy Updates - Send policy details and renewals',
        'Claim Status - Real-time claim tracking',
        'Premium Reminders - Timely payment notifications',
        'Document Delivery - Secure policy documents',
        'Fraud Alerts - Instant security notifications'
      ],
      benefits: [
        '95% premium collection rate',
        'RBI-compliant messaging',
        'Encryption for financial data',
        'Reduced claim processing time',
        'Customer verification integration'
      ],
      stats: { institutions: '150+', customers: '5M+', secure: '100%' }
    }
  ]

  const features = [
    {
      icon: Clock,
      title: 'Real-Time Delivery',
      description: 'Messages delivered instantly with 98%+ success rate'
    },
    {
      icon: Users,
      title: 'Multi-Agent Support',
      description: 'Multiple team members on a single WhatsApp number'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Track message delivery, engagement, and ROI metrics'
    },
    {
      icon: Check,
      title: 'Template Approval',
      description: 'Pre-approved message templates for compliance'
    }
  ]

  return (
    <div className="min-h-screen bg-white">{/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Solutions for Every Industry
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Tailored WhatsApp solutions designed for your business needs. From e-commerce to healthcare, we have the right tools for your industry.
          </p>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {industries.map((industry, index) => {
              const Icon = industry.icon
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{industry.name}</h3>
                  </div>
                  <p className="text-gray-600 mb-6">{industry.description}</p>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                    {Object.entries(industry.stats).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <p className="text-sm text-gray-500 capitalize">{key}</p>
                        <p className="text-lg font-bold text-green-600">{value}</p>
                      </div>
                    ))}
                  </div>

                  <Link href={`/services/${industry.name.toLowerCase().replace(/ /g, '-')}`}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Industry Details - E-Commerce */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">E-Commerce Solutions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Use Cases</h3>
              <ul className="space-y-4">
                {industries[0].useCases.map((useCase, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Benefits</h3>
              <ul className="space-y-4">
                {industries[0].benefits.map((benefit, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare Details */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Healthcare Solutions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Use Cases</h3>
              <ul className="space-y-4">
                {industries[1].useCases.map((useCase, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Benefits</h3>
              <ul className="space-y-4">
                {industries[1].benefits.map((benefit, idx) => (
                  <li key={idx} className="flex gap-3">
                    <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Common Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-green-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Features for All Industries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="bg-white rounded-lg p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of businesses already using PixelsWhatsApp to drive growth
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/register">
              <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section></div>
  )
}
