'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Check, Loader2, ChevronRight, ChevronLeft, Tag, Filter } from 'lucide-react';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { analytics } from '@/lib/analytics';

export function BlogAlertModal() {
  const { modalState, hideAlertModal } = useAlertModal();
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'config' | 'payment'>('config');

  console.log('🎯 BlogAlertModal render - modalState:', modalState);

  // Alert configuration state
  const [alertAll, setAlertAll] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Available options (extracted from blog data)
  const availableCategories = ['Tool Guide', 'Market Analysis'];
  const availableTags = [
    'Compare Properties', 'Tool Guide', 'Property Analysis', 'Decision Making',
    'Feature Walkthrough', 'User Guide', 'Asking Price', 'Bidding Strategy',
    'Property Negotiation', 'Market Analysis', 'Dublin Property', 'Bidding Wars',
    'Competition Analysis', 'Property Strategy', 'Dublin Market', 'Negotiation'
  ];

  // Handle ESC key and backdrop click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        analytics.alertModalDismissed(
          modalState.blog?.title || 'Blog Alerts',
          modalState.step,
          'unknown'
        );
        hideAlertModal();
      }
    };

    if (modalState.isOpen && modalState.alertType === 'blog') {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [modalState.isOpen, modalState.alertType, modalState.blog?.title, modalState.step, hideAlertModal]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      analytics.alertModalDismissed(
        modalState.blog?.title || 'Blog Alerts',
        modalState.step,
        'unknown'
      );
      hideAlertModal();
    }
  };

  // Handle payment
  const handlePayment = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsProcessing(true);
    analytics.alertStepTransition(modalState.step, 'processing', modalState.blog?.title || 'Blog Alerts');

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/alerts/blog-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Payment setup failed:', error);
      setIsProcessing(false);
      // You might want to show an error message to the user here
    }
  };

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // After login, proceed to payment
    handlePayment();
  };

  // Don't render if modal is not open or not a blog alert
  if (!modalState.isOpen || modalState.alertType !== 'blog' || !modalState.blog) {
    return null;
  }

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
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-slate-900">Premium Blog Alerts</span>
                </div>
                <button
                  onClick={() => {
                    analytics.alertModalDismissed(
                      'Premium Blog Alerts',
                      modalState.step,
                      'unknown'
                    );
                    hideAlertModal();
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {currentStep === 'config' ? (
                  <ConfigStep
                    alertAll={alertAll}
                    setAlertAll={setAlertAll}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                    availableCategories={availableCategories}
                    availableTags={availableTags}
                    onContinue={() => setCurrentStep('payment')}
                    onCancel={() => {
                      analytics.alertModalDismissed(
                        modalState.blog?.title || 'Blog Alerts',
                        modalState.step,
                        'unknown'
                      );
                      hideAlertModal();
                    }}
                  />
                ) : (
                  <PaymentStep
                    alertConfig={{
                      alert_all: alertAll,
                      alert_categories: selectedCategories,
                      alert_tags: selectedTags,
                      notification_frequency: 'immediate'
                    }}
                    onPayment={handlePayment}
                    onBack={() => setCurrentStep('config')}
                    onCancel={() => {
                      analytics.alertModalDismissed(
                        modalState.blog?.title || 'Blog Alerts',
                        modalState.step,
                        'unknown'
                      );
                      hideAlertModal();
                    }}
                    isProcessing={isProcessing}
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
          // After login, proceed to payment
          if (user) {
            handlePayment();
          }
        }}
      />
    </>
  );
}

// Configuration Step Component
function ConfigStep({
  alertAll,
  setAlertAll,
  selectedCategories,
  setSelectedCategories,
  selectedTags,
  setSelectedTags,
  availableCategories,
  availableTags,
  onContinue,
  onCancel
}: {
  alertAll: boolean;
  setAlertAll: (value: boolean) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  availableCategories: string[];
  availableTags: string[];
  onContinue: () => void;
  onCancel: () => void;
}) {
  const toggleCategory = (category: string) => {
    setSelectedCategories(
      selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories, category]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Filter className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Get Exclusive Market Insights First!</h3>
        <p className="text-slate-600 text-sm">
          Join our premium blog alert service and never miss critical Dublin property market updates, exclusive analysis, and money-saving opportunities delivered directly to your inbox.
        </p>
      </div>

      {/* Alert All Option */}
      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
          <input
            type="radio"
            name="alertType"
            checked={alertAll}
            onChange={() => setAlertAll(true)}
            className="text-blue-600"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900">All Blog Posts</div>
            <div className="text-sm text-slate-600">Get notified about all new blog content</div>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
          <input
            type="radio"
            name="alertType"
            checked={!alertAll}
            onChange={() => setAlertAll(false)}
            className="text-blue-600"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-900">Specific Categories & Tags</div>
            <div className="text-sm text-slate-600">Choose specific blog categories and tags</div>
          </div>
        </label>
      </div>

      {/* Category/Tag Selection */}
      {!alertAll && (
        <div className="space-y-4">
          {/* Categories */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Blog Categories</label>
            <div className="grid grid-cols-1 gap-2">
              {availableCategories.map(category => (
                <label key={category} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Blog Tags</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {availableTags.map(tag => (
                <label key={tag} className="flex items-center gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="text-blue-600"
                  />
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-700">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Payment Step Component
function PaymentStep({
  alertConfig,
  onPayment,
  onBack,
  onCancel,
  isProcessing
}: {
  alertConfig: any;
  onPayment: () => void;
  onBack: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Unlock Premium Market Intelligence</h3>
        <p className="text-slate-600 text-sm">
          Join thousands of smart investors who get exclusive Dublin property insights delivered first. Your €3 investment gives lifetime access to market-changing opportunities.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-2">Your Alert Preferences:</h4>
        {alertConfig.alert_all ? (
          <p className="text-sm text-slate-600">📢 All blog posts and articles</p>
        ) : (
          <div className="text-sm text-slate-600 space-y-1">
            {alertConfig.alert_categories.length > 0 && (
              <p>📂 Categories: {alertConfig.alert_categories.join(', ')}</p>
            )}
            {alertConfig.alert_tags.length > 0 && (
              <p>🏷️ Tags: {alertConfig.alert_tags.slice(0, 3).join(', ')}{alertConfig.alert_tags.length > 3 ? '...' : ''}</p>
            )}
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-center gap-2 text-blue-700">
          <span className="text-sm font-medium">One-time payment: €3</span>
        </div>
        <p className="text-blue-600 text-xs mt-1 text-center">
          🚀 Get market insights that could save you €50K+ on your next property investment
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onPayment}
          disabled={isProcessing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Get Premium Alerts Now (€3)
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <button
        onClick={onCancel}
        className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        Not interested
      </button>
    </div>
  );
}
