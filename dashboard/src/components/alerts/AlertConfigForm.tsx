'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Bell, CreditCard, Loader2, Check } from 'lucide-react';
import { useAlertModal, type LocationContext } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

interface AlertConfig {
  // Location (pre-filled)
  location_name: string;
  location_coordinates: { lat: number; lng: number };

  // Radius
  radius_km: number;

  // Property Types to monitor
  monitor_sold: boolean;
  monitor_sale: boolean;
  monitor_rental: boolean;

  // Sale Properties Configuration
  sale_min_bedrooms?: number;
  sale_max_bedrooms?: number;
  sale_min_price?: number;
  sale_max_price?: number;
  sale_property_types?: string[];
  sale_alert_on_new?: boolean;
  sale_alert_on_price_drops?: boolean;

  // Rental Properties Configuration
  rental_min_bedrooms?: number;
  rental_max_bedrooms?: number;
  rental_min_price?: number;
  rental_max_price?: number;
  rental_property_types?: string[];
  rental_alert_on_new?: boolean;

  // Sold Properties Configuration
  sold_min_bedrooms?: number;
  sold_max_bedrooms?: number;
  sold_price_threshold_percent?: number;
  sold_alert_on_under_asking?: boolean;
  sold_alert_on_over_asking?: boolean;
}

interface AlertConfigFormProps {
  location: LocationContext;
  onSuccess: () => void;
  onCancel: () => void;
}


const PROPERTY_TYPE_OPTIONS = [
  { value: 'sale', label: 'For Sale', description: 'New listings, price drops, property types, bedrooms' },
  { value: 'rental', label: 'For Rent', description: 'New rentals, price ranges, bedrooms, property types' },
  { value: 'sold', label: 'Sold Properties', description: 'Alert when sold over/under asking price by %' },
];


export function AlertConfigForm({ location, onSuccess, onCancel }: AlertConfigFormProps) {
  const [step, setStep] = useState<'tier-selection' | 'configure-alerts' | 'payment'>('tier-selection');
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium'>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AlertConfig>(() => {
    const defaultConfig = {
      location_name: location.name,
      location_coordinates: location.coordinates,
      radius_km: 5 as number,
      // Property types to monitor - default to all types for comprehensive coverage
      monitor_sold: true,  // Include sold properties for market intelligence
      monitor_sale: true,  // Default to true so free tier config panel has content
      monitor_rental: true,  // Include rentals by default for more options
      // Sale defaults
      sale_alert_on_new: true,
      sale_alert_on_price_drops: true,
      // Rental defaults
      rental_alert_on_new: true,
      // Sold defaults
      sold_price_threshold_percent: 5,
      sold_alert_on_under_asking: true,
      sold_alert_on_over_asking: false,
    };

    // Merge in default alert config if provided
    if (location.defaultAlertConfig) {
      return {
        ...defaultConfig,
        ...location.defaultAlertConfig,
      };
    }

    return defaultConfig;
  });

  const updateConfig = (updates: Partial<AlertConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (selectedTier === 'free') {
        // Free alert creation
        const propertyType = 'for_sale'; // Default to sale for free alerts

        analytics.alertConfigurationUpdated({
          radius_km: config.radius_km,
          propertyType,
          min_bedrooms: undefined,
          max_bedrooms: undefined,
          min_price: undefined,
          max_price: undefined,
          price_threshold_percent: 5,
        });

        // Create free alert directly
        const response = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_name: config.location_name,
            location_coordinates: config.location_coordinates,
            radius_km: config.radius_km,
            monitor_sale: true,  // Free tier monitors sales
            monitor_rental: false,
            monitor_sold: false,
            is_free_tier: true,  // Explicit free tier flag
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create free alert');
        }

        // Success - call onSuccess
        onSuccess();

      } else {
        // Premium alert - go through Stripe
        const propertyType = config.monitor_sale ? 'for_sale' :
                            config.monitor_rental ? 'for_rent' : 'sold';

        analytics.alertConfigurationUpdated({
          radius_km: config.radius_km,
          propertyType,
          min_bedrooms: config.monitor_sale ? config.sale_min_bedrooms :
                       config.monitor_rental ? config.rental_min_bedrooms :
                       config.sold_min_bedrooms,
          max_bedrooms: config.monitor_sale ? config.sale_max_bedrooms :
                       config.monitor_rental ? config.rental_max_bedrooms :
                       config.sold_max_bedrooms,
          min_price: config.monitor_sale ? config.sale_min_price :
                    config.monitor_rental ? config.rental_min_price : undefined,
          max_price: config.monitor_sale ? config.sale_max_price :
                    config.monitor_rental ? config.rental_max_price : undefined,
          price_threshold_percent: config.sold_price_threshold_percent,
        });

        analytics.alertPaymentStarted(99, config.location_name, propertyType);

        // Create Stripe checkout session
        const response = await fetch('/api/alerts/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alertConfig: config,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }

    } catch (err) {
      console.error('Alert creation error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          ['tier-selection', 'configure-alerts', 'payment'].includes(step) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
        }`}>
          1
        </div>
        <div className={`flex-1 h-0.5 ${
          (selectedTier === 'free' && step === 'payment') || (selectedTier === 'premium' && ['configure-alerts', 'payment'].includes(step)) ? 'bg-blue-200' : 'bg-slate-200'
        }`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          (selectedTier === 'free' && step === 'payment') ? 'bg-blue-600 text-white' :
          step === 'configure-alerts' ? 'bg-blue-600 text-white' :
          step === 'payment' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
        }`}>
          {selectedTier === 'free' ? '2' : '2'}
        </div>
        {selectedTier === 'premium' && (
          <>
            <div className={`flex-1 h-0.5 ${
              step === 'payment' ? 'bg-blue-200' : 'bg-slate-200'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'payment' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            }`}>
              3
            </div>
          </>
        )}
      </div>

      {/* Step 1: Tier Selection */}
      {step === 'tier-selection' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Tier Selection */}
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedTier('free');
                // For free tier, ensure comprehensive property monitoring
                // If default config specifies property types, keep them; otherwise default to all types
                const hasDefaultConfig = location.defaultAlertConfig &&
                  (location.defaultAlertConfig.monitor_sale || location.defaultAlertConfig.monitor_rental || location.defaultAlertConfig.monitor_sold);
                if (!hasDefaultConfig) {
                  updateConfig({ monitor_sale: true, monitor_rental: true, monitor_sold: true });
                }
              }}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                selectedTier === 'free'
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                  : 'border-green-200 bg-green-50 hover:bg-green-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedTier === 'free' ? 'bg-green-500' : 'bg-green-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      selectedTier === 'free' ? 'text-white' : 'text-green-700'
                    }`}>✓</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">Free Alert</h4>
                    <p className="text-sm text-green-700">1 location alert with weekly digest</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-900">Free</div>
                  <div className="text-xs text-green-600">12 months</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedTier('premium')}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                selectedTier === 'premium'
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedTier === 'premium' ? 'bg-blue-500' : 'bg-blue-100'
                  }`}>
                    <span className={`text-sm font-bold ${
                      selectedTier === 'premium' ? 'text-white' : 'text-blue-700'
                    }`}>∞</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Premium Upgrade</h4>
                    <p className="text-sm text-blue-700">Unlimited alerts with instant notifications</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-900">€0.99</div>
                  <div className="text-xs text-blue-600">one-time</div>
                </div>
              </div>
            </button>
          </div>

          {/* Radius */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Distance from search: {config.radius_km} km</label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.radius_km}
              onChange={(e) => updateConfig({ radius_km: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>1km</span>
              <span>10km</span>
            </div>
          </div>




          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedTier === 'free') {
                  // Skip configuration for free alerts - go straight to payment
                  analytics.alertStepTransition('tier-selection', 'payment', location.name);
                  setStep('payment');
                } else {
                  // Premium alerts need configuration
                  analytics.alertStepTransition('tier-selection', 'configure-alerts', location.name);
                  setStep('configure-alerts');
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Configure Alerts */}
      {step === 'configure-alerts' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* For Sale Properties Configuration */}
          {config.monitor_sale && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900">🏠 For Sale</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-800">Alert me about:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sale_alert_on_new}
                      onChange={(e) => updateConfig({ sale_alert_on_new: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-blue-800">New listings</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sale_alert_on_price_drops}
                      onChange={(e) => updateConfig({ sale_alert_on_price_drops: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-blue-800">Price drops</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-800">Min bedrooms: {config.sale_min_bedrooms || 'Any'}</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={config.sale_min_bedrooms || 0}
                  onChange={(e) => updateConfig({ sale_min_bedrooms: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Any</span>
                  <span>5+</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-800">
                  Min price: {config.sale_min_price ? `€${config.sale_min_price.toLocaleString()}` : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="50000"
                  value={config.sale_min_price || 0}
                  onChange={(e) => updateConfig({ sale_min_price: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Any</span>
                  <span>€1M+</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-800">
                  Max price: {config.sale_max_price ? `€${config.sale_max_price.toLocaleString()}` : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2000000"
                  step="50000"
                  value={config.sale_max_price || 0}
                  onChange={(e) => updateConfig({ sale_max_price: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Any</span>
                  <span>€2M+</span>
                </div>
              </div>
            </div>
          )}

          {/* For Rent Properties Configuration */}
          {config.monitor_rental && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900">🏢 For Rent</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-800">Alert me about:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.rental_alert_on_new}
                      onChange={(e) => updateConfig({ rental_alert_on_new: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-green-800">New rentals</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-800">Min bedrooms: {config.rental_min_bedrooms || 'Any'}</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={config.rental_min_bedrooms || 0}
                  onChange={(e) => updateConfig({ rental_min_bedrooms: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-green-600">
                  <span>Any</span>
                  <span>5+</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-800">
                  Min rent: {config.rental_min_price ? `€${config.rental_min_price.toLocaleString()}/month` : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="250"
                  value={config.rental_min_price || 0}
                  onChange={(e) => updateConfig({ rental_min_price: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-green-600">
                  <span>Any</span>
                  <span>€5K+</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-800">
                  Max rent: {config.rental_max_price ? `€${config.rental_max_price.toLocaleString()}/month` : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="250"
                  value={config.rental_max_price || 0}
                  onChange={(e) => updateConfig({ rental_max_price: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-green-600">
                  <span>Any</span>
                  <span>€10K+</span>
                </div>
              </div>
            </div>
          )}

          {/* Sold Properties Configuration */}
          {config.monitor_sold && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900">💰 Sold</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-800">Alert when price is:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sold_alert_on_under_asking}
                      onChange={(e) => updateConfig({ sold_alert_on_under_asking: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-purple-800">Under asking</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.sold_alert_on_over_asking}
                      onChange={(e) => updateConfig({ sold_alert_on_over_asking: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-purple-800">Over asking</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-800">
                  Threshold %: {config.sold_price_threshold_percent || 5}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={config.sold_price_threshold_percent || 5}
                  onChange={(e) => updateConfig({ sold_price_threshold_percent: parseInt(e.target.value) || 5 })}
                  className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-purple-600">
                  <span>1%</span>
                  <span>20%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-800">Min bedrooms: {config.sold_min_bedrooms || 'Any'}</label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={config.sold_min_bedrooms || 0}
                  onChange={(e) => updateConfig({ sold_min_bedrooms: parseInt(e.target.value) || undefined })}
                  className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-purple-600">
                  <span>Any</span>
                  <span>5+</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('tier-selection')}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => {
                analytics.alertStepTransition('configure-alerts', 'payment', location.name);
                setStep('payment');
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Next Step
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Payment */}
      {step === 'payment' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {selectedTier === 'free' ? 'Create Your Free Alert' : 'Complete your setup'}
            </h3>
            <p className="text-sm text-slate-600">
              {selectedTier === 'free'
                ? 'Get notified about new property listings and price drops in your area'
                : 'One-time payment for 12 months of alerts'
              }
            </p>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Location</span>
              <span className="text-sm font-medium text-slate-900">{config.location_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Radius</span>
              <span className="text-sm font-medium text-slate-900">{config.radius_km} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Property types</span>
              <span className="text-sm font-medium text-slate-900">
                {[
                  config.monitor_sale && 'For Sale',
                  config.monitor_rental && 'For Rent',
                  config.monitor_sold && 'Sold'
                ].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>

          {/* Pricing */}
          {selectedTier === 'free' ? (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-900">Free Alert Setup</div>
                  <div className="text-sm text-green-700">1 location alert with weekly digest</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-900">Free</div>
                  <div className="text-xs text-green-600">12 months</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex items-center gap-2 text-green-700">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">✓</span>
                  </div>
                  <span className="text-sm">Instant setup • No payment required</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">Premium Property Alerts</div>
                  <div className="text-sm text-slate-600">12 months of unlimited notifications</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">€0.99</div>
                  <div className="text-xs text-slate-500">one-time</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">✓</span>
                  </div>
                  <span className="text-sm">Includes 3 free alerts + unlimited premium alerts</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(selectedTier === 'free' ? 'tier-selection' : 'configure-alerts')}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : selectedTier === 'free' ? (
                <>
                  <Check className="w-4 h-4" />
                  Create Free Alert
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay €0.99 & Set Up Alerts
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
