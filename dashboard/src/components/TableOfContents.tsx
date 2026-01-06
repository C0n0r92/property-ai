'use client';

import { useEffect, useState } from 'react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extract headings from content
    const headings: TOCItem[] = [];
    const lines = content.split('\n');

    lines.forEach((line) => {
      if (line.startsWith('# ')) {
        const text = line.substring(2).trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ id, text, level: 1 });
      } else if (line.startsWith('## ')) {
        const text = line.substring(3).trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ id, text, level: 2 });
      } else if (line.startsWith('### ')) {
        const text = line.substring(4).trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ id, text, level: 3 });
      }
    });

    setTocItems(headings);

    // Set up intersection observer for active section tracking
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    // Observe headings
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [content]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (tocItems.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sticky top-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Table of Contents
      </h3>
      <nav>
        <ul className="space-y-2">
          {tocItems.map((item) => (
            <li key={item.id} style={{ paddingLeft: `${(item.level - 1) * 16}px` }}>
              <button
                onClick={() => scrollToHeading(item.id)}
                className={`text-left text-sm hover:text-blue-600 transition-colors block w-full ${
                  activeId === item.id
                    ? 'text-blue-600 font-medium'
                    : 'text-slate-700'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-3 ${
                  activeId === item.id ? 'bg-blue-600' : 'bg-slate-400'
                }`} />
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}







