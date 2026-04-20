/**
 * Funky 테마 전용 장식 SVG 컴포넌트들.
 * 출처: Claude Design 핸드오프 (Login/Onboarding/Dashboard Funky).
 * Default 테마에서는 CSS로 display:none 처리된다.
 */

interface BaseProps {
  size?: number;
  className?: string;
}

export function FlowerSVG({ size = 100, petal = '#FFD1E3', core = '#FFE36E', className }: BaseProps & { petal?: string; core?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse
          key={i}
          cx="50"
          cy="22"
          rx="14"
          ry="22"
          fill={petal}
          stroke="#1A0B2E"
          strokeWidth="2.5"
          transform={`rotate(${i * 60} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="11" fill={core} stroke="#1A0B2E" strokeWidth="2.5" />
    </svg>
  );
}

export function HeartSVG({ size = 70, color = '#FF3D9A', className }: BaseProps & { color?: string }) {
  return (
    <svg viewBox="0 0 100 90" width={size} height={size} className={className}>
      <path
        d="M50 85 C 15 60 5 35 20 18 C 32 4 50 10 50 30 C 50 10 68 4 80 18 C 95 35 85 60 50 85 Z"
        fill={color}
        stroke="#1A0B2E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SquiggleSVG({ w = 240, h = 40, color = '#7A3AE0', className }: { w?: number; h?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 240 40" width={w} height={h} className={className}>
      <path
        d="M 5 20 Q 25 0 45 20 T 85 20 T 125 20 T 165 20 T 205 20 T 235 20"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BlobSVG({ size = 200, color = '#D5F24A', className }: BaseProps & { color?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className}>
      <path
        d="M 50 30 Q 90 -10 140 20 Q 200 50 180 110 Q 170 170 110 180 Q 50 195 20 140 Q -10 80 50 30 Z"
        fill={color}
        stroke="#1A0B2E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleSVG({ size = 30, color = '#FFE36E', className }: BaseProps & { color?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
      <path
        d="M20 2 L22 18 L38 20 L22 22 L20 38 L18 22 L2 20 L18 18 Z"
        fill={color}
        stroke="#1A0B2E"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarburstSVG({ size = 120, color = '#FF3D9A', spikes = 16, className }: BaseProps & { color?: string; spikes?: number }) {
  const cx = 50, cy = 50, rOuter = 48, rInner = 22;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`);
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <polygon points={pts.join(' ')} fill={color} stroke="#1A0B2E" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
