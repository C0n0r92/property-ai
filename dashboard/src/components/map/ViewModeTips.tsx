import type { DataSourceSelection } from '@/lib/map-constants';

interface ViewModeTipsProps {
  viewMode: 'clusters' | 'price' | 'difference';
  dataSources: DataSourceSelection;
  activeSourceCount: number;
}

export const ViewModeTips = ({ viewMode, dataSources, activeSourceCount }: ViewModeTipsProps) => {
  return (
    <div className="absolute bottom-4 right-4 hidden md:block">
      <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg px-4 py-3 border border-gray-700 text-sm text-gray-400 max-w-xs">
        {viewMode === 'clusters' && (dataSources.sold || dataSources.forSale || dataSources.rentals) && (
          <p>💡 Click clusters to zoom in. Click {dataSources.sold ? 'properties' : dataSources.rentals ? 'rentals' : 'listings'} for details.</p>
        )}
        {viewMode === 'clusters' && activeSourceCount > 1 && (
          <p>💡 <span className="text-white">White</span> = Sold, <span className="text-rose-400">Pink</span> = For Sale, <span className="text-purple-400">Purple</span> = Rental. Click for details.</p>
        )}
        {viewMode === 'price' && (dataSources.sold || dataSources.forSale) && (
          <p>💡 Colors show {dataSources.sold ? 'sold' : 'asking'} price. Green = under €400k, Red = over €1M.</p>
        )}
        {viewMode === 'price' && dataSources.rentals && (
          <p>💡 Colors show monthly rent. Green = under €1,500, Red = over €3,000.</p>
        )}
        {viewMode === 'difference' && dataSources.sold && (
          <p>💡 Green = deals (sold under asking), Red = bidding wars (sold over asking).</p>
        )}
      </div>
    </div>
  );
};
