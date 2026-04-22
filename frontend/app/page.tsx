"use client";

import { useState } from "react";

export default function LaunchingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
        setEmail("");
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        setError("Failed to subscribe. Please try again.");
      }
    } catch (err) {
      setError("Error subscribing. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6">
      {/* Header with ReplySys */}
      <div className="pt-8 pb-4 text-center">
        <h2 className="text-4xl font-bold text-gray-900">ReplySys</h2>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl text-center space-y-8">

          {/* Badge */}
          <div className="inline-block px-4 py-1 text-sm bg-green-100 text-green-700 rounded-full">
            🚀 Launching Soon
          </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
          Turn WhatsApp Conversations Into{" "}
          <span className="text-green-600">Paying Customers</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg text-gray-600">
          Capture leads, automate follow-ups, and close sales on WhatsApp — all in one system.
        </p>

        {/* Value bullets */}
        <div className="text-sm text-gray-500 space-y-2">
          <p>✔ Capture leads from ads</p>
          <p>✔ Automate follow-ups instantly</p>
          <p>✔ Convert chats into revenue</p>
          <p>✔ Track everything in one dashboard</p>
        </div>

        {/* CTA */}
        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for launch updates"
            required
            className="px-4 py-3 border rounded-xl w-full sm:w-72 focus:outline-none focus:border-green-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        {submitted && (
          <div className="mt-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm">
            ✓ Thanks! Check your email for launch updates.
          </div>
        )}

        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Trust */}
        <p className="text-xs text-gray-400">
          Built on WhatsApp Cloud API • High delivery • No spam
        </p>

        </div>
      </div>
    </div>
  );
}
