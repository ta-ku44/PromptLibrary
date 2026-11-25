import { lazy, Suspense } from 'react';

const CatalogBoard = lazy(() => import('../features/catalog'));

export default function Prompts() {
  return (
    <div className="mx-auto">
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center">Loading...</div>}>
        <CatalogBoard />
      </Suspense>
    </div>
  );
}
