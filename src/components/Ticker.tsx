import { getT } from "@/i18n/server";

/** Faixa em movimento no topo: tipografia cinética barata, só CSS. */
export async function Ticker() {
  const { t } = await getT();
  const phrase = t("brand.tagline");
  const items = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div className="ink-block relative overflow-hidden border-b border-ink" aria-hidden>
      <div className="flex w-max animate-ticker whitespace-nowrap py-1.5">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {items.map((i) => (
              <span key={i} className="kicker mx-5 flex items-center gap-5 text-paper/90">
                {phrase}
                <span className="inline-block size-1.5 rounded-full bg-signal" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
