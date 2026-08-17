import { Link } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center px-4 text-center">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-6 w-6 text-forge-amber" aria-hidden="true" />
        <span className="text-lg font-bold text-forge-text-primary">Forge</span>
      </div>

      <h1 className="text-6xl md:text-7xl font-bold text-forge-text-primary tracking-tight">
        404
      </h1>
      <p className="mt-4 text-lg font-medium text-forge-text-primary">
        This page doesn&apos;t exist.
      </p>
      <p className="mt-2 text-sm text-forge-text-secondary max-w-sm leading-relaxed">
        The page you&apos;re looking for may have moved, or the link is out of date.
      </p>

      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-forge-amber text-forge-text-inverse text-sm font-medium hover:bg-forge-amber-dim transition-colors whitespace-nowrap cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Forge
      </Link>
    </div>
  );
}