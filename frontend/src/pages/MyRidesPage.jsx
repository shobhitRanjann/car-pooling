import { useState, useEffect, useCallback } from 'react';
import { getMyOffers, toggleOffer, editOffer, deleteOffer, getRequests, updateRequest } from '../api/endpoints';

const isUrl = (val) => /^https?:\/\//i.test(val?.trim());

const STATUS_STYLE = {
  ACTIVE:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  INACTIVE:  'bg-slate-100 text-slate-600 border-slate-300',
  FULL:      'bg-amber-100 text-amber-700 border-amber-200',
  COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

// ---------- Colleague Requests Component ----------
function ColleagueRequests({ offerId, availableSeats, onRefresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await getRequests(offerId);
      setRequests(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [offerId]);

  useEffect(() => {
    fetchRequests();
    
    const handleRefresh = () => fetchRequests();
    window.addEventListener('REFRESH_DATA', handleRefresh);
    return () => window.removeEventListener('REFRESH_DATA', handleRefresh);
  }, [fetchRequests]);

  const handleStatusChange = async (reqId, newStatus) => {
    try {
      await updateRequest(reqId, newStatus);
      fetchRequests();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request.');
    }
  };

  if (loading) return <div className="text-sm text-slate-500 py-2">Loading requests…</div>;
  if (requests.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-300/60 animate-fade-in">
      <h4 className="text-sm font-semibold text-slate-700 mb-3">Colleague Requests</h4>
      <div className="space-y-3">
        {requests.map((req) => (
          <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-300 gap-3 sm:gap-0">
            <div className="w-full sm:w-auto">
              <p className="text-sm font-medium text-slate-800">
                {req.passenger?.firstName} {req.passenger?.lastName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                📞 <a href={`tel:${req.passenger?.mobileNumber}`} className="hover:text-brand-400">{req.passenger?.mobileNumber}</a>
                <span className="mx-2">•</span>
                📍 {req.pickupPoint || 'To be discussed'}
              </p>
            </div>
            
            <div className="shrink-0 w-full sm:w-auto sm:ml-4 border-t sm:border-0 border-slate-200 pt-2 sm:pt-0">
              {req.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button onClick={() => handleStatusChange(req.id, 'ACCEPTED')} disabled={availableSeats <= 0}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => handleStatusChange(req.id, 'REJECTED')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-400 transition-all">
                    Decline
                  </button>
                </div>
              ) : req.status === 'ACCEPTED' ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Approved
                  </span>
                  <button onClick={() => handleStatusChange(req.id, 'PENDING')} className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors">
                    Undo
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-600 border border-slate-300">
                    Declined
                  </span>
                  <button onClick={() => handleStatusChange(req.id, 'PENDING')} className="text-xs text-slate-500 hover:text-slate-700 underline transition-colors">
                    Undo
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferCard({ offer: initial, onRefresh }) {
  const [offer,    setOffer]    = useState(initial);
  const [editing,  setEditing]  = useState(false);
  const [toggling, setToggling] = useState(false);

  const [form, setForm] = useState({
    startLocationUrl: offer.startLocationUrl || '',
    endLocationUrl:   offer.endLocationUrl   || '',
    departureTime:    offer.departureTime
      ? new Date(offer.departureTime).toTimeString().slice(0, 5)
      : '',
    availableSeats:   offer.availableSeats ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const canToggle = offer.status === 'ACTIVE' || offer.status === 'INACTIVE';
  const isActive  = offer.status === 'ACTIVE';

  const dep = offer.departureTime
    ? new Date(offer.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleOffer(offer.id);
      setOffer(res.data.data);
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.message === 'ACTIVE_LIMIT_EXCEEDED') {
        window.alert('Make this inactive or make your existing ride inactive');
      }
    } finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (window.confirm('once deleted , cannot be undone')) {
      try {
        await deleteOffer(offer.id);
        onRefresh();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete offer.');
      }
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const adjustSeats  = (d) => setForm((f) => ({ ...f, availableSeats: Math.max(1, Math.min(10, f.availableSeats + d)) }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveErr('');
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const departureTime = form.departureTime ? `${today}T${form.departureTime}:00` : undefined;
      const res = await editOffer(offer.id, {
        ...form,
        departureTime,
        isActive: offer.status === 'ACTIVE',
      });
      setOffer(res.data.data);
      setEditing(false);
      onRefresh();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.message === 'ACTIVE_LIMIT_EXCEEDED') {
        window.alert('Make this inactive or make your existing ride inactive');
      } else {
        setSaveErr(err.response?.data?.message || 'Failed to save.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[offer.status] ?? ''}`}>
            {offer.status}
          </span>
          <span className="text-sm text-slate-700 font-medium">🕐 {dep}</span>
          <span className={`text-sm font-semibold ${offer.availableSeats > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            💺 {offer.availableSeats} seats
          </span>
        </div>

        {/* Controls */}
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 shrink-0 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
          {/* Toggle */}
          {canToggle && (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                id={`toggle-my-${offer.id}`}
                disabled={toggling}
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full
                            transition-colors duration-300 focus:outline-none
                            ${isActive ? 'bg-brand-600' : 'bg-slate-200'}
                            ${toggling ? 'opacity-50 cursor-wait' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
                                  transition-transform duration-300
                                  ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}

          {/* Edit toggle */}
          <button
            id={`edit-my-${offer.id}`}
            onClick={() => setEditing((v) => !v)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200
              ${editing
                ? 'bg-brand-600/20 border-brand-500/40 text-brand-400'
                : 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-800'}`}
          >
            {editing ? '✕ Close' : '✏️ Edit'}
          </button>
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            title="Delete Offer"
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Location chips */}
      <div className="flex gap-2 flex-wrap">
        {isUrl(offer.startLocationUrl) ? (
          <a href={offer.startLocationUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200
                       border border-slate-300 text-slate-700 hover:text-slate-900 transition-all">
            📍 View Start
          </a>
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 text-slate-500">
            📍 {offer.startLocationUrl}
          </span>
        )}
        {isUrl(offer.endLocationUrl) ? (
          <a href={offer.endLocationUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200
                       border border-slate-300 text-slate-700 hover:text-slate-900 transition-all">
            🏁 View Destination
          </a>
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 text-slate-500">
            🏁 {offer.endLocationUrl}
          </span>
        )}
      </div>

      {/* Inline edit form */}
      {editing && (
        <form onSubmit={handleSave}
          className="pt-4 border-t border-slate-300/60 space-y-4 animate-fade-in">

          {saveErr && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
              {saveErr}
            </p>
          )}

          <div>
            <label className="input-label">📍 Start Location</label>
            <input name="startLocationUrl" type="text" required
              placeholder="Paste Google Maps URL or type e.g. 'From Office'"
              value={form.startLocationUrl} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label className="input-label">🏁 End Location</label>
            <input name="endLocationUrl" type="text" required
              placeholder="Paste Google Maps URL"
              value={form.endLocationUrl} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label className="input-label">🕐 Departure Time</label>
            <input name="departureTime" type="time"
              value={form.departureTime} onChange={handleChange} className="input-field" />
          </div>

          <div>
            <label className="input-label">💺 Available Seats</label>
            <div className="flex items-center gap-3 mt-1">
              <button type="button" onClick={() => adjustSeats(-1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300
                           flex items-center justify-center text-lg text-slate-700 transition-all active:scale-95">−</button>
              <span className="text-xl font-bold text-slate-900 w-6 text-center tabular-nums">{form.availableSeats}</span>
              <button type="button" onClick={() => adjustSeats(1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300
                           flex items-center justify-center text-lg text-slate-700 transition-all active:scale-95">+</button>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      )}

      {/* Requests Section */}
      {!editing && (
        <ColleagueRequests 
          offerId={offer.id} 
          availableSeats={offer.availableSeats} 
          onRefresh={onRefresh} 
        />
      )}
    </div>
  );
}

export default function MyRidesPage() {
  const [offers,  setOffers]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyOffers();
      setOffers(res.data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    
    const handleRefresh = () => load();
    window.addEventListener('REFRESH_DATA', handleRefresh);
    return () => window.removeEventListener('REFRESH_DATA', handleRefresh);
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Rides</h1>
          <p className="text-slate-500 text-sm mt-1">All offers you've published</p>
        </div>
        <button id="refresh-my-rides" onClick={load} className="btn-secondary text-xs px-3 py-1.5">
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-slate-500">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      )}

      {!loading && offers.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-slate-500 font-medium">No offers published yet</p>
          <p className="text-slate-600 text-sm mt-1">Publish a ride from Offer Ride to see it here</p>
        </div>
      )}

      {!loading && offers.length > 0 && (
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
