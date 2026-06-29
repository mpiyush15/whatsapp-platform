'use client';

import { motion } from 'framer-motion';

type MarketingProblemGlassCardsProps = {
  items: readonly string[];
};

export function MarketingProblemGlassCards({ items }: MarketingProblemGlassCardsProps) {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
      {items.map((text, i) => (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="marketing-problem-glass-card rounded-2xl px-3.5 py-4 text-left sm:px-4 sm:py-4"
        >
          <p className="text-[12px] font-medium leading-snug text-[#3f3f46] sm:text-[13px] sm:leading-relaxed">
            {text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
