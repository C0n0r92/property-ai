import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import type { Property, Listing, RentalListing } from '@/types/property';

interface FloatingCompareButtonProps {
  comparedProperties: (Property | Listing | RentalListing)[];
  selectedProperty: Property | null;
  selectedListing: Listing | null;
  selectedRental: RentalListing | null;
  isMobile: boolean;
}

export const FloatingCompareButton = ({
  comparedProperties,
  selectedProperty,
  selectedListing,
  selectedRental,
  isMobile,
}: FloatingCompareButtonProps) => {
  const router = useRouter();

  return (
    <div className={`fixed top-1/2 right-4 z-40 transform -translate-y-1/2 ${(selectedProperty || selectedListing || selectedRental) && isMobile ? 'hidden' : ''}`}>
      <div
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-colors cursor-pointer"
        onClick={() => {
          const count = comparedProperties.length;
          if (count > 1) {
            router.push('/tools/compare');
          } else if (count === 1) {
            alert('Add another property to compare. You need at least 2 properties.');
          } else {
            alert('Add properties to compare by clicking on them and using the "Compare Properties" button.');
          }
        }}
        title={comparedProperties.length > 1 ? `Compare ${comparedProperties.length} properties` : 'Add properties to compare'}
      >
        <BarChart3 className="w-6 h-6" />
        {comparedProperties.length > 0 && typeof window !== 'undefined' && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {comparedProperties.length}
          </div>
        )}
      </div>
    </div>
  );
};
