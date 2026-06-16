import type { ReactNode } from 'react';

type HeadingLevel = 'h1' | 'h2' | 'h3';

interface OrganicHeadingProps {
  level: HeadingLevel;
  children: ReactNode;
}

export default function OrganicHeading({ level, children }: OrganicHeadingProps) {
  const Tag = level;
  const sizeClass = level === 'h1' ? 'h1' : level === 'h2' ? 'h2' : 'h3';

  return (
    <div className="text-center my-4">
      <Tag className={`heading-organic ${sizeClass}`}>
        {children}
      </Tag>
    </div>
  );
}
