'use client';

import { motion } from 'framer-motion';

type HelpsBullet = {
  title: string;
  angle?: string;
  body: string;
};

const STICKY_THEMES = [
  {
    background: 'linear-gradient(152deg, #fffbeb 0%, #fde68a 55%, #fcd34d 100%)',
    shadow: '4px 6px 18px rgba(180, 120, 0, 0.22), 0 1px 0 rgba(255,255,255,0.9) inset',
    rotate: '-2.5deg',
    tape: 'rgba(253, 224, 71, 0.85)',
    label: 'text-amber-900/70',
    title: 'text-amber-950',
    body: 'text-amber-950/80',
  },
  {
    background: 'linear-gradient(152deg, #fdf2f8 0%, #fbcfe8 55%, #f9a8d4 100%)',
    shadow: '4px 6px 18px rgba(190, 70, 120, 0.2), 0 1px 0 rgba(255,255,255,0.9) inset',
    rotate: '1.5deg',
    tape: 'rgba(251, 191, 216, 0.9)',
    label: 'text-rose-900/70',
    title: 'text-rose-950',
    body: 'text-rose-950/80',
  },
  {
    background: 'linear-gradient(152deg, #ecfeff 0%, #a5f3fc 55%, #67e8f9 100%)',
    shadow: '4px 6px 18px rgba(14, 116, 144, 0.2), 0 1px 0 rgba(255,255,255,0.9) inset',
    rotate: '-1deg',
    tape: 'rgba(103, 232, 249, 0.85)',
    label: 'text-cyan-900/70',
    title: 'text-cyan-950',
    body: 'text-cyan-950/80',
  },
] as const;

type MarketingHelpsStickyNotesProps = {
  items: readonly HelpsBullet[];
};

export function MarketingHelpsStickyNotes({ items }: MarketingHelpsStickyNotesProps) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-8">
      {items.map((item, i) => {
        const theme = STICKY_THEMES[i % STICKY_THEMES.length];
        return (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: theme.rotate }}
            viewport={{ once: true, margin: '-32px' }}
            transition={{ delay: i * 0.08, duration: 0.45 }}
            className="marketing-sticky-note relative mx-auto w-full max-w-[280px] sm:max-w-none"
            style={{
              background: theme.background,
              boxShadow: theme.shadow,
              transform: `rotate(${theme.rotate})`,
            }}
          >
            <span
              className="absolute left-1/2 top-0 h-3 w-14 -translate-x-1/2 -translate-y-1/2 rounded-sm opacity-90"
              style={{ background: theme.tape }}
              aria-hidden
            />
            <div className="px-5 pb-5 pt-6 text-left">
              {item.angle ? (
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${theme.label}`}>
                  {item.angle}
                </p>
              ) : null}
              <p className={`mt-1.5 text-base font-bold leading-snug sm:text-[17px] ${theme.title}`}>
                {item.title}
              </p>
              <p className={`mt-2.5 text-sm leading-relaxed ${theme.body}`}>{item.body}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
