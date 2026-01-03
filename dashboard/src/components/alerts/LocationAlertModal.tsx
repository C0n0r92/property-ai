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
}

export function LocationAlertModal() {
  const { modalState, hideAlertModal, dismissAlertModal, setModalStep, persistModalForAuth } = useAlertModal();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Debug logging
  console.log('🎯 LocationAlertModal render - isOpen:', modalState.isOpen, 'user:', !!user, 'location:', modalState.location?.name);
  const [locationStats, setLocationStats] = useState<LocationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

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

    if (!user) {
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-900">Property Alerts</span>
                </div>
                <button
                  onClick={handleCloseDismissal}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {modalState.step === 'initial' && (
                  <InitialStep
                    alertType={modalState.alertType}
                    locationName={modalState.location?.name}
                    blogTitle={modalState.blog?.title}
                    locationStats={locationStats}
                    statsLoading={statsLoading}
                    onGetAlerts={handleGetAlertsClick}
                    onDismiss={dismissAlertModal}
                    isSignedOut={!user}
                  />
                )}

                {(modalState.step === 'property-types' || modalState.step === 'configure-alerts') && modalState.location && (
                  <AlertConfigForm
                    location={modalState.location}
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
          // After login, proceed to property types configuration
          if (!user) {
            setModalStep('property-types');
          }
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
  onGetAlerts,
  onDismiss,
  isSignedOut
}: {
  alertType: 'location' | 'blog';
  locationName?: string;
  blogTitle?: string;
  locationStats?: LocationStats | null;
  statsLoading?: boolean;
  onGetAlerts: () => void;
  onDismiss: () => void;
  isSignedOut?: boolean;
}) {
  const isBlogAlert = alertType === 'blog';

  return (
    <div className="text-center space-y-5">
      {/* Icon */}
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
        {isBlogAlert ? (
          <Bell className="w-8 h-8 text-white" />
        ) : (
          <MapPin className="w-8 h-8 text-white" />
        )}
      </div>

      {/* Title with Urgency */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isBlogAlert
            ? `Never miss critical market insights`
            : `Don't miss the next price drop in ${locationName}`}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {isBlogAlert
            ? "Get exclusive research and analysis that could save you thousands on your next property investment."
            : isSignedOut
              ? "Create a free account to get instant notifications about new listings and price changes in your area."
              : "Properties in Dublin sell fast. Be the first to know about new listings, price changes, and market moves."
          }
        </p>
      </div>

      {/* Social Proof */}
      <div className="bg-slate-50 rounded-lg px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-slate-700">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
            <div className="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white"></div>
            <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white"></div>
          </div>
          <span className="text-sm font-medium">
            {isBlogAlert 
              ? "Join 500+ property investors" 
              : "500+ property hunters tracking Dublin"}
          </span>
        </div>
      </div>

      {/* Dynamic Area Stats (for location alerts only) */}
      {!isBlogAlert && (
        <div className="bg-blue-50 rounded-lg px-4 py-3">
          <div className="text-center">
            <div className="text-sm text-blue-800 font-medium mb-1">
              {locationName} Market Snapshot
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-blue-900 font-semibold">
                    {locationStats?.avgPrice || '€450K'}
                  </div>
                  <div className="text-blue-700">Avg Price</div>
                </div>
                <div>
                  <div className="text-blue-900 font-semibold">
                    {locationStats?.newListings || 0}
                  </div>
                  <div className="text-blue-700">New This Week</div>
                </div>
                <div>
                  <div className="text-blue-900 font-semibold">
                    {locationStats?.priceChange !== undefined 
                      ? `${locationStats.priceChange >= 0 ? '+' : ''}${locationStats.priceChange}%`
                      : '+0%'}
                  </div>
                  <div className="text-blue-700">YoY Change</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="space-y-2.5 text-left">
        {isBlogAlert ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Early access to market research</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Investment opportunity alerts</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Data-driven pricing insights</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Instant alerts for new listings</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Price drop notifications</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Sold price intelligence</span>
            </div>
          </>
        )}
      </div>

      {/* Pricing for blog alerts */}
      {isBlogAlert && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <span className="text-sm font-medium">One-time payment: €3</span>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="space-y-3 pt-1">
        <button
          onClick={onGetAlerts}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {isBlogAlert
            ? 'Get Premium Alerts (€3)'
            : isSignedOut
              ? 'Sign Up for Free Alerts'
              : 'Set Up Free Alert'
          }
          <ChevronRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-slate-400">
          {isBlogAlert
            ? "One-time payment, lifetime access"
            : isSignedOut
              ? "Create free account • Instant alerts"
              : "Free account • 1 location alert included"}
        </p>

        <button
          onClick={onDismiss}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
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
