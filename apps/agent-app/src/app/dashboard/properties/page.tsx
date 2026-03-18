'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Bookmark,
  Search,
  Trash2,
  Download,
  Edit3,
  X,
  Check,
  Plus,
  Home,
  MapPin,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import type { SavedProperty as SavedPropertyType } from '@/lib/saved-properties';
import { formatPrice } from '@/lib/format';

interface SavedProperty {
  id: string;
  address: string;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  price?: number;
  savedAt: string;
  notes?: string;
  lastValuation?: {
    medianPrice: number;
    verdict: string;
  };
}

function PropertiesContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    if (!user) return;

    try {
      const { getSavedProperties } = await import('@/lib/saved-properties');
      const properties = await getSavedProperties(user.id);

      // Transform from DB format to component format
      const transformed: SavedProperty[] = properties.map((p: SavedPropertyType) => ({
        id: p.id,
        address: p.address,
        beds: p.beds,
        baths: p.baths,
        areaSqm: p.area_sqm,
        propertyType: p.property_type,
        price: p.price,
        savedAt: p.saved_at,
        notes: p.notes,
        lastValuation: p.last_valuation,
      }));

      setSavedProperties(transformed);
    } catch (err) {
      console.error('Failed to load saved properties:', err);
      showToast('Failed to load saved properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleDeleteProperty = async (propertyId: string) => {
    if (!user) return;

    setDeletingId(propertyId);
    try {
      const { deleteSavedProperty } = await import('@/lib/saved-properties');
      const result = await deleteSavedProperty(user.id, propertyId);

      if (result.success) {
        setSavedProperties(prev => prev.filter(p => p.id !== propertyId));
        setSelectedProperties(prev => prev.filter(id => id !== propertyId));
        showToast('Property removed from saved list', 'success');
      } else {
        showToast(result.error || 'Failed to delete property', 'error');
      }
    } catch (err) {
      console.error('Delete property error:', err);
      showToast('Failed to delete property', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateNotes = async (propertyId: string) => {
    if (!user) return;

    try {
      const { updatePropertyNotes } = await import('@/lib/saved-properties');
      const result = await updatePropertyNotes(user.id, propertyId, noteText);

      if (result.success) {
        setSavedProperties(prev =>
          prev.map(p => p.id === propertyId ? { ...p, notes: noteText } : p)
        );
        setEditingNotes(null);
        showToast('Notes updated', 'success');
      } else {
        showToast(result.error || 'Failed to update notes', 'error');
      }
    } catch (err) {
      console.error('Update notes error:', err);
      showToast('Failed to update notes', 'error');
    }
  };

  const startEditingNotes = (property: SavedProperty) => {
    setEditingNotes(property.id);
    setNoteText(property.notes || '');
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedProperties.length === 0) return;

    for (const propertyId of selectedProperties) {
      await handleDeleteProperty(propertyId);
    }
    setSelectedProperties([]);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const toggleSelect = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedProperties.length === savedProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(savedProperties.map(p => p.id));
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold" style={{ background: 'var(--gradient-primary)' }}>G</div>
              <div>
                <h1 className="text-lg font-bold">Gaff Intel</h1>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Saved Properties</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--foreground-secondary)' }}>{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm transition"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Saved Properties</h2>
            <p style={{ color: 'var(--foreground-secondary)' }}>
              Track properties of interest and quickly re-run valuations
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/valuation')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Property
          </button>
        </div>

        {/* Actions Bar */}
        {savedProperties.length > 0 && (
          <div className="card mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProperties.length === savedProperties.length}
                    onChange={selectAll}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-sm">
                    {selectedProperties.length > 0
                      ? `${selectedProperties.length} selected`
                      : 'Select all'}
                  </span>
                </label>
              </div>
              {selectedProperties.length > 0 && (
                <div className="flex items-center gap-2">
                  <button className="btn-secondary flex items-center gap-2 text-sm">
                    <Download size={16} />
                    Export PDF
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="btn-secondary flex items-center gap-2 text-sm"
                    style={{ color: 'var(--negative)' }}
                  >
                    <Trash2 size={16} />
                    Remove ({selectedProperties.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
            <p style={{ color: 'var(--foreground-secondary)' }}>Loading saved properties...</p>
          </div>
        )}

        {/* Properties List */}
        {!loading && savedProperties.length > 0 ? (
          <div className="space-y-4">
            {savedProperties.map((property) => (
              <div
                key={property.id}
                className={`card transition ${selectedProperties.includes(property.id) ? 'border-[var(--accent)]' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={selectedProperties.includes(property.id)}
                      onChange={() => toggleSelect(property.id)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{property.address}</h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                      {property.beds !== undefined && <span>{property.beds} bed</span>}
                      {property.baths !== undefined && <span>{property.baths} bath</span>}
                      {property.areaSqm && <span>{property.areaSqm} sqm</span>}
                      {property.propertyType && <span>{property.propertyType}</span>}
                    </div>

                    {/* Notes - editable */}
                    {editingNotes === property.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add notes..."
                          className="flex-1 px-3 py-2 text-sm rounded-lg"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateNotes(property.id)}
                          className="p-2 rounded-lg transition"
                          style={{ background: 'var(--positive-bg)', color: 'var(--positive)' }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="p-2 rounded-lg transition"
                          style={{ background: 'var(--surface-hover)' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : property.notes ? (
                      <p className="text-sm mt-2" style={{ color: 'var(--foreground-muted)' }}>
                        Notes: {property.notes}
                      </p>
                    ) : null}

                    <p className="text-xs mt-2" style={{ color: 'var(--foreground-muted)' }}>
                      Saved {new Date(property.savedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Price & Actions */}
                  <div className="text-right flex-shrink-0">
                    {property.price && (
                      <p className="font-bold text-lg mb-1">{formatPrice(property.price)}</p>
                    )}
                    {property.lastValuation && (
                      <p className="text-sm mb-2" style={{ color: 'var(--foreground-secondary)' }}>
                        Median: {formatPrice(property.lastValuation.medianPrice)}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/valuation?address=${encodeURIComponent(property.address)}`)}
                        className="chip text-xs"
                      >
                        <Search size={14} />
                        Re-value
                      </button>
                      <button
                        onClick={() => startEditingNotes(property)}
                        className="chip text-xs"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        disabled={deletingId === property.id}
                        className="chip text-xs"
                        style={{ color: 'var(--negative)' }}
                      >
                        {deletingId === property.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && (
          /* Empty State */
          <div className="card text-center py-16">
            <Bookmark size={48} className="mx-auto mb-4" style={{ color: 'var(--foreground-muted)' }} />
            <h3 className="text-xl font-semibold mb-2">No Saved Properties</h3>
            <p className="mb-6" style={{ color: 'var(--foreground-secondary)', maxWidth: '400px', margin: '0 auto' }}>
              Save properties from valuations to track them here. You can add notes, quickly re-run valuations, and export reports.
            </p>
            <button
              onClick={() => router.push('/dashboard/valuation')}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Search size={18} />
              Search Properties
            </button>
          </div>
        )}

        {/* Tips Card */}
        <div className="card mt-8" style={{ borderLeft: '4px solid var(--accent)' }}>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Home size={18} style={{ color: 'var(--accent)' }} />
            Tips for Using Saved Properties
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            <div className="flex items-start gap-2">
              <MapPin size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--foreground-muted)' }} />
              <p>Save properties during valuations to build your portfolio of tracked listings</p>
            </div>
            <div className="flex items-start gap-2">
              <Edit3 size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--foreground-muted)' }} />
              <p>Add notes to remember key details about each property or vendor</p>
            </div>
            <div className="flex items-start gap-2">
              <Download size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--foreground-muted)' }} />
              <p>Export multiple properties to PDF for comprehensive market reports</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function PropertiesPage() {
  return (
    <ProtectedRoute>
      <PropertiesContent />
    </ProtectedRoute>
  );
}
