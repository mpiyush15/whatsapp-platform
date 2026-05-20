'use client';

import { motion } from 'framer-motion';
import { MarketingSection } from '@/components/marketing/MarketingSection';
import { whyWhatsAppCopy } from '@/components/marketing/marketing-landing-data';
import { WhatsAppIcon } from '@/components/marketing/WhatsAppIcon';

export function MarketingWhyWhatsAppSection() {
  return (
    <MarketingSection
      id="why-whatsapp"
      eyebrow={whyWhatsAppCopy.eyebrow}
      title={whyWhatsAppCopy.titleMain}
      titleHighlight={whyWhatsAppCopy.titleHighlight}
      subtitle={whyWhatsAppCopy.subtitle}
      tone="light"
      accent="whatsapp"
    >
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">
        {whyWhatsAppCopy.stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-black/[0.06] bg-white px-4 py-6 text-center shadow-sm sm:px-6"
          >
            <WhatsAppIcon className="marketing-icon-wa mx-auto mb-3 h-5 w-5 opacity-80" />
            <p className="marketing-stat-value text-3xl sm:text-4xl">{stat.value}</p>
            <p className="mt-2 text-sm text-[#6d6c6b]">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </MarketingSection>
  );
}
