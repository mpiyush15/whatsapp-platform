'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { ErrorToast } from './ErrorToast';
import { PlanAgreementModal } from './PlanAgreementModal';
import Link from 'next/link';

interface Feature {
  _id: string;
  name: string;
  description?: string;
  included: boolean;
  limit?: number;
}

interface PricingPlan {
  _id: string;
  planId: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  monthlyDiscount: number;
  yearlyDiscount: number;
  limits: Record<string, number>;
  features: Feature[];
  isPopular: boolean;
}

export default function PricingCards() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing/plans/public`);
        const data = await response.json();
        if (data.success) {
          setPlans(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch pricing plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getPrice = (plan: PricingPlan) => {
    if (billingCycle === 'annual') {
      return plan.yearlyPrice;
    }
    return plan.monthlyPrice;
  };

  const getDiscount = (plan: PricingPlan) => {
    if (billingCycle === 'annual') {
      return plan.yearlyDiscount;
    }
    return plan.monthlyDiscount;
  };

  const getFinalPrice = (plan: PricingPlan) => {
    const price = getPrice(plan);
    const discount = getDiscount(plan);
    return price - (price * discount) / 100;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan for your business
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Annual
              {plans.some(p => getDiscount(p) > 0) && (
                <span className="ml-2 text-sm bg-green-500 text-white px-2 py-1 rounded">
                  Save up to 20%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`relative rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 ${
                plan.isPopular ? 'ring-2 ring-blue-600 md:scale-105' : ''
              } bg-white`}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg text-sm font-bold">
                  Popular
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                {plan.description && (
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
                )}

                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold text-gray-900">
                    {plan.currency}
                    {getFinalPrice(plan).toFixed(0)}
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    per {billingCycle === 'annual' ? 'year' : 'month'}
                  </p>
                  {getDiscount(plan) > 0 && (
                    <p className="text-green-600 text-sm mt-2">
                      Save {getDiscount(plan)}% with {billingCycle} billing
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    setSelectedPlanName(plan.name);
                    setShowAgreementModal(true);
                  }}
                  className={`block w-full py-3 px-4 rounded-lg font-semibold text-center transition-all mb-8 ${
                    plan.isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </button>

                {/* Limits */}
                {Object.keys(plan.limits).length > 0 && (
                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-4">
                      Limits
                    </p>
                    <ul className="space-y-3">
                      {Object.entries(plan.limits).map(([key, value]) => (
                        <li key={key} className="flex justify-between text-sm text-gray-600">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-semibold">
                            {value === null ? 'Unlimited' : value.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Features */}
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-4">
                    Features
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature._id} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? 'text-gray-700 text-sm' : 'text-gray-400 text-sm line-through'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes, we offer a 14-day free trial for all plans. No credit card required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept credit cards, debit cards, UPI, and bank transfers through our secure payment gateway.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee if you're not satisfied with our service.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Agreement Modal */}
      <PlanAgreementModal
        isOpen={showAgreementModal}
        planName={selectedPlanName}
        onClose={() => {
          setShowAgreementModal(false);
          setSelectedPlanName('');
        }}
        onConfirm={() => {
          // Redirect to checkout after agreement
          const plan = plans.find((p) => p.name === selectedPlanName);
          const planKey = plan ? (plan.planId || plan.name).toLowerCase() : selectedPlanName.toLowerCase();
          window.location.href = `/auth/register?plan=${encodeURIComponent(planKey)}&cycle=${billingCycle}`;
        }}
      />
    </div>
  );
}
