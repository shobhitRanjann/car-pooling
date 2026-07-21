import { useState, useEffect, useCallback } from 'react';
import { getAllConfigs, saveConfig, uploadLogo, getAllUsers, toggleUserStatus } from '../api/endpoints';
import { API_BASE_URL } from '../api/axios';

export default function SuperAdminPage() {
  const [configs, setConfigs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ domain: '', maxUsers: 10, logoFilename: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await getAllConfigs();
      setConfigs(res.data.data || []);
    } catch (err) {
      setError('Failed to fetch configs: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data.data || []);
    } catch (err) {
      setError('Failed to fetch users: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
    fetchUsers();
  }, [fetchConfigs, fetchUsers]);

  const handleEdit = (config) => {
    setEditingId(config.id);
    setForm({ domain: config.domain, maxUsers: config.maxUsers, logoFilename: config.logoFilename });
    setSelectedFile(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ domain: '', maxUsers: 10, logoFilename: '' });
    setSelectedFile(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save domain/maxUsers
      await saveConfig(form);
      
      // If file selected, upload it
      if (selectedFile) {
        await uploadLogo(form.domain, selectedFile);
      }
      
      handleCancel();
      fetchConfigs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = async (email) => {
    try {
      await toggleUserStatus(email);
      fetchUsers(); // refresh the list
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle user status');
    }
  };

  if (loadingConfigs || loadingUsers) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Manage tenant configurations and branding.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Edit / Create Form */}
      <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {editingId ? 'Edit Configuration' : 'Add New Configuration'}
        </h2>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="input-label">Domain Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. watermark.com"
              value={form.domain}
              onChange={e => setForm({...form, domain: e.target.value})}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Max Whitelisted Users</label>
            <input 
              type="number" 
              required
              min="1"
              value={form.maxUsers}
              onChange={e => setForm({...form, maxUsers: parseInt(e.target.value, 10)})}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="input-label">Company Logo</label>
            {editingId && form.logoFilename && (
              <div className="mb-4 flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <img src={`${API_BASE_URL}/api/public/logos/${form.logoFilename}`} alt="Current Logo" className="h-10 object-contain" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">Current Logo ({form.logoFilename})</span>
                  <a 
                    href={`${API_BASE_URL}/api/public/logos/${form.logoFilename}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline mt-0.5"
                  >
                    View / Download Original
                  </a>
                </div>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={e => setSelectedFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition-all"
            />
            <p className="text-xs text-slate-400 mt-2">
              Uploading a new file will overwrite the existing logo. WebP and SVG files are preserved in their original quality.
            </p>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
            {editingId && (
              <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
            )}
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* Configs List */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Active Tenants</h2>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Max Users</th>
                <th className="px-6 py-4">Logo</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {configs.map(config => (
                <tr key={config.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{config.domain}</td>
                  <td className="px-6 py-4">{config.maxUsers}</td>
                  <td className="px-6 py-4">
                    {config.logoFilename ? (
                      <img src={`${API_BASE_URL}/api/public/logos/${config.logoFilename}`} alt="logo" className="h-8 object-contain" />
                    ) : (
                      <span className="text-slate-400 italic">No logo</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(config)} className="text-brand-600 hover:text-brand-700 font-medium">Edit</button>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No tenants configured yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List */}
      <h2 className="text-lg font-semibold text-slate-800 mt-12 mb-4">User Whitelist & Signups</h2>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.email}</td>
                  <td className="px-6 py-4">
                    {user.isDeleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Suspended / Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleToggleUser(user.email)} 
                      className={`font-medium ${user.isDeleted ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-600 hover:text-red-700'}`}
                    >
                      {user.isDeleted ? 'Approve / Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
