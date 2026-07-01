/**
 * Brand mark for "Minha Vez" — an abstract queue of people inside a rounded
 * gradient badge. Generic enough for any business that manages a digital line.
 */
export default function BrandLogo({ size = 64, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Minha Vez"
    >
      <defs>
        <linearGradient id="mv-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818CF8" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#mv-brand)" />
      <g fill="#FFFFFF">
        <circle cx="21" cy="20" r="5" />
        <rect x="29" y="16.5" width="20" height="7" rx="3.5" />
        <circle cx="21" cy="32" r="5" opacity="0.85" />
        <rect x="29" y="28.5" width="16" height="7" rx="3.5" opacity="0.85" />
        <circle cx="21" cy="44" r="5" opacity="0.6" />
        <rect x="29" y="40.5" width="12" height="7" rx="3.5" opacity="0.6" />
      </g>
    </svg>
  )
}
