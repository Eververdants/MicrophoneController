// Shared stroke icon set. Icons inherit `currentColor` so callers style them
// with the CSS variable palette instead of hardcoded colors.

interface IconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

function svgProps(size: number, className: string | undefined, strokeWidth: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  } as const
}

export function SunIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a7 7 0 0 0 9.7 9.7Z" />
    </svg>
  )
}

export function MinusIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <path d="M5 12h14" />
    </svg>
  )
}

export function MaximizeIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <rect x="5.5" y="5.5" width="13" height="13" rx="2" />
    </svg>
  )
}

export function RestoreIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <rect x="4.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M8.5 8.5V6.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2" />
    </svg>
  )
}

export function CloseIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function CheckIcon({ size = 14, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Two-band equalizer-style glyph for the settings entry point.
export function SlidersIcon({ size = 14, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg {...svgProps(size, className, strokeWidth)}>
      <path d="M4 8h8.5M17.5 8H20M4 16h2.5M11.5 16H20" />
      <circle cx="15" cy="8" r="2.2" />
      <circle cx="9" cy="16" r="2.2" />
    </svg>
  )
}
