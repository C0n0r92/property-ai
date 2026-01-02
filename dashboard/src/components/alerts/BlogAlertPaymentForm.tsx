'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, CreditCard, Loader2, Check, BookOpen } from 'lucide-react';
import { useAlertModal, type BlogContext } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

interface BlogAlertPaymentFormProps {
  blog: BlogContext;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BlogAlertPaymentForm({ blog, onSuccess, onCancel }: BlogAlertPaymentFormProps) {
  const { modalState } = useAlertModal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  const handlePayment = async () => {
    setIsProcessing(true);
    analytics.alertStepTransition(modalState.step, 'processing', blog.title);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Here you would integrate with your payment processor
      // For now, we'll simulate a successful payment

      analytics.alertStepTransition('processing', 'success', blog.title);
      onSuccess();
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle payment error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Blog Alert Subscription</h3>
        <p className="text-slate-600 text-sm">
          Get notified when we publish new research articles and market insights.
        </p>
      </div>

      {/* Blog Info */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-1">{blog.title}</h4>
        <p className="text-sm text-slate-600">{blog.excerpt}</p>
      </div>

      {/* Pricing */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-green-800 font-medium">One-time payment</span>
          <span className="text-2xl font-bold text-green-800">€3</span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Lifetime access to blog alerts
        </p>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">Payment Method</label>

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value as 'card')}
              className="text-blue-600"
            />
            <CreditCard className="w-5 h-5 text-slate-400" />
            <span className="text-slate-900">Credit/Debit Card</span>
          </label>

          <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
            <input
              type="radio"
              name="paymentMethod"
              value="paypal"
              checked={paymentMethod === 'paypal'}
              onChange={(e) => setPaymentMethod(e.target.value as 'paypal')}
              className="text-blue-600"
            />
            <div className="w-5 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">P</div>
            <span className="text-slate-900">PayPal</span>
          </label>
        </div>
      </div>

      {/* Card Form (simplified for demo) */}
      {paymentMethod === 'card' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                placeholder="123"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          disabled={isProcessing}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Pay €3 & Subscribe
            </>
          )}
        </button>
      </div>

      {/* Terms */}
      <p className="text-xs text-slate-500 text-center">
        By subscribing, you agree to receive email notifications about new blog posts.
        You can unsubscribe at any time.
      </p>
    </div>
  );
}
