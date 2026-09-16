/**
 * The mock's HomeHero, minus the "Ask PCx AI" box (confirmed non-functional
 * there — clicking submit just reopens the command palette — not worth
 * building). The quote is real: the same AI-curated plan summary already
 * shown below in "Next best actions", not a fabricated "annual goal" (we
 * have no Goals entity yet) — same placeholder stock photo the mock itself
 * uses, flagged there as swappable for the office's own art later.
 */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=60&auto=format&fit=crop';

export function TodayFocus({ quote }: { quote: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/60 to-gray-900/25"
        aria-hidden
      />
      <div className="relative p-5 sm:p-7">
        <div className="max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">
            Today&rsquo;s focus
          </p>
          <p className="mt-3 text-2xl leading-snug font-bold tracking-tight text-white sm:text-[27px]">
            &ldquo;{quote}&rdquo;
          </p>
          <p className="mt-3 text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
            Learning plan
          </p>
        </div>
      </div>
    </section>
  );
}
