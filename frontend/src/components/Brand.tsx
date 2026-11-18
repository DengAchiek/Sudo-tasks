export function BrandMark({ light = false }: { light?: boolean }) {
  return <span className={`brand-mark ${light ? "brand-mark-light" : ""}`} aria-hidden="true">
    <svg viewBox="0 0 36 36" fill="none"><path d="M18 3.5 29 7.7v9.5c0 7.2-4.4 12.2-11 15.3-6.6-3.1-11-8.1-11-15.3V7.7L18 3.5Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>

    <path d="M18 10v4m0 5v2m0 5v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    </span>;
}
