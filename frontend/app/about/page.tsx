'use client'

import { motion } from 'framer-motion'
import { Users, Target, Lightbulb, Zap } from 'lucide-react'
import { useState } from 'react'
import { BookDemoModal } from '@/components/BookDemoModal'

export default function AboutPage() {
  const [showDemoModal, setShowDemoModal] = useState(false)
  const founders = [
    {
      name: 'Piyush Magar',
      role: 'Founder & CEO',
      image: 'https://ik.imagekit.io/a0ivf97jq/alop.png?updatedAt=1764168497635',
      bio: 'With a passion for innovation and deep expertise in WhatsApp messaging platforms, Piyush Magar founded Replysys to help businesses unlock the true potential of customer conversations. Years of industry experience have shaped a vision of making WhatsApp Business a core channel for every business.',
    },
  ]

  const whyChooseUs = [
    {
      title: 'Customer-Centric Approach',
      description:
        'We build Replysys around what our users actually need. Your success is our metric for success.',
      icon: Target,
    },
    {
      title: 'WhatsApp Expertise',
      description:
        'Deep knowledge of WhatsApp Business API, compliance, and best practices to keep you ahead of the curve.',
      icon: Lightbulb,
    },
    {
      title: 'Reliable & Scalable',
      description:
        'From 100 to 100,000 messages a day, our infrastructure handles your growth without breaking a sweat.',
      icon: Zap,
    },
    {
      title: 'Dedicated Support',
      description: 'Our team is here to help you succeed with personal attention and quick response times.',
      icon: Users,
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <div className='min-h-screen bg-white'>{/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className='pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-green-50 to-white'
      >
        <div className='max-w-4xl mx-auto text-center'>
          <h1 className='text-5xl sm:text-6xl font-bold text-black mb-6'>About Replysys</h1>
          <p className='text-xl text-gray-700 max-w-2xl mx-auto'>
            We're a passionate team of communication experts dedicated to helping businesses turn WhatsApp into their
            most powerful customer engagement channel.
          </p>
        </div>
      </motion.section>

      {/* OUR STORY */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className='py-20 px-4 sm:px-6 lg:px-8 bg-white'
      >
        <div className='max-w-4xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className='mb-12'
          >
            <h2 className='text-4xl font-bold text-black mb-6'>Our Story</h2>
            <div className='space-y-4 text-gray-700 text-lg leading-relaxed'>
              <p>
                Replysys was born from a simple observation: businesses are losing customers and revenue because their
                WhatsApp strategies are fragmented, manual, and inefficient. We saw businesses struggling to manage
                customer conversations, track interactions, and scale their WhatsApp presence.
              </p>
              <p>
                We decided to fix this. Replysys is built by people who understand the WhatsApp ecosystem deeply. We've
                spent years integrating with Meta, understanding compliance requirements, and learning what makes
                customers actually engage on WhatsApp.
              </p>
              <p>
                Today, Replysys helps 500+ businesses across India, Southeast Asia, and beyond unlock the true potential
                of WhatsApp as their growth engine. We're committed to staying ahead of WhatsApp's capabilities and
                bringing the latest features to our users.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* WHY CHOOSE US */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className='py-20 px-4 sm:px-6 lg:px-8 bg-gray-50'
      >
        <div className='max-w-5xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className='text-center mb-16'
          >
            <h2 className='text-4xl font-bold text-black mb-4'>Why Choose Replysys</h2>
            <p className='text-gray-700 text-lg'>We bring expertise, reliability, and dedication to your growth</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true }}
            className='grid md:grid-cols-2 gap-8'
          >
            {whyChooseUs.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className='p-8 bg-white rounded-xl border-2 border-gray-200 hover:border-green-600 hover:shadow-lg transition-all'
                >
                  <div className='w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4'>
                    <Icon className='h-7 w-7 text-green-600' />
                  </div>
                  <h3 className='text-xl font-bold text-black mb-3'>{item.title}</h3>
                  <p className='text-gray-700'>{item.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* FOUNDER */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className='py-20 px-4 sm:px-6 lg:px-8 bg-white'
      >
        <div className='max-w-5xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className='text-center mb-16'
          >
            <h2 className='text-4xl font-bold text-black mb-4'>Meet Our Founder</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className='bg-gradient-to-br from-green-50 to-white p-12 rounded-2xl border-2 border-green-200'
          >
            <div className='flex flex-col lg:flex-row gap-12 items-center lg:items-start'>
              <motion.img
                whileHover={{ scale: 1.08 }}
                src={founders[0].image}
                alt={founders[0].name}
                className='w-64 h-64 lg:w-72 lg:h-72 rounded-2xl object-cover shadow-2xl flex-shrink-0'
              />
              <div className='flex-1'>
                <h3 className='text-4xl font-bold text-black mb-3'>{founders[0].name}</h3>
                <p className='text-xl text-green-600 font-semibold mb-6'>{founders[0].role}</p>
                <p className='text-gray-700 text-lg leading-relaxed'>{founders[0].bio}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* VALUES */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className='py-20 px-4 sm:px-6 lg:px-8 bg-white'
      >
        <div className='max-w-5xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className='text-center mb-16'
          >
            <h2 className='text-4xl font-bold text-black mb-4'>Our Core Values</h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true }}
            className='grid md:grid-cols-3 gap-6'
          >
            {[
              {
                title: 'Reliability',
                description: 'Your messages must reach customers. We ensure 99.9% uptime and instant delivery.',
              },
              {
                title: 'Transparency',
                description: 'No hidden fees, no surprises. You always know what you\'re paying for and what you get.',
              },
              {
                title: 'Innovation',
                description:
                  'We stay ahead of WhatsApp features and bring the latest capabilities to your business immediately.',
              },
              {
                title: 'Compliance',
                description:
                  'We handle all WhatsApp Business API compliance so you can focus on growing your customer relationships.',
              },
              {
                title: 'Support',
                description: 'Our team is available 24/7 to help you succeed. Your problems are our priorities.',
              },
              {
                title: 'Growth',
                description: 'We succeed when you succeed. Your business growth is the measure of our success.',
              },
            ].map((value, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className='p-6 bg-gradient-to-br from-green-50 to-white rounded-lg border-2 border-green-200'
              >
                <h3 className='text-lg font-bold text-black mb-2'>{value.title}</h3>
                <p className='text-gray-700'>{value.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className='py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-green-700'
      >
        <div className='max-w-4xl mx-auto text-center text-white'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className='text-4xl font-bold mb-6'>Ready to transform your customer engagement?</h2>
            <p className='text-lg text-green-100 mb-8 max-w-2xl mx-auto'>
              Join 500+ businesses already using Replysys to turn WhatsApp into their growth engine.
            </p>
            <button
              onClick={() => setShowDemoModal(true)}
              className='inline-block bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg'
            >
              Book Your Demo
            </button>
          </motion.div>
        </div>
      </motion.section>

      <BookDemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} /></div>
  )
}
