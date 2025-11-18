import React from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: {
    href: string;
    label: string;
  };
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, backLink, actions }: PageHeaderProps) {
  return (
    <header className="glass border-b border-gray-800 sticky top-0 z-50 bg-dark-900/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gradient">{title}</h1>
            {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            {backLink && (
              <Link
                href={backLink.href}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-gray-600 rounded-lg transition-all"
              >
                ← {backLink.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
