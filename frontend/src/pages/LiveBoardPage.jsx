import { useState, useEffect, useCallback } from 'react';
import { getActiveRides, joinRide, editOffer, toggleOffer, deleteOffer } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

// Helper — true if value looks like a URL
const isUrl = (val) => /^https?:\/\//i.test(val?.trim());

// ---------- Inline Edit Form (appears on driver's own card) ----------
function EditForm({ ride, onSave, onCancel }) {
  const dep = ride.departureTime
    ? new Date(ride.departureTime).toTimeString().slice(0, 5)
    : '';

  const [form, setForm]     = useState({
    startLocationUrl: ride.startLocationUrl || '',
    endLocationUrl:   ride.endLocationUrl   || '',
    departureTime:    dep,
    availableSeats:   ride.availableSeats   ?? 1,
    isActive:         ride.status === 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const adjustSeats  = (d) => setForm((f) => ({ ...f, availableSeats: Math.max(1, Math.min(10, f.availableSeats + d)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const departureTime = form.departureTime ? `${today}T${form.departureTime}:00` : undefined;
      await editOffer(ride.id, { ...form, departureTime });
      onSave();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.message === 'ACTIVE_LIMIT_EXCEEDED') {
        window.alert('Make this inactive or make your existing ride inactive');
      } else {
        setError(err.response?.data?.message || 'Failed to save changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}
      className="mt-4 pt-4 border-t border-slate-300/60 space-y-4 animate-fade-in">

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Start */}
      <div>
        <label className="input-label">📍 Start Location</label>
        <input name="startLocationUrl" type="text" required
          placeholder="Paste Google Maps URL or type e.g. 'From Office'"
          value={form.startLocationUrl} onChange={handleChange} className="input-field" />
      </div>

      {/* End */}
      <div>
        <label className="input-label">🏁 End Location</label>
        <input name="endLocationUrl" type="text" required
          placeholder="Paste Google Maps URL"
          value={form.endLocationUrl} onChange={handleChange} className="input-field" />
      </div>

      {/* Time */}
      <div>
        <label className="input-label">🕐 Departure Time</label>
        <input name="departureTime" type="time"
          value={form.departureTime} onChange={handleChange} className="input-field" />
      </div>

      {/* Seats */}
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

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary px-4">Cancel</button>
      </div>
    </form>
  );
}

// ---------- Single Ride Card ----------
function RideCard({ ride: initialRide, onRefresh }) {
  const { user }  = useAuth();
  const [ride,    setRide]    = useState(initialRide);
  const [joining, setJoining] = useState(false);
  const [joined,  setJoined]  = useState(false);
  const [editing, setEditing] = useState(false);
  const [toggling,setToggling]= useState(false);
  const [joinErr, setJoinErr] = useState('');

  const isOwn = ride.driver?.email === user?.email;
  const isActive = ride.status === 'ACTIVE';

  const depStr = ride.departureTime
    ? new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';

  // ---- Toggle active/inactive on the card ----
  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleOffer(ride.id);
      setRide(res.data.data); // update card state immediately
      // If toggled to inactive, remove from board after short delay
      if (res.data.data.status === 'INACTIVE') {
        setTimeout(() => onRefresh(), 800);
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.message === 'ACTIVE_LIMIT_EXCEEDED') {
        window.alert('Make this inactive or make your existing ride inactive');
      }
    } finally { setToggling(false); }
  };

  // ---- Delete ride ----
  const handleDelete = async () => {
    if (window.confirm('once deleted , cannot be undone')) {
      try {
        await deleteOffer(ride.id);
        onRefresh();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete offer.');
      }
    }
  };

  // ---- Join ride ----
  const handleJoin = async () => {
    setJoinErr('');
    setJoining(true);
    try {
      await joinRide(ride.id, { pickupPoint: 'To be discussed' });
      // Update local state to reflect request sent
      setRide(prev => ({ ...prev, currentUserRequestStatus: 'PENDING' }));
    } catch (err) {
      setJoinErr(err.response?.data?.message || 'Could not join ride.');
    } finally { setJoining(false); }
  };

  // ---- Location display ----
  const LocationChip = ({ value, icon, label }) => {
    if (!value) return null;
    return isUrl(value) ? (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200
                   text-slate-700 hover:text-slate-900 text-xs font-medium transition-all duration-200
                   border border-slate-300">
        {icon} {label}
      </a>
    ) : (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/80
                       text-slate-500 text-xs font-medium border border-slate-200">
        {icon} {value}
      </span>
    );
  };

  return (
    <div className={`ride-card flex flex-col gap-4 transition-opacity duration-500 ${!isActive && isOwn ? 'opacity-60' : ''}`}>

      {/* ── Top row: driver info + owner controls ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Driver avatar + name */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-sm select-none shrink-0">
            {ride.driver?.firstName?.[0]}{ride.driver?.lastName?.[0]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 flex flex-wrap items-center gap-1">
              <span>{ride.driver?.firstName} {ride.driver?.lastName}</span>
              {isOwn && <span className="text-xs text-brand-400 font-normal">(you)</span>}
            </p>
            <a href={`tel:${ride.driver?.mobileNumber}`}
              className="text-xs text-slate-500 hover:text-brand-400 transition-colors">
              📞 {ride.driver?.mobileNumber}
            </a>
          </div>
        </div>

        {/* ── Toggle + Edit — only for driver's own card ── */}
        {isOwn && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
            {/* Status toggle */}
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                id={`toggle-${ride.id}`}
                type="button"
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

            {/* Edit button */}
            <button
              id={`edit-${ride.id}`}
              onClick={() => setEditing((v) => !v)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all duration-200
                ${editing
                  ? 'bg-brand-600/20 border-brand-500/40 text-brand-400'
                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400'}`}
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
        )}
      </div>

      {/* ── Time & Seats ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-sm text-slate-700">
          <span>🕐</span><span className="font-semibold">{depStr}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
          ${ride.availableSeats > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          <span>💺</span>
          <span>{ride.availableSeats} {ride.availableSeats === 1 ? 'seat' : 'seats'} left</span>
        </div>
      </div>

      {/* ── Location chips ── */}
      <div className="flex gap-2 flex-wrap">
        <LocationChip value={ride.startLocationUrl} icon="📍" label="View Start Location" />
        <LocationChip value={ride.endLocationUrl}   icon="🏁" label="View Destination" />
      </div>

      {/* ── Join error ── */}
      {joinErr && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
          {joinErr}
        </p>
      )}

      {/* ── Passenger action ── */}
      {!isOwn && (
        <div className="flex items-center">
          {ride.currentUserRequestStatus === 'PENDING' ? (
            <div className="px-4 py-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-sm font-semibold flex items-center gap-2">
              <span>⏳</span> Awaiting Confirmation
            </div>
          ) : ride.currentUserRequestStatus === 'ACCEPTED' ? (
            <div className="px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-sm font-semibold flex items-center gap-2">
              <span>✅</span> Ride Confirmed
            </div>
          ) : ride.currentUserRequestStatus === 'REJECTED' ? (
            <div className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg text-sm font-semibold flex items-center gap-2">
              <span>❌</span> Declined
            </div>
          ) : (
            <button id={`join-${ride.id}`} onClick={handleJoin}
              disabled={joining || ride.availableSeats <= 0} className="btn-primary self-start">
              {joining ? 'Requesting…' : ride.availableSeats > 0 ? 'Request to Join' : 'Fully Booked'}
            </button>
          )}
        </div>
      )}

      {/* ── Inline edit form (driver only, expandable) ── */}
      {isOwn && editing && (
        <EditForm
          ride={ride}
          onSave={() => { setEditing(false); onRefresh(); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ---------- Live Board Page ----------
export default function LiveBoardPage() {
  const [rides,   setRides]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchRides = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getActiveRides();
      setRides(res.data.data || []);
    } catch {
      setError('Failed to load rides. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRides();

    const handleRefresh = () => fetchRides();
    window.addEventListener('REFRESH_DATA', handleRefresh);
    return () => window.removeEventListener('REFRESH_DATA', handleRefresh);
  }, [fetchRides]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Board</h1>
          <p className="text-slate-500 text-sm mt-1">Active rides available right now</p>
        </div>
        <button id="refresh-board" onClick={fetchRides} className="btn-secondary text-xs px-3 py-1.5">
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20 text-slate-500">
          <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading rides…
        </div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {!loading && !error && rides.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🚗</div>
          <p className="text-slate-500 font-medium">No active rides right now</p>
          <p className="text-slate-600 text-sm mt-1">Be the first to offer a ride!</p>
        </div>
      )}

      {!loading && !error && rides.length > 0 && (
        <div className="space-y-4">
          {rides.map((ride) => (
            <RideCard key={ride.id} ride={ride} onRefresh={fetchRides} />
          ))}
        </div>
      )}
    </div>
  );
}
