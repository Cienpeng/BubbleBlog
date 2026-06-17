// SVG icon components — no emoji, consistent 24x24 viewBox

interface IconProps {
  className?: string;
  size?: number;
}

function icon(path: JSX.Element, size = 24) {
  return ({ className, size: s }: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      width={s ?? size}
      height={s ?? size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
}

// ---- Navigation ----
export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </>,
);

export const IconHome = icon(
  <>
    <path d="M3 9.5L12 3l9 6.5" />
    <path d="M19 10v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9" />
    <polyline points="9,21 9,13 15,13 15,21" />
  </>,
);

export const IconArrowLeft = icon(
  <path d="M19 12H5M12 5l-7 7 7 7" />,
);

export const IconClose = icon(
  <>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </>,
);

export const IconMenu = icon(
  <>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </>,
);

// ---- Content ----
export const IconArticles = icon(
  <>
    <path d="M14 2H6a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
    <polyline points="14,2 14,8 20,8" />
    <path d="M16 13H8M16 17H8M10 9H8" />
  </>,
);

export const IconPlus = icon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const IconEdit = icon(
  <>
    <path d="M11 4H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>,
);

export const IconCopy = icon(
  <>
    <rect x="9" y="9" width="13" height="13" rx="1.5" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </>,
);

export const IconCheck = icon(
  <polyline points="20,6 9,17 4,12" />,
);

// ---- Actions ----
export const IconUpload = icon(
  <>
    <path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4" />
    <polyline points="17,8 12,3 7,8" />
    <path d="M12 3v12" />
  </>,
);

export const IconSave = icon(
  <>
    <path d="M19 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11l5 5v11a1 1 0 0 1-1 1z" />
    <polyline points="17,3 17,11 7,11 7,3" />
    <path d="M7 21v-7h10v7" />
  </>,
);

export const IconTrash = icon(
  <>
    <path d="M3 6h18" />
    <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6" />
    <path d="M10 11v5M14 11v5" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </>,
);

export const IconRocket = icon(
  <>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4l-2 5 2 2 5-2v-5z" />
    <circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" />
  </>,
);

// ---- Status ----
export const IconCalendar = icon(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </>,
);

export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12,7 12,12 16,14" />
  </>,
);

export const IconTag = icon(
  <>
    <path d="M12 2H2v10l10 10 10-10L12 2z" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
  </>,
);

export const IconHeart = icon(
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  22,
);

// ---- Dashboard ----
export const IconAppearance = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>,
);

export const IconStats = icon(
  <>
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </>,
);

export const IconUser = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </>,
);

export const IconBook = icon(
  <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M12 6v10" />
    <path d="M9 11h6" />
  </>,
);

// ---- Brand ----
export const IconBubble = icon(
  <>
    <circle cx="12" cy="12" r="9" opacity="0.15" fill="currentColor" stroke="none" />
    <circle cx="9" cy="8" r="2.5" opacity="0.6" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14" r="1.8" opacity="0.4" fill="currentColor" stroke="none" />
    <circle cx="6" cy="15" r="1.2" opacity="0.3" fill="currentColor" stroke="none" />
    <circle cx="11" cy="16" r="0.8" opacity="0.2" fill="currentColor" stroke="none" />
  </>,
);

// ---- Theme ----
export const IconSun = icon(
  <>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </>,
);

export const IconMoon = icon(
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
);

// ---- List / All Articles ----
export const IconList = icon(
  <>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </>,
);
