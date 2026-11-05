export function Wifi({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="19.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function Monitor({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <rect x="2" y="3.5" width="20" height="13" rx="2" />
      <path d="M8 20.5h8" />
      <path d="M12 16.5v4" />
    </svg>
  );
}

export function Projector({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <circle cx="16" cy="12" r="2.5" />
      <path d="M6 11h4" />
      <path d="M6 13h2" />
      <path d="M6 17v2" />
      <path d="M18 17v2" />
    </svg>
  );
}

export function Whiteboard({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M2 16h20" />
      <path d="M6 16l-2 5" />
      <path d="M18 16l2 5" />
      <path d="M9 16h6" />
    </svg>
  );
}

export function Clock({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

export function CalendarCheck({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 9h18" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

export function Plug({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <rect x="7" y="8" width="10" height="7" rx="2" />
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M12 15v6" />
    </svg>
  );
}

export function Desk({ className = 'w-5 h-5', ...props }) {
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
      {...props}
    >
      <path d="M3 10h18" />
      <path d="M5 10v10" />
      <path d="M19 10v10" />
      <path d="M9 10V6h6v4" />
      <path d="M5 15h14" />
    </svg>
  );
}

export function TimeChip({ time = '10:30', children, className = '', ...props }) {
  return (
    <span
      className={`font-mono text-xs tracking-wider font-medium select-none ${className}`}
      {...props}
    >
      {children || time}
    </span>
  );
}

export {
  Wifi as WifiIcon,
  Monitor as MonitorIcon,
  Projector as ProjectorIcon,
  Whiteboard as WhiteboardIcon,
  Clock as ClockIcon,
  CalendarCheck as CalendarCheckIcon,
  Plug as PlugIcon,
  Desk as DeskIcon,
};

export default {
  Wifi,
  Monitor,
  Projector,
  Whiteboard,
  Clock,
  CalendarCheck,
  Plug,
  Desk,
  TimeChip,
};

