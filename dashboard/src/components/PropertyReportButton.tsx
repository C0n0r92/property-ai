'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface PropertyReportButtonProps {
  propertyId: string;
  propertyType: 'sold' | 'listing' | 'rental';
  address: string;
  latitude: number | null;
  longitude: number | null;
  className?: string;
}

export function PropertyReportButton({
  propertyId,
  propertyType,
  address,
  latitude,
  longitude,
  className = '',
}: PropertyReportButtonProps) {
  const { user } = useAuth();
  const [isReported, setIsReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [reportedLat, setReportedLat] = useState('');
  const [reportedLng, setReportedLng] = useState('');

  useEffect(() => {
    if (user) {
      checkReported();
    }
  }, [user, propertyId, propertyType]);

  const checkReported = async () => {
    try {
      const response = await fetch(
        `/api/property-reports?property_id=${encodeURIComponent(propertyId)}&property_type=${propertyType}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsReported(data.reported);
      }
    } catch (error) {
      console.error('Error checking report status:', error);
    }
  };

  const handleReport = async () => {
    if (!user) {
      return;
    }

    if (!latitude || !longitude) {
      alert('Property location data is missing. Cannot report.');
      return;
    }

    setIsReporting(true);

    try {
      const response = await fetch('/api/property-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          property_type: propertyType,
          address,
          current_latitude: latitude,
          current_longitude: longitude,
          reported_latitude: reportedLat ? parseFloat(reportedLat) : null,
          reported_longitude: reportedLng ? parseFloat(reportedLng) : null,
          report_details: reportDetails || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setIsReported(true);
          alert('You have already reported this property.');
        } else {
          alert(data.error || 'Failed to report property');
        }
        return;
      }

      setIsReported(true);
      setShowModal(false);
      setReportDetails('');
      setReportedLat('');
      setReportedLng('');
      alert('Thank you! Your report has been submitted.');
    } catch (error) {
      console.error('Error reporting property:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  if (!user) {
    return null; // Don't show report button for non-logged-in users
  }

  if (isReported) {
    return (
      <button
        disabled
        className={`px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded transition-colors flex items-center gap-1 border border-gray-600 cursor-not-allowed ${className}`}
        title="You have already reported this property"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Reported
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors flex items-center gap-1 border border-gray-700 ${className}`}
        title="Report incorrect location"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Report
      </button>

      {/* Report Modal */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Report Incorrect Location</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong className="text-white">Property:</strong> {address}
                  </p>
                  <p className="text-xs text-gray-400">
                    Current location: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Correct Latitude (optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={reportedLat}
                      onChange={(e) => setReportedLat(e.target.value)}
                      placeholder="e.g., 53.3498"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Correct Longitude (optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={reportedLng}
                      onChange={(e) => setReportedLng(e.target.value)}
                      placeholder="e.g., -6.2603"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Additional Details (optional)
                    </label>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Please provide any additional information about the incorrect location..."
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={isReporting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isReporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

