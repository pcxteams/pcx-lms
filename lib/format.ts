export function money(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

/** Same as `money`, but abbreviated once the value reaches four digits — sale
 *  volume routinely lands in the millions, and "$5,163,000" is harder to scan
 *  in a tile than "$5.2M". */
export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1000) return `$${(value / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  return money(value);
}
