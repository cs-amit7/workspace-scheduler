export default function Skeleton({ className = 'h-4 w-full', ...props }) {
  return (
    <div
      data-testid="skeleton"
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-panel-2 ${className}`}
      {...props}
    />
  );
}
