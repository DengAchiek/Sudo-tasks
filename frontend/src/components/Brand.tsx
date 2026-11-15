export function BrandMark({ light = false }: { light?: boolean }) {
  return <span className={`brand-mark ${light ? "brand-mark-light" : ""}`} aria-hidden="true"><svg viewBox="0 0 36 36" fill="none"><path d="M18 3.5v29M3.5 18h29" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/><path d="M18 10v4m0 8v4M10 18h4m8 0h4" stroke="var(--mark-cut,#f8fafc)" strokeWidth="2" strokeLinecap="round"/></svg></span>;
}
