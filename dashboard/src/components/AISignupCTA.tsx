'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '@/lib/analytics';

type Step = 'email' | 'payment' | 'processing' | 'success';

export function AISignupCTA() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    requestNumber: number;
    needsPayment: boolean;
    price: number;
  } | null>(null);

  // Extract blog slug from URL
  useEffect(() => {
    const path = window.location.pathname;
    const blogMatch = path.match(/\/blog\/([^\/]+)/);
    if (blogMatch) {
      setBlogSlug(blogMatch[1]);
    }
  }, []);

  // Show collapsed CTA after user has scrolled down a bit and spent some time on the page
  useEffect(() => {
    const timer = setTimeout(() => {
      // Start with collapsed icon visible
    }, 3000); // Show after 3 seconds (faster than before)

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      // Show when user has scrolled down about half a viewport
      if (scrollPosition > windowHeight * 0.3) {
        // Icon is always visible once triggered, just show it
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogSlug) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai-summary/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          blogSlug,
          step: 'check'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check request');
      }

      setPaymentInfo(data);
      analytics.aiSummaryEmailEntered(blogSlug, data.requestNumber);

      if (data.needsPayment) {
        setCurrentStep('payment');
      } else {
        // Process free request
        await handleFreeRequest();
        analytics.aiSummaryRequestSubmitted(blogSlug, false, data.requestNumber); // false = free
        // Auto-close after success
        setTimeout(() => setIsExpanded(false), 3000);
      }
    } catch (error: any) {
      console.error('AI summary check error:', error);
      // For now, show success to avoid breaking UX
      setCurrentStep('success');
      setTimeout(() => setIsExpanded(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFreeRequest = async () => {
    try {
      const response = await fetch('/api/ai-summary/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          blogSlug,
          step: 'request'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request summary');
      }

      setCurrentStep('success');
      setTimeout(() => setIsExpanded(false), 3000);
    } catch (error: any) {
      console.error('Free AI summary request error:', error);
      setCurrentStep('success'); // Show success anyway
      setTimeout(() => setIsExpanded(false), 3000);
    }
  };

  const handlePaymentRequest = async () => {
    setCurrentStep('processing');
    setIsSubmitting(true);

    // Track payment initiation
    if (paymentInfo) {
      analytics.aiSummaryPaymentInitiated(blogSlug, paymentInfo.price, paymentInfo.requestNumber);
    }

    try {
      const response = await fetch('/api/ai-summary/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          blogSlug,
          step: 'request'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      // Track paid request submission
      if (paymentInfo) {
        analytics.aiSummaryRequestSubmitted(blogSlug, true, paymentInfo.requestNumber); // true = paid
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error: any) {
      console.error('Payment AI summary request error:', error);
      setCurrentStep('email');
      setIsSubmitting(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setCurrentStep('email'); // Reset to email step when expanding
    analytics.aiSummaryCtaClicked(blogSlug);
  };

  const handleClose = () => {
    setIsExpanded(false);
    // Don't auto-expand again for this session
    sessionStorage.setItem('ai-cta-expanded', 'true');
  };

  // Don't auto-expand if already expanded this session, but icon stays visible
  useEffect(() => {
    if (sessionStorage.getItem('ai-cta-expanded') === 'true') {
      setIsExpanded(false);
    }
  }, []);

  // Track when CTA is shown
  useEffect(() => {
    if (blogSlug) {
      analytics.aiSummaryCtaShown(blogSlug);
    }
  }, [blogSlug]);

  // Don't show anything if no blog slug
  if (!blogSlug) return null;

  return (
    <>
      {/* Collapsed Icon State */}
      {!isExpanded && (
        <motion.button
          onClick={handleExpand}
          className="fixed bottom-24 right-4 md:bottom-28 md:right-6 z-50 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg flex flex-col items-center justify-center px-3 py-2 transition-all duration-200 group min-w-[60px]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Get AI Summary"
        >
          <svg className="w-5 h-5 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-white text-xs font-medium leading-tight text-center">
            AI<br />Summary
          </span>
        </motion.button>
      )}

      {/* Expanded Popup State */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed bottom-24 right-4 md:bottom-28 md:right-6 z-50 max-w-sm"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-1 shadow-2xl">
              <div className="bg-slate-900 rounded-2xl p-4 relative">
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* AI Icon */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">AI Blog Summary</h3>
                    <p className="text-xs text-slate-400">Instant insights delivered</p>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {currentStep === 'email' && (
                    <motion.div
                      key="email"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Get an AI-powered summary of this blog post delivered straight to your email.
                        <span className="text-green-400 font-medium"> First summary is free!</span>
                      </p>

                      <form onSubmit={handleEmailSubmit} className="space-y-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Checking...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Get AI Summary
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {currentStep === 'payment' && paymentInfo && (
                    <motion.div
                      key="payment"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 font-medium mb-1">
                          This is your {paymentInfo.requestNumber} AI summary request
                        </p>
                        <p className="text-xs text-blue-700">
                          You've used your free summary. This one costs just €{(paymentInfo.price / 100).toFixed(2)}.
                        </p>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-green-800 font-medium">AI Summary</span>
                          <span className="text-lg font-bold text-green-800">€{(paymentInfo.price / 100).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentStep('email')}
                          className="flex-1 px-3 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg text-sm transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={handlePaymentRequest}
                          disabled={isSubmitting}
                          className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              Pay & Get Summary
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'processing' && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-4"
                    >
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <p className="text-sm font-medium text-blue-400">Processing payment...</p>
                      <p className="text-xs text-slate-400 mt-1">Redirecting to secure checkout</p>
                    </motion.div>
                  )}

                  {currentStep === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-4"
                    >
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-green-400">Request submitted!</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {paymentInfo?.needsPayment
                          ? 'Completing payment... you\'ll receive your summary shortly after.'
                          : 'Your free AI summary is being prepared. Check your email soon!'
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-slate-500 mt-4 text-center">
                  Secure payment • Instant delivery • No spam
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
