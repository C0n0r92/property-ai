'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Check, Loader2, Bookmark, Bell, TrendingDown, Star } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: 'save_limit' | 'alert_limit' | 'feature_gate';
  currentCount?: number;
  limit?: number;
}

const BENEFITS = [
  { icon: Bookmark, text: 'Unlimited saved properties', highlight: true },
  { icon: Bell, text: 'Unlimited location alerts', highlight: true },
  { icon: TrendingDown, text: 'Instant price drop notifications', highlight: false },
  { icon: Zap, text: 'Real-time new listing alerts', highlight: false },
  { icon: Star, text: 'Priority email delivery', highlight: false },
];

export function UpgradeModal({ isOpen, onClose, trigger, currentCount, limit }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    analytics.track('upgrade_clicked', { trigger, currentCount, limit });

    try {
      // Create Stripe checkout session for premium upgrade
      const response = await fetch('/api/upgrade/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Upgrade error:', error);
      setIsLoading(false);
    }
  };

  const getHeadline = () => {
    switch (trigger) {
      case 'save_limit':
        return `You've saved ${currentCount} of ${limit} properties`;
      case 'alert_limit':
        return "You've reached your free alert limit";
      default:
        return 'Unlock Premium Features';
    }
  };

  const getSubheadline = () => {
    switch (trigger) {
      case 'save_limit':
        return "Upgrade to premium for unlimited saves and never miss a property again.";
      case 'alert_limit':
        return "Get unlimited location alerts and instant notifications for new listings.";
      default:
        return "Take your property search to the next level with premium features.";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-7 h-7" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2">{getHeadline()}</h2>
            <p className="text-blue-100 text-sm">{getSubheadline()}</p>
          </div>

          {/* Benefits */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {BENEFITS.map((benefit, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    benefit.highlight ? 'bg-blue-50 border border-blue-100' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    benefit.highlight ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <benefit.icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium ${
                    benefit.highlight ? 'text-blue-900' : 'text-slate-700'
                  }`}>
                    {benefit.text}
                  </span>
                  {benefit.highlight && (
                    <Check className="w-4 h-4 text-blue-500 ml-auto" />
                  )}
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-3xl font-bold text-slate-900">€0.99</span>
                <span className="text-slate-500 text-sm">one-time</span>
              </div>
              <p className="text-xs text-slate-500">12 months of premium access</p>
            </div>

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Upgrade to Premium
                </>
              )}
            </button>

            {/* Trust indicators */}
            <p className="text-xs text-center text-slate-400">
              Secure payment via Stripe • Cancel anytime • Instant access
            </p>

            {/* Maybe later */}
            <button
              onClick={onClose}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

