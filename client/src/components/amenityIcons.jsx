/**
 * AmenityIcon component.
 * Maps amenity names (case-insensitive, trimmed) to inline SVG icons.
 * Follows the design specifications in docs/DESIGN.md.
 */

export function getAmenityIconKey(name) {
  if (!name || typeof name !== 'string') {
    return 'fallback';
  }

  const clean = name.trim().toLowerCase();

  switch (clean) {
    case 'wifi':
    case 'wi-fi':
    case 'internet':
      return 'wifi';

    case 'monitor':
    case 'display':
    case 'screen':
      return 'monitor';

    case 'dual monitor':
    case 'dual monitors':
    case 'dual screen':
    case 'dual screens':
    case 'dual displays':
      return 'dual-monitor';

    case 'projector':
      return 'projector';

    case 'whiteboard':
    case 'board':
      return 'whiteboard';

    case 'video conferencing':
    case 'video conference':
    case 'videoconferencing':
    case 'video camera':
    case 'webcam':
    case 'camera':
      return 'video';

    case 'coffee machine':
    case 'coffee':
    case 'espresso':
    case 'cafe':
      return 'coffee';

    case 'sound system':
    case 'sound':
    case 'speaker':
    case 'speakers':
    case 'audio':
      return 'speaker';

    case 'microphone':
    case 'mic':
      return 'microphone';

    case 'ergonomic chair':
    case 'chair':
    case 'seating':
      return 'chair';

    case 'standing desk':
    case 'sit-stand desk':
    case 'adjustable desk':
    case 'height-adjustable desk':
      return 'standing-desk';

    case 'power strip':
    case 'plug':
    case 'power':
    case 'power outlet':
    case 'outlets':
    case 'socket':
      return 'plug';

    case 'tv':
    case 'television':
      return 'tv';

    case 'phone':
    case 'telephone':
      return 'phone';

    case 'air conditioning':
    case 'air conditioner':
    case 'ac':
    case 'hvac':
      return 'ac';

    case 'desk':
      return 'desk';

    case 'clock':
      return 'clock';

    case 'calendar':
    case 'calendar-check':
    case 'calendar check':
      return 'calendar';

    default:
      return 'fallback';
  }
}

function renderIconPaths(key) {
  switch (key) {
    case 'wifi':
      return (
        <>
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="19.5" r="0.75" fill="currentColor" />
        </>
      );

    case 'monitor':
      return (
        <>
          <rect x="2" y="3.5" width="20" height="13" rx="2" />
          <path d="M8 20.5h8" />
          <path d="M12 16.5v4" />
        </>
      );

    case 'dual-monitor':
      return (
        <>
          <rect x="1" y="5" width="10" height="9" rx="1" />
          <rect x="13" y="5" width="10" height="9" rx="1" />
          <path d="M6 14v4" />
          <path d="M18 14v4" />
          <path d="M3 18h6" />
          <path d="M15 18h6" />
        </>
      );

    case 'projector':
      return (
        <>
          <rect x="2" y="7" width="20" height="10" rx="2" />
          <circle cx="16" cy="12" r="2.5" />
          <path d="M6 11h4" />
          <path d="M6 13h2" />
          <path d="M6 17v2" />
          <path d="M18 17v2" />
        </>
      );

    case 'whiteboard':
      return (
        <>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M2 16h20" />
          <path d="M6 16l-2 5" />
          <path d="M18 16l2 5" />
          <path d="M9 16h6" />
        </>
      );

    case 'video':
      return (
        <>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </>
      );

    case 'coffee':
      return (
        <>
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </>
      );

    case 'speaker':
      return (
        <>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      );

    case 'microphone':
      return (
        <>
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </>
      );

    case 'chair':
      return (
        <>
          <path d="M8 3h8v6H8z" />
          <path d="M6 13h12a2 2 0 0 1 2 2v1H4v-1a2 2 0 0 1 2-2z" />
          <path d="M12 9v4" />
          <path d="M12 16v5" />
          <path d="M7 21h10" />
        </>
      );

    case 'standing-desk':
      return (
        <>
          <path d="M3 8h18" />
          <path d="M5 8v12" />
          <path d="M19 8v12" />
          <path d="M12 3v8" />
          <path d="m9.5 5.5 2.5-2.5 2.5 2.5" />
          <path d="m9.5 8.5 2.5 2.5 2.5-2.5" />
        </>
      );

    case 'plug':
      return (
        <>
          <rect x="7" y="8" width="10" height="7" rx="2" />
          <path d="M9 3v5" />
          <path d="M15 3v5" />
          <path d="M12 15v6" />
        </>
      );

    case 'tv':
      return (
        <>
          <rect x="2" y="6" width="20" height="13" rx="2" />
          <path d="M8 21l2-2" />
          <path d="M16 21l-2-2" />
          <path d="m7 3 5 3 5-3" />
        </>
      );

    case 'phone':
      return (
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      );

    case 'ac':
      return (
        <>
          <rect x="2" y="5" width="20" height="9" rx="2" />
          <path d="M6 14v2" />
          <path d="M18 14v2" />
          <path d="M6 18c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0" />
          <path d="M6 21c1.5 1 2.5 1 4 0s2.5-1 4 0 2.5 1 4 0" />
        </>
      );

    case 'desk':
      return (
        <>
          <path d="M3 10h18" />
          <path d="M5 10v10" />
          <path d="M19 10v10" />
          <path d="M9 10V6h6v4" />
          <path d="M5 15h14" />
        </>
      );

    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </>
      );

    case 'calendar':
      return (
        <>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 9h18" />
          <path d="m9 15 2 2 4-4" />
        </>
      );

    case 'fallback':
    default:
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <polyline points="9 12 11.5 14.5 15.5 9.5" />
        </>
      );
  }
}

/**
 * AmenityIcon component.
 *
 * @param {object} props
 * @param {string} [props.name]
 * @param {string} [props.className]
 */
export function AmenityIcon({ name, className = 'w-4 h-4', ...props }) {
  const iconKey = getAmenityIconKey(name);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-amenity-key={iconKey}
      {...props}
    >
      {renderIconPaths(iconKey)}
    </svg>
  );
}

export default AmenityIcon;

