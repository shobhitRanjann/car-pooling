import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOffer } from '../api/endpoints';

export default function OfferRidePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    startLocationUrl: '',
    endLocationUrl: '',
    departureTime: '',
    availableSeats: 3,
    isActive: true,
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const adjustSeats = (delta) =>
    setForm((f) => ({ ...f, availableSeats: Math.max(1, Math.min(10, f.availableSeats + delta)) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Convert HTML time "HH:mm" → ISO datetime (today's date + chosen time)
      const today = new Date().toISOString().split('T')[0];
      const departureTime = `${today}T${form.departureTime}:00`;
      await createOffer({ ...form, departureTime });
      navigate('/board');
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.message === 'ACTIVE_LIMIT_EXCEEDED') {
        window.alert('Make this inactive or make your existing ride inactive');
      } else {
        setError(err.response?.data?.message || 'Failed to publish ride. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Offer a Ride</h1>
        <p className="text-slate-500 text-sm mt-1">
          Paste your Google Maps links and set your seats — done in 30 seconds.
        </p>
      </div>

      <div className="glass-card p-6">
        {error && (
          <div className="flex items-start gap-2.5 p-3 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <span className="mt-0.5">⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Start Location */}
          <div>
            <label className="input-label">📍 Start Location</label>
            <input
              id="offer-start"
              name="startLocationUrl"
              type="text"
              required
              placeholder="Paste Google Maps URL or type e.g. 'From Office'"
              value={form.startLocationUrl}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* End Location */}
          <div>
            <label className="input-label">🏁 End Location</label>
            <input
              id="offer-end"
              name="endLocationUrl"
              type="url"
              required
              placeholder="Paste Google Maps URL"
              value={form.endLocationUrl}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* Departure Time */}
          <div>
            <label className="input-label">🕐 Departure Time</label>
            <input
              id="offer-time"
              name="departureTime"
              type="time"
              required
              value={form.departureTime}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* Seat Counter */}
          <div>
            <label className="input-label">💺 Available Seats</label>
            <div className="flex items-center gap-4 mt-1">
              <button
                type="button"
                id="seats-decrement"
                onClick={() => adjustSeats(-1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300
                           flex items-center justify-center text-xl text-slate-700
                           transition-all duration-150 active:scale-95"
              >
                −
              </button>
              <span className="text-3xl font-bold text-slate-900 w-8 text-center tabular-nums">
                {form.availableSeats}
              </span>
              <button
                type="button"
                id="seats-increment"
                onClick={() => adjustSeats(1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300
                           flex items-center justify-center text-xl text-slate-700
                           transition-all duration-150 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Status Toggle */}
          <div>
            <label className="input-label">Status</label>
            <button
              type="button"
              id="status-toggle"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                form.isActive ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md
                            transition-transform duration-300 ${form.isActive ? 'translate-x-8' : 'translate-x-1'}`}
              />
            </button>
            <span className={`ml-3 text-sm font-semibold ${form.isActive ? 'text-brand-400' : 'text-slate-500'}`}>
              {form.isActive ? 'Active — visible on Live Board' : 'Inactive — hidden from board'}
            </span>
          </div>

          {/* Submit */}
          <button
            id="offer-publish"
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-base py-3 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Publishing…
              </span>
            ) : '🚗 Publish Ride'}
          </button>
        </form>
      </div>
    </div>
  );
}
