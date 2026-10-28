import { useParams } from 'react-router-dom';

/**
 * ResourceDetail placeholder page.
 */
export default function ResourceDetail() {
  const { id } = useParams();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold font-sans text-ink">Resource Detail</h1>
      {id && <p className="mt-2 text-sm text-muted font-mono">ID: {id}</p>}
    </div>
  );
}
