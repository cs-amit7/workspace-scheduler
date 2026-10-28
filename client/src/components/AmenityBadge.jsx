/**
 * AmenityBadge component.
 * Small bordered chip with monospace typography, not filled.
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

  return (
    <span
      className={`inline-flex items-center rounded border border-line bg-transparent px-2 py-0.5 text-xs font-mono text-muted ${className}`}
    >
      {text}
    </span>
  );
}
