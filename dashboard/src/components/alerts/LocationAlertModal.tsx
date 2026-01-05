'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MapPin, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { AlertConfigForm } from './AlertConfigForm';
import { LoginModal } from '@/components/auth/LoginModal';
import { analytics } from '@/lib/analytics';

interface LocationStats {
  avgPrice: string;
  newListings: number;
  priceChange: number;
  eircode: string | null;
}

export function LocationAlertModal() {
  const { modalState, hideAlertModal, dismissAlertModal, setModalStep, persistModalForAuth } = useAlertModal();
  const { user, authUser } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Debug logging
  console.log('🎯 LocationAlertModal render - isOpen:', modalState.isOpen, 'user:', !!user, 'authUser:', !!authUser, 'location:', modalState.location?.name);
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(3); // Default to 3km

  // Watch for login completion and advance modal
  useEffect(() => {
    if (showLoginModal && authUser && modalState.step === 'initial') {
      // User just logged in while login modal was open, advance to property types
      setShowLoginModal(false);
      setModalStep('property-types');
    }
  }, [authUser, showLoginModal, modalState.step, setModalStep]);

  // Fetch real location stats when modal opens
  useEffect(() => {
    if (modalState.isOpen && modalState.location && modalState.alertType === 'location') {
      setStatsLoading(true);
      const { lat, lng } = modalState.location.coordinates;
      
      fetch(`/api/stats/location?lat=${lat}&lng=${lng}&radius=3`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setLocationStats({
              avgPrice: data.avgPrice || '€450K',
              newListings: data.newListings || 0,
              priceChange: data.priceChange || 0,
              eircode: data.eircode || null,
            });
          }
        })
        .catch(err => {
          console.error('Failed to fetch location stats:', err);
        })
        .finally(() => {
          setStatsLoading(false);
        });
    }
  }, [modalState.isOpen, modalState.location, modalState.alertType]);


  // Handle ESC key and backdrop click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        analytics.alertModalDismissed(
          modalState.location?.name || 'unknown',
          modalState.step,
          'unknown'
        );
        dismissAlertModal();
      }
    };

    if (modalState.isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [modalState.isOpen, modalState.location?.name, modalState.step, dismissAlertModal]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const contextName = modalState.alertType === 'blog' ? modalState.blog?.title : modalState.location?.name;
      analytics.alertModalDismissed(
        contextName || 'unknown',
        modalState.step,
        'unknown'
      );
      dismissAlertModal();
    }
  };

  // Handle initial CTA click
  const handleGetAlertsClick = () => {
    analytics.alertStepTransition(modalState.step, 'property-types', modalState.location?.name || 'unknown');

    if (!authUser) {
      // Persist modal state before authentication redirect
      persistModalForAuth();
      setShowLoginModal(true);
    } else {
      setModalStep('property-types');
    }
  };

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setModalStep('property-types');
  };

  // Handle successful alert creation
  const handleAlertCreated = () => {
    analytics.alertStepTransition(modalState.step, 'success', modalState.location?.name || 'unknown');
    setModalStep('success');
  };

  // Handle close button dismissal
  const handleCloseDismissal = () => {
    analytics.alertModalDismissed(
      modalState.location?.name || 'unknown',
      modalState.step,
      'unknown'
    );
    dismissAlertModal();
  };

  // Don't render if modal is not open or not a location alert
  if (!modalState.isOpen || modalState.alertType !== 'location' || !modalState.location) {
    return null;
  }


  const displayName = modalState.location?.name;

  return (
    <>
      <AnimatePresence>
        {modalState.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm"
            onClick={handleBackdropClick}
          >
            <motion.div
              initial={{ y: '20%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '20%', opacity: 0 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
                duration: 0.4
              }}
              className="w-full max-w-md mx-4 sm:mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-900">Property Alerts</span>
                </div>
                <button
                  onClick={handleCloseDismissal}
                  className="w-10 h-10 sm:w-8 sm:h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors touch-manipulation"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                {modalState.step === 'initial' && (
                  <InitialStep
                    alertType={modalState.alertType}
                    locationName={modalState.location?.name}
                    blogTitle={modalState.blog?.title}
                    locationStats={locationStats}
                    statsLoading={statsLoading}
                    selectedRadius={selectedRadius}
                    onRadiusChange={setSelectedRadius}
                    onGetAlerts={handleGetAlertsClick}
                    onDismiss={dismissAlertModal}
                    isSignedOut={!authUser}
                  />
                )}

                {(modalState.step === 'property-types' || modalState.step === 'configure-alerts') && modalState.location && (
                  <AlertConfigForm
                    location={{...modalState.location, defaultAlertConfig: {...modalState.location.defaultAlertConfig, radius_km: selectedRadius}}}
                    onSuccess={handleAlertCreated}
                    onCancel={() => setModalStep('initial')}
                  />
                )}


                {modalState.step === 'success' && (
                  <SuccessStep
                    alertType={modalState.alertType}
                    locationName={modalState.location?.name}
                    blogTitle={undefined}
                    onClose={hideAlertModal}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
        }}
      />
    </>
  );
}

// Initial step component
function InitialStep({
  alertType,
  locationName,
  blogTitle,
  locationStats,
  statsLoading,
  selectedRadius,
  onRadiusChange,
  onGetAlerts,
  onDismiss,
  isSignedOut
}: {
  alertType: 'location' | 'blog';
  locationName?: string;
  blogTitle?: string;
  locationStats?: LocationStats | null;
  statsLoading?: boolean;
  selectedRadius: number;
  onRadiusChange: (radius: number) => void;
  onGetAlerts: () => void;
  onDismiss: () => void;
  isSignedOut?: boolean;
}) {
  const isBlogAlert = alertType === 'blog';

  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
        {isBlogAlert ? (
          <Bell className="w-8 h-8 text-white" />
        ) : (
          <MapPin className="w-8 h-8 text-white" />
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isBlogAlert
            ? `Never miss critical market insights`
            : `Never miss a new property near ${locationName}`}
        </h3>
        <p className="text-slate-600 text-sm mb-3">
          {isBlogAlert
            ? "Get exclusive research and analysis that could save you thousands on your next property investment."
            : "Get instant notifications when new properties become available in your area."
          }
        </p>
        {!isBlogAlert && (
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>For Sale</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>For Rent</span>
            </div>
          </div>
        )}
      </div>

      {/* Distance Selection - for location alerts only */}
      {!isBlogAlert && (
        <div className="bg-green-50 rounded-lg px-6 py-4 border border-green-200">
          <div className="space-y-3">
            <label className="text-sm font-medium text-green-800 block text-center">
              Search distance: {selectedRadius} km
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={selectedRadius}
              onChange={(e) => onRadiusChange(parseInt(e.target.value))}
              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="flex justify-between text-xs text-green-600">
              <span>1km</span>
              <span>10km</span>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="space-y-3">
        <button
          onClick={onGetAlerts}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {isBlogAlert
            ? 'Get Premium Alerts (€3)'
            : isSignedOut
              ? 'Sign Up for Free Alerts'
              : 'Continue'
          }
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onDismiss}
          className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

// Success step component
function SuccessStep({
  alertType,
  locationName,
  blogTitle,
  onClose
}: {
  alertType: 'location' | 'blog';
  locationName?: string;
  blogTitle?: string;
  onClose: () => void;
}) {
  const isBlogAlert = alertType === 'blog';

  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isBlogAlert ? 'Premium Blog Alerts Activated!' : 'Alert created successfully!'}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {isBlogAlert
            ? "🎉 Welcome to our premium research community! You'll be the first to know about critical Dublin property market shifts, exclusive analysis, and money-saving opportunities that could impact your next investment decision."
            : `You'll receive email notifications when new properties match your criteria in ${locationName}.`
          }
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4 text-left">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">What happens next?</p>
            <ul className="text-blue-700 space-y-1">
              {isBlogAlert ? (
                <>
                  <li>• You'll receive notifications for new articles</li>
                  <li>• Get early access to market research</li>
                  <li>• Manage your alerts anytime at /alerts</li>
                </>
              ) : (
                <>
                  <li>• Your alert is active for 12 months</li>
                  <li>• We'll email you when new properties match</li>
                  <li>• Manage your alerts anytime at /alerts</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onClose}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
      >
        Got it!
      </button>
    </div>
  );
}
