export function ArticleCardSkeleton() {
  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 animate-pulse">
      {/* Category Badge Skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
        <div className="h-4 w-16 bg-slate-200 rounded"></div>
      </div>

      {/* Title Skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-6 bg-slate-200 rounded w-full"></div>
        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      </div>

      {/* Excerpt Skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
      </div>

      {/* Tags Skeleton */}
      <div className="flex gap-1.5 mb-4">
        <div className="h-5 w-16 bg-slate-200 rounded-lg"></div>
        <div className="h-5 w-20 bg-slate-200 rounded-lg"></div>
        <div className="h-5 w-14 bg-slate-200 rounded-lg"></div>
      </div>

      {/* Footer Skeleton */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="h-4 w-20 bg-slate-200 rounded"></div>
        <div className="h-4 w-24 bg-slate-200 rounded"></div>
      </div>
    </article>
  );
}







