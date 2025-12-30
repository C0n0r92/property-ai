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
  const [step, setStep] = useState<'property-types' | 'configure-alerts' | 'payment'>('property-types');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AlertConfig>({
    location_name: location.name,
    location_coordinates: location.coordinates,
    radius_km: 2 as number,
    // Property types to monitor
    monitor_sold: false,
    monitor_sale: false,
    monitor_rental: false,
    // Sale defaults
    sale_alert_on_new: true,
    sale_alert_on_price_drops: true,
    // Rental defaults
    rental_alert_on_new: true,
    // Sold defaults
    sold_price_threshold_percent: 5,
    sold_alert_on_under_asking: true,
    sold_alert_on_over_asking: false,
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
      // Track configuration before payment
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

      analytics.alertPaymentStarted(300, config.location_name, propertyType);

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

    } catch (err) {
      console.error('Alert checkout error:', err);
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
          ['property-types', 'configure-alerts', 'payment'].includes(step) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
        }`}>
          1
        </div>
        <div className={`flex-1 h-0.5 ${
          ['configure-alerts', 'payment'].includes(step) ? 'bg-blue-200' : 'bg-slate-200'
        }`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'configure-alerts' ? 'bg-blue-600 text-white' :
          step === 'payment' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
        }`}>
          2
        </div>
        <div className={`flex-1 h-0.5 ${
          step === 'payment' ? 'bg-blue-200' : 'bg-slate-200'
        }`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step === 'payment' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
        }`}>
          3
        </div>
      </div>

      {/* Step 1: Property Types */}
      {step === 'property-types' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Property Types */}
          <div className="space-y-4">
            <div className="space-y-3">
              {PROPERTY_TYPE_OPTIONS.map((option) => {
                const isSelected = option.value === 'sale' ? config.monitor_sale :
                                 option.value === 'rental' ? config.monitor_rental :
                                 config.monitor_sold;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      const propertyTypeMap = {
                        sale: 'for_sale',
                        rental: 'for_rent',
                        sold: 'sold'
                      } as const;
                      analytics.alertPropertyTypeSelected(
                        propertyTypeMap[option.value as keyof typeof propertyTypeMap],
                        location.name
                      );
                      updateConfig({
                        monitor_sale: option.value === 'sale',
                        monitor_rental: option.value === 'rental',
                        monitor_sold: option.value === 'sold',
                      });
                    }}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                  </button>
                );
              })}
            </div>
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
                analytics.alertStepTransition('property-types', 'configure-alerts', location.name);
                setStep('configure-alerts');
              }}
              disabled={!config.monitor_sale && !config.monitor_rental && !config.monitor_sold}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
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
              onClick={() => setStep('property-types')}
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">Complete your setup</h3>
            <p className="text-sm text-slate-600">One-time payment for 12 months of alerts</p>
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
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">Property Alerts</div>
                <div className="text-sm text-slate-600">12 months of notifications</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">€3.00</div>
                <div className="text-xs text-slate-500">one-time</div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('configure-alerts')}
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
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay €3.00 & Set Up Alerts
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
