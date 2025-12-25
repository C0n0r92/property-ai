import Link from 'next/link';
import { ReactNode } from 'react';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  stats?: Array<{ label: string; value: string | number; sublabel?: string }>;
  features?: Array<{ label: string; icon?: ReactNode }>;
  tabs?: ReactNode;
  children?: ReactNode;
  variant?: 'default' | 'compact' | 'centered';
  background?: 'gradient' | 'solid';
}

export function HeroSection({
  title,
  subtitle,
  description,
  breadcrumbs,
  stats,
  features,
  tabs,
  children,
  variant = 'default',
  background = 'gradient'
}: HeroSectionProps) {
  const bgClasses = background === 'gradient'
    ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900'
    : 'bg-slate-900';

  return (
    <section className={`relative ${bgClasses} text-white overflow-hidden`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-4 left-4 w-32 h-32 bg-white rounded-full mix-blend-multiply filter blur-xl"></div>
        <div className="absolute top-8 right-8 w-24 h-24 bg-blue-300 rounded-full mix-blend-multiply filter blur-lg"></div>
        <div className="absolute bottom-4 left-1/3 w-20 h-20 bg-indigo-300 rounded-full mix-blend-multiply filter blur-md"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 lg:py-12">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-slate-300 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center">
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white font-medium">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <span className="mx-2">/</span>}
              </span>
            ))}
          </nav>
        )}

        {variant === 'centered' ? (
          // Centered layout (for mortgage calculator)
          <div className="text-center">
            {children}

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
              {title}
              {subtitle && <span className="block text-base md:text-lg lg:text-xl font-normal text-blue-200 mt-1">{subtitle}</span>}
            </h1>

            {description && (
              <div className="max-w-xl mx-auto mb-6">
                <p className="text-base md:text-lg text-blue-100 leading-relaxed">
                  {description}
                </p>
              </div>
            )}

            {features && (
              <div className="flex flex-wrap justify-center items-center gap-3 max-w-4xl mx-auto mb-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-400/30">
                    {feature.icon}
                    <span className="text-blue-200 text-sm">{feature.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Default layout (for blog, areas, saved)
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left side - Title and description */}
            <div className="flex-1">
              <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2">
                {title}
                {subtitle && <span className="block text-base lg:text-lg font-normal text-blue-200 mt-1">{subtitle}</span>}
              </h1>

              {description && (
                <p className="text-slate-300 text-sm lg:text-base max-w-2xl leading-relaxed">
                  {description}
                </p>
              )}

              {tabs && (
                <div className="mt-6">
                  {tabs}
                </div>
              )}
            </div>

            {/* Right side - Stats or other content */}
            {(stats || children) && (
              <div className="flex flex-col gap-4">
                {stats && (
                  <div className="flex items-center gap-4 lg:gap-6">
                    {stats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-lg lg:text-xl font-bold text-white">{stat.value}</div>
                        <div className="text-slate-300 text-xs">{stat.label}</div>
                        {stat.sublabel && (
                          <div className="text-slate-400 text-xs mt-1">{stat.sublabel}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
