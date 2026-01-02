'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MapPin, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { AlertConfigForm } from './AlertConfigForm';
import { BlogAlertPaymentForm } from './BlogAlertPaymentForm';
import { LoginModal } from '@/components/auth/LoginModal';
import { analytics } from '@/lib/analytics';

export function LocationAlertModal() {
  const { modalState, hideAlertModal, dismissAlertModal, setModalStep } = useAlertModal();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  console.log('🎯 LocationAlertModal render - modalState:', modalState);
  console.log('🎯 modalState.isOpen:', modalState.isOpen);
  console.log('🎯 modalState.location:', modalState.location);

  // Handle ESC key and backdrop click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const contextName = modalState.alertType === 'blog' ? modalState.blog?.title : modalState.location?.name;
        analytics.alertModalDismissed(
          contextName || 'unknown',
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
    const nextStep = modalState.alertType === 'blog' ? 'payment' : 'property-types';
    analytics.alertStepTransition(modalState.step, nextStep, modalState.location?.name || modalState.blog?.title || 'unknown');

    if (!user) {
      setShowLoginModal(true);
    } else {
      setModalStep(nextStep);
    }
  };

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setModalStep(modalState.alertType === 'blog' ? 'payment' : 'property-types');
  };

  // Handle successful alert creation
  const handleAlertCreated = () => {
    analytics.alertStepTransition(modalState.step, 'success', modalState.location?.name || 'unknown');
    setModalStep('success');
  };

  // Handle close button dismissal
  const handleCloseDismissal = () => {
    const contextName = modalState.alertType === 'blog' ? modalState.blog?.title : modalState.location?.name;
    analytics.alertModalDismissed(
      contextName || 'unknown',
      modalState.step,
      'unknown'
    );
    dismissAlertModal();
  };

  // Don't render if modal is not open or no context (location or blog)
  console.log('LocationAlertModal: modalState.isOpen:', modalState.isOpen, 'modalState.location:', !!modalState.location, 'modalState.blog:', !!modalState.blog);
  const hasContext = (modalState.alertType === 'location' && modalState.location) || (modalState.alertType === 'blog' && modalState.blog);
  if (!modalState.isOpen || !hasContext) {
    console.log('LocationAlertModal: Not rendering modal');
    return null;
  }

  console.log('LocationAlertModal: Rendering modal for:', modalState.alertType === 'blog' ? modalState.blog?.title : modalState.location?.name);

  const displayName = modalState.alertType === 'blog' ? modalState.blog?.title : modalState.location?.name;

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
                  <span className="font-medium text-slate-900">
                    {modalState.alertType === 'blog' ? 'Blog Alerts' : 'Property Alerts'}
                  </span>
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
                    onGetAlerts={handleGetAlertsClick}
                    onDismiss={dismissAlertModal}
                  />
                )}

                {(modalState.step === 'property-types' || modalState.step === 'configure-alerts') && modalState.location && (
                  <AlertConfigForm
                    location={modalState.location}
                    onSuccess={handleAlertCreated}
                    onCancel={() => setModalStep('initial')}
                  />
                )}

                {modalState.step === 'payment' && modalState.alertType === 'blog' && modalState.blog && (
                  <BlogAlertPaymentForm
                    blog={modalState.blog}
                    onSuccess={handleAlertCreated}
                    onCancel={() => setModalStep('initial')}
                  />
                )}

                {modalState.step === 'success' && (
                  <SuccessStep
                    alertType={modalState.alertType}
                    locationName={modalState.location?.name}
                    blogTitle={modalState.blog?.title}
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
          // After login, proceed to appropriate step
          if (!user) {
            // If login was successful, user should now be authenticated
            // This will trigger the modal to go to appropriate step
            setModalStep(modalState.alertType === 'blog' ? 'payment' : 'property-types');
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
  onGetAlerts,
  onDismiss
}: {
  alertType: 'location' | 'blog';
  locationName?: string;
  blogTitle?: string;
  onGetAlerts: () => void;
  onDismiss: () => void;
}) {
  const isBlogAlert = alertType === 'blog';

  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        {isBlogAlert ? (
          <Bell className="w-8 h-8 text-blue-600" />
        ) : (
          <MapPin className="w-8 h-8 text-blue-600" />
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {isBlogAlert ? `Get blog alerts` : `Get alerts for ${locationName}`}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {isBlogAlert
            ? "Get notified when we publish new research articles and market insights."
            : "Be the first to know about new listings, price drops, and sales in your area."
          }
        </p>
      </div>

      {/* Features */}
      <div className="space-y-3 text-left">
        {isBlogAlert ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">New research articles</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Market insights & analysis</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-sm text-slate-700">Property market trends</span>
            </div>
          </>
        ) : (
          <>
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
      <div className="space-y-3">
        <button
          onClick={onGetAlerts}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isBlogAlert ? 'Set up alerts (€3)' : 'Set up alerts'}
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
          Alert created successfully!
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {isBlogAlert
            ? "You'll receive email notifications when we publish new research articles and market insights."
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
