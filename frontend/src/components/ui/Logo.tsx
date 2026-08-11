import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  name?: string;
}

export default function Logo({ className, size = 'md', withText = true, name = 'IMMERSIVE' }: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-sm', gap: 'gap-1.5' },
    md: { icon: 32, text: 'text-lg', gap: 'gap-2' },
    lg: { icon: 40, text: 'text-xl', gap: 'gap-2.5' },
  };

  const s = sizes[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {/* Logo Mark — Stylized "I" with 3D cube depth */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="logo-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#6366f1" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Back face of cube — darker */}
        <path
          d="M20 6L32 12V24L20 30L8 24V12L20 6Z"
          fill="url(#logo-gradient)"
          opacity="0.4"
        />

        {/* Left face of cube — medium */}
        <path
          d="M8 12L20 6V18L8 24V12Z"
          fill="url(#logo-gradient)"
          opacity="0.7"
        />

        {/* Right face of cube — lighter */}
        <path
          d="M32 12L20 6V18L32 24V12Z"
          fill="url(#logo-highlight)"
          opacity="0.6"
        />

        {/* Top face — brightest */}
        <path
          d="M20 6L32 12L20 18L8 12L20 6Z"
          fill="url(#logo-highlight)"
          opacity="0.9"
        />

        {/* Center "I" letterform */}
        <rect x="17" y="11" width="6" height="16" rx="1.5" fill="white" filter="url(#logo-shadow)" />

        {/* Dot above the I */}
        <circle cx="20" cy="8.5" r="2" fill="white" filter="url(#logo-shadow)" />
      </svg>

      {/* Brand Text */}
      {withText && (
        <span className={cn('font-bold tracking-tight text-gray-900 dark:text-white', s.text)}>
          {name}
        </span>
      )}
    </div>
  );
}
