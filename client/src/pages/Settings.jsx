import React, { useState } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaExclamationTriangle, FaTrashAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Settings = () => {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return setMessage({ type: 'error', text: 'New passwords do not match' });
    }
    setLoading(true);
    try {
      await API.put('/users/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you absolutely sure? This will delete your account and all your active listings permanently.");
    if (!confirmed) return;

    try {
      await API.delete('/users/delete-account');
      localStorage.clear(); // Clear token and user data
      toast.success("Account deleted.");
      navigate('/login');
    } catch (err) {
      toast.error("Could not delete account. Try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-surface-2">
      <Navbar />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-black text-foreground mb-8">Settings</h1>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl font-bold ${message.type === 'success' ? 'bg-success-muted text-success' : 'bg-danger-muted text-danger'}`}>
            {message.text}
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-muted text-primary rounded-lg"><FaLock /></div>
            <h2 className="text-xl font-bold">Security</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-muted uppercase">Current Password</label>
              <input 
                type="password" required 
                value={passwords.current} 
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                className="mt-1 block w-full border-border rounded-xl py-3 focus:ring-primary" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-muted uppercase">New Password</label>
                <input 
                  type="password" required 
                  value={passwords.new} 
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  className="mt-1 block w-full border-border rounded-xl py-3 focus:ring-primary" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-muted uppercase">Confirm New Password</label>
                <input 
                  type="password" required 
                  value={passwords.confirm} 
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="mt-1 block w-full border-border rounded-xl py-3 focus:ring-primary" 
                />
              </div>
            </div>
            <button 
              disabled={loading}
              className="mt-4 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary transition disabled:bg-surface-muted"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone Card */}
        <div className="bg-danger-muted rounded-2xl border border-danger p-8">
          <div className="flex items-center gap-3 mb-4 text-danger">
            <FaExclamationTriangle />
            <h2 className="text-xl font-bold">Danger Zone</h2>
          </div>
          <p className="text-sm text-danger mb-6">
            Once you delete your account, there is no going back. All your listings will be removed from CampusMart instantly.
          </p>
          <button 
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 bg-danger text-white px-6 py-3 rounded-xl font-bold hover:bg-danger transition"
          >
            <FaTrashAlt /> Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;