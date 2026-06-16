import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tilt?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', style, tilt = false, onClick }: GlassCardProps) {
  return (
    <div
      className={`glass rounded-3xl ${tilt ? 'card-tilt cursor-pointer' : ''} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
