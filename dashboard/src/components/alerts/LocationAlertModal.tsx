'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MapPin, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { AlertConfigForm } from './AlertConfigForm';
import { LoginModal } from '@/components/auth/LoginModal';
import { analytics } from '@/lib/analytics';

export function LocationAlertModal() {
  const { modalState, hideAlertModal, dismissAlertModal, setModalStep } = useAlertModal();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  console.log('LocationAlertModal render - modalState:', modalState);
  console.log('modalState.isOpen:', modalState.isOpen);

  // Handle ESC key and backdrop click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        analytics.alertModalDismissed(
          modalState.location?.name || 'unknown',
          modalState.step,
          'unknown' // source not available in context
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
      analytics.alertModalDismissed(
        modalState.location?.name || 'unknown',
        modalState.step,
        'unknown' // source not available in context
      );
      dismissAlertModal();
    }
  };

  // Handle initial CTA click
  const handleGetAlertsClick = () => {
    analytics.alertStepTransition(modalState.step, 'property-types', modalState.location?.name || 'unknown');

    if (!user) {
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
      'unknown' // source not available in context
    );
    dismissAlertModal();
  };

  // Don't render if modal is not open or no location
  if (!modalState.isOpen || !modalState.location) {
    return null;
  }

  const locationName = modalState.location.name;

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
                    locationName={locationName}
                    onGetAlerts={handleGetAlertsClick}
                    onDismiss={dismissAlertModal}
                  />
                )}

                {(modalState.step === 'property-types' || modalState.step === 'configure-alerts' || modalState.step === 'payment') && modalState.location && (
                  <AlertConfigForm
                    location={modalState.location}
                    onSuccess={handleAlertCreated}
                    onCancel={() => setModalStep('initial')}
                  />
                )}

                {modalState.step === 'success' && (
                  <SuccessStep
                    locationName={locationName}
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
          // After login, proceed to configuration
          if (!user) {
            // If login was successful, user should now be authenticated
            // This will trigger the modal to go to configuration step
            setModalStep('property-types');
          }
        }}
      />
    </>
  );
}

// Initial step component
function InitialStep({
  locationName,
  onGetAlerts,
  onDismiss
}: {
  locationName: string;
  onGetAlerts: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <MapPin className="w-8 h-8 text-blue-600" />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Get alerts for {locationName}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Be the first to know about new listings, price drops, and sales in your area.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 text-left">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-sm text-slate-700">New property listings</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-sm text-slate-700">Price drops and changes</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="text-sm text-slate-700">Recent sales data</span>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button
          onClick={onGetAlerts}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Set up alerts
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onDismiss}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Not interested
        </button>
      </div>
    </div>
  );
}

// Success step component
function SuccessStep({
  locationName,
  onClose
}: {
  locationName: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Alert created successfully!
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          You'll receive email notifications when new properties match your criteria in {locationName}.
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4 text-left">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">What happens next?</p>
            <ul className="text-blue-700 space-y-1">
              <li>• Your alert is active for 12 months</li>
              <li>• We'll email you when new properties match</li>
              <li>• Manage your alerts anytime at /alerts</li>
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
