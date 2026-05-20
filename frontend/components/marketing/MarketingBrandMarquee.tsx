const BRANDS = [
  'Plants in Garden',
  'Vaibhav Biotec',
  'Yesankar Hospital',
  'Utkarsh Education',
  'Vaibhv Papers',
  'Site Mitra',
] as const;

function BrandRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16"
      aria-hidden={ariaHidden}
    >
      {BRANDS.map((name) => (
        <span
          key={name}
          className="whitespace-nowrap font-marketing-display text-xl font-semibold tracking-[-0.03em] text-[#111111] sm:text-2xl"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function MarketingBrandMarquee() {
  return (
    <section className="relative w-full py-10 sm:py-14" aria-label="Trusted by">
      <div className="overflow-hidden">
        <div className="marketing-brands-track flex w-max items-center" aria-label="Customer brands">
          <BrandRow />
          <BrandRow ariaHidden />
        </div>
      </div>
    </section>
  );
}
