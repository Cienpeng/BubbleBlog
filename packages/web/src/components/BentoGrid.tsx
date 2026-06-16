import type { ReactNode } from 'react';

export default function BentoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-auto gap-4 lg:gap-5">
      {children}
    </div>
  );
}
