import AmenityIcon from './amenityIcons.jsx';

/**
 * AmenityBadge component.
 * Small bordered chip with monospace typography, not filled.
 * Shows an amenity icon followed by the amenity text.
 *
 * @param {object} props
 * @param {string} [props.name]
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 */
export default function AmenityBadge({ name, children, className = '' }) {
  const text = name || children;

  if (!text) {
    return null;
  }

  const iconName = typeof text === 'string' ? text : name || '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border border-line bg-transparent px-2 py-0.5 text-xs font-mono text-muted ${className}`}
    >
      <AmenityIcon name={iconName} className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
}
