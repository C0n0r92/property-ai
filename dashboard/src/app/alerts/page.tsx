'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Bell, MapPin, Settings, Trash2, Plus, CheckCircle, AlertCircle, Clock, Bookmark, Calculator, Euro, BookOpen } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { SavedProperty } from '@/types/supabase';
import { formatFullPrice } from '@/lib/format';
import { analytics } from '@/lib/analytics';

interface LocationAlert {
  id: string;
  location_name: string;
  search_radius_km: number;
  property_type: string;
  status: 'active' | 'paused' | 'expired';
  expires_at: string;
  created_at: string;
  alert_on_new_listings: boolean;
  alert_on_price_drops: boolean;
  alert_on_new_sales: boolean;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_price?: number;
  max_price?: number;
}

interface BlogAlert {
  id: string;
  alert_type: 'general';
  notification_frequency: 'immediate' | 'daily' | 'weekly';
  status: 'active' | 'paused' | 'expired';
  expires_at: string | null;
  created_at: string;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<LocationAlert[]>([]);
  const [blogAlerts, setBlogAlerts] = useState<BlogAlert[]>([]);
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'properties'>('alerts');
  const [loading, setLoading] = useState(true);
  const [blogLoading, setBlogLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for payment success/cancelled from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      // Clear URL and check payment success
      window.history.replaceState({}, '', '/alerts');
      setSuccessMessage('🎉 Payment successful! Processing your alert...');
      checkPaymentSuccess();
    } else if (paymentStatus === 'cancelled') {
      // Clear URL and show cancelled message
      window.history.replaceState({}, '', '/alerts');
      setError('Payment was cancelled. You can try again anytime.');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAlerts();
      fetchBlogAlerts();
      fetchSavedProperties();
    } else {
      setLoading(false);
      setBlogLoading(false);
      setPropertiesLoading(false);
    }
  }, [user]);

  // Track page views
  useEffect(() => {
    analytics.alertPageViewed(activeTab);
  }, [activeTab]);

  const fetchAlerts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load your alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogAlerts = async () => {
    if (!user) return;

    try {
      setBlogLoading(true);
      const response = await fetch('/api/alerts/blog');
      if (!response.ok) throw new Error('Failed to fetch blog alerts');

      const data = await response.json();
      setBlogAlerts(data.alerts || []);
    } catch (err) {
      console.error('Error fetching blog alerts:', err);
      setBlogError('Failed to load your blog alerts');
    } finally {
      setBlogLoading(false);
    }
  };

  const checkPaymentSuccess = async () => {
    try {
      // Wait a moment for webhook to process, then check if alerts were created
      setTimeout(async () => {
        await fetchAlerts();

        // Check if we have any recent alerts (created in last 5 minutes)
        const recentAlerts = alerts.filter(alert => {
          const createdAt = new Date(alert.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return createdAt > fiveMinutesAgo;
        });

        if (recentAlerts.length > 0) {
          setSuccessMessage('🎉 Payment successful! Your alert has been created and will start monitoring properties.');
          analytics.alertPaymentCompleted(recentAlerts[0].id, 99, recentAlerts[0].location_name, 'for_sale');
          analytics.alertCreated(recentAlerts[0].id, recentAlerts[0].location_name, 'for_sale', recentAlerts[0].search_radius_km);
        } else {
          setError('Payment successful but alert creation may be delayed. Please refresh the page in a moment, or contact support if the issue persists.');
        }
      }, 3000); // Wait 3 seconds for webhook processing
    } catch (err) {
      console.error('Payment verification error:', err);
      setError('Payment successful but alert creation failed. Please contact support.');
    }
  };

  const fetchSavedProperties = async () => {
    try {
      setPropertiesLoading(true);
      const response = await fetch('/api/saved-properties');
      if (!response.ok) {
        throw new Error('Failed to fetch saved properties');
      }
      const data = await response.json();
      setSavedProperties(data.properties || []);
      console.log('Loaded saved properties:', data.properties?.length || 0, 'properties');
    } catch (err) {
      console.error('Error fetching saved properties:', err);
      setPropertiesError('Failed to load saved properties');
    } finally {
      setPropertiesLoading(false);
    }
  };

  const handleUnsave = async (propertyId: string, propertyType: 'listing' | 'rental' | 'sold') => {
    try {
      const response = await fetch(
        `/api/saved-properties?property_id=${encodeURIComponent(propertyId)}&property_type=${propertyType}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove property');
      }

      // Remove from local state
      setSavedProperties(prev => prev.filter(sp =>
        !(sp.property_id === propertyId && sp.property_type === propertyType)
      ));
    } catch (err) {
      console.error('Error removing property:', err);
      alert('Failed to remove property');
    }
  };

  const handleCalculateMortgage = (propertyData: any, propertyType: string) => {
    console.log('Calculating mortgage for property:', propertyData, 'Type:', propertyType);
    console.log('Property address:', propertyData.address);

    // Calculate mortgage parameters from property data
    let homeValue = 0;
    if (propertyType === 'rental') {
      homeValue = (propertyData.monthlyRent || 0) * 240; // Estimate home value based on rental (20 year equivalent)
    } else {
      homeValue = propertyData.soldPrice || propertyData.askingPrice || propertyData.price || 0;
    }

    // Ensure we have a valid home value
    if (homeValue <= 0) {
      alert('Unable to calculate mortgage: Property price not available');
      return;
    }

    const downPayment = Math.max(homeValue * 0.1, 20000); // 10% down or €20k minimum
    const loanAmount = Math.max(homeValue - downPayment, 0);

    console.log('Calculated values:', { homeValue, downPayment, loanAmount });

    // Build URL with pre-filled parameters
    const params = new URLSearchParams({
      homeValue: homeValue.toString(),
      downPayment: downPayment.toString(),
      loanAmount: loanAmount.toString(),
      interestRate: '3.5', // Default rate
      loanTerm: '30', // Default term
      propertyType: propertyData.propertyType || 'Apartment',
      address: encodeURIComponent(propertyData.address || ''),
    });

    const url = `/mortgage-calc?${params.toString()}`;
    console.log('Navigating to:', url);

    // Navigate to mortgage calculator with pre-filled data
    window.location.href = url;
  };

  const toggleAlertStatus = async (alertId: string, currentStatus: string, isBlogAlert = false) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const apiUrl = isBlogAlert ? `/api/alerts/blog/${alertId}` : `/api/alerts/${alertId}`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error(`Failed to update ${isBlogAlert ? 'blog ' : ''}alert`);

      // Update local state
      if (isBlogAlert) {
        setBlogAlerts(blogAlerts.map(alert =>
          alert.id === alertId ? { ...alert, status: newStatus as any } : alert
        ));
      } else {
        setAlerts(alerts.map(alert =>
          alert.id === alertId ? { ...alert, status: newStatus as any } : alert
        ));
      }
    } catch (err) {
      console.error(`Error updating ${isBlogAlert ? 'blog ' : ''}alert:`, err);
      if (isBlogAlert) {
        setBlogError(`Failed to update blog alert status`);
      } else {
        setError('Failed to update alert status');
      }
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      // Update local state
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert');
    }
  };

  const toggleBlogAlertStatus = async (alertId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const response = await fetch(`/api/alerts/blog/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update blog alert');

      // Update local state
      setBlogAlerts(blogAlerts.map(alert =>
        alert.id === alertId ? { ...alert, status: newStatus as any } : alert
      ));
    } catch (err) {
      console.error('Error updating blog alert:', err);
      setBlogError('Failed to update blog alert');
    }
  };

  const deleteBlogAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this blog alert?')) return;

    try {
      const response = await fetch(`/api/alerts/blog/${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete blog alert');

      // Update local state
      setBlogAlerts(blogAlerts.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error deleting blog alert:', err);
      setBlogError('Failed to delete blog alert');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string, expiresAt: string | null) => {
    // For blog alerts with no expiration, only check status
    if (expiresAt === null) {
      if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-500" />;
      if (status === 'paused') return <Clock className="w-4 h-4 text-yellow-500" />;
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }

    // For location alerts with expiration
    const isExpired = new Date(expiresAt) < new Date();

    if (isExpired) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (status === 'active') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'paused') return <Clock className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = (status: string, expiresAt: string | null) => {
    // For blog alerts with no expiration
    if (expiresAt === null) {
      return status.charAt(0).toUpperCase() + status.slice(1);
    }

    // For location alerts with expiration
    const isExpired = new Date(expiresAt) < new Date();
    if (isExpired) return 'Expired';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center py-16">
          <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Property Alerts</h1>
          <p className="text-gray-400 mb-6">Sign in to manage your location alerts</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with Tabs */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Alerts & Saved Properties</h1>
              <p className="text-gray-400">Manage your property alerts and saved items</p>
            </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Alert
              </Link>
            </div>

          {/* Tabs */}
          <div className="flex bg-gray-900/50 backdrop-blur-xl rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Alerts ({alerts.length + blogAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'properties'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Saved Properties ({savedProperties.length})
            </button>
          </div>
        </div>

        {activeTab === 'alerts' ? (
          // Alerts Tab
          <>
            {/* Success Message */}
            {successMessage && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <p className="text-emerald-300">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            )}

            {/* No alerts */}
            {!loading && !blogLoading && alerts.length === 0 && blogAlerts.length === 0 && (
              <div className="text-center py-16">
                <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No alerts yet</h2>
                <p className="text-gray-400 mb-6">
                  Start searching for properties or subscribe to blog alerts to get notified about new content.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Property Alerts
                  </Link>
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Blog Alerts
                  </Link>
                </div>
              </div>
            )}

            {/* Alerts list */}
            {!loading && !blogLoading && (alerts.length > 0 || blogAlerts.length > 0) && (
              <div className="space-y-4">
                {/* Location Alerts */}
                {alerts.map((alert) => (
                  <div key={alert.id} className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Location and status */}
                        <div className="flex items-center gap-3 mb-3">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <h3 className="text-lg font-semibold text-white">
                            {alert.location_name}
                          </h3>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(alert.status, alert.expires_at)}
                            <span className="text-sm text-gray-400">
                              {getStatusText(alert.status, alert.expires_at)}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Radius:</span>
                            <span className="ml-2 font-medium text-white">{alert.search_radius_km}km</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-2 font-medium text-white capitalize">{alert.property_type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-2 font-medium text-white">{formatDate(alert.created_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Expires:</span>
                            <span className={`ml-2 font-medium ${
                              new Date(alert.expires_at) < new Date() ? 'text-red-400' : 'text-white'
                            }`}>
                              {formatDate(alert.expires_at)}
                            </span>
                          </div>
                        </div>

                        {/* Alert preferences */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {alert.alert_on_new_listings && (
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full border border-blue-700/50">
                              New listings
                            </span>
                          )}
                          {alert.alert_on_price_drops && (
                            <span className="px-2 py-1 bg-orange-900/50 text-orange-300 text-xs rounded-full border border-orange-700/50">
                              Price drops
                            </span>
                          )}
                          {alert.alert_on_new_sales && (
                            <span className="px-2 py-1 bg-emerald-900/50 text-emerald-300 text-xs rounded-full border border-emerald-700/50">
                              New sales
                            </span>
                          )}
                        </div>

                        {/* Filters */}
                        {(alert.min_bedrooms || alert.max_bedrooms || alert.min_price || alert.max_price) && (
                          <div className="text-sm text-gray-400">
                            <span className="font-medium text-white">Filters:</span>
                            {alert.min_bedrooms && ` ${alert.min_bedrooms}+ beds`}
                            {alert.max_bedrooms && ` up to ${alert.max_bedrooms} beds`}
                            {alert.min_price && ` €${alert.min_price.toLocaleString()}+`}
                            {alert.max_price && ` up to €${alert.max_price.toLocaleString()}`}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleAlertStatus(alert.id, alert.status)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            alert.status === 'active'
                              ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 hover:bg-yellow-800/50'
                              : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-800/50'
                          }`}
                        >
                          {alert.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Blog Alerts */}
                {blogAlerts.map((alert) => (
                  <div key={alert.id} className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Blog alert type and status */}
                        <div className="flex items-center gap-3 mb-3">
                          <BookOpen className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">
                            Blog Alerts
                          </h3>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(alert.status, alert.expires_at)}
                            <span className="text-sm text-gray-400">
                              {getStatusText(alert.status, alert.expires_at)}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-2 font-medium text-white capitalize">{alert.alert_type}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Frequency:</span>
                            <span className="ml-2 font-medium text-white capitalize">{alert.notification_frequency}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Created:</span>
                            <span className="ml-2 font-medium text-white">
                              {new Date(alert.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Expires:</span>
                            <span className="ml-2 font-medium text-white">
                              {alert.expires_at ? new Date(alert.expires_at).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-300 text-sm mb-4">
                          Get notified when we publish new research articles and market insights about Dublin property.
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleAlertStatus(alert.id, alert.status, true)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            alert.status === 'active'
                              ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 hover:bg-yellow-800/50'
                              : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-800/50'
                          }`}
                        >
                          {alert.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => deleteBlogAlert(alert.id)}
                          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Help text */}
            {!loading && alerts.length > 0 && (
              <div className="mt-8 bg-gray-900/50 backdrop-blur-xl border border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">How alerts work</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• You'll receive emails when properties match your criteria</li>
                  <li>• Alerts are checked daily against new property data</li>
                  <li>• Paused alerts won't send notifications until resumed</li>
                  <li>• Expired alerts need renewal to continue working</li>
                </ul>
              </div>
            )}
          </>
        ) : (
          // Saved Properties Tab
          <>
            {propertiesLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Loading saved properties...</p>
              </div>
            ) : propertiesError ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{propertiesError}</p>
                <button
                  onClick={fetchSavedProperties}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                >
                  Try Again
                </button>
              </div>
            ) : savedProperties.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-white mb-2">No saved properties yet</h3>
                <p className="text-gray-400 mb-6">
                  Properties from your alerts will be automatically saved here, or you can save them manually while browsing.
                </p>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                  </svg>
                  Explore Property Map
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {savedProperties.map((savedProperty) => (
                  <div
                    key={`${savedProperty.property_id}-${savedProperty.property_type}`}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-2 leading-tight">
                          {savedProperty.property_data?.address || savedProperty.property_id}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                          <span className="inline-flex items-center gap-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              savedProperty.property_type === 'listing' ? 'bg-blue-500' :
                              savedProperty.property_type === 'rental' ? 'bg-emerald-500' : 'bg-orange-500'
                            }`}></span>
                            {savedProperty.property_type === 'listing' ? 'For Sale' :
                             savedProperty.property_type === 'rental' ? 'For Rent' : 'Sold'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnsave(savedProperty.property_id, savedProperty.property_type)}
                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {savedProperty.property_data && (
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm">Price</span>
                          <span className="text-white font-semibold">
                            {savedProperty.property_type === 'rental'
                              ? `€${savedProperty.property_data.monthlyRent?.toLocaleString()}/month`
                              : formatFullPrice(savedProperty.property_data.soldPrice || savedProperty.property_data.askingPrice || 0)
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm">Bedrooms</span>
                          <span className="text-white font-semibold">{savedProperty.property_data.bedrooms || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm">Saved</span>
                          <span className="text-white font-semibold">{new Date(savedProperty.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => handleCalculateMortgage(savedProperty.property_data, savedProperty.property_type)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <Calculator className="w-3 h-3" />
                        Mortgage
                      </button>
                      <Link
                        href={`/property/${savedProperty.property_type}/${savedProperty.property_id}`}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                      >
                        View
                      </Link>
                    </div>

                    {savedProperty.notes && (
                      <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-400 italic text-sm">"{savedProperty.notes}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </Suspense>
  );
}

