// Skeleton loader component for planning applications
export const PlanningSkeletonLoader = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700 animate-pulse">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-600 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-600 rounded w-1/2"></div>
          </div>
          <div className="h-3 bg-gray-600 rounded w-16"></div>
        </div>
        <div className="h-3 bg-gray-600 rounded w-full mb-1"></div>
        <div className="h-3 bg-gray-600 rounded w-2/3"></div>
      </div>
    ))}
  </div>
);
