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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Settings</h1>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><FaLock /></div>
            <h2 className="text-xl font-bold">Security</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 uppercase">Current Password</label>
              <input 
                type="password" required 
                value={passwords.current} 
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                className="mt-1 block w-full border-gray-200 rounded-xl py-3 focus:ring-indigo-500" 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 uppercase">New Password</label>
                <input 
                  type="password" required 
                  value={passwords.new} 
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  className="mt-1 block w-full border-gray-200 rounded-xl py-3 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-600 uppercase">Confirm New Password</label>
                <input 
                  type="password" required 
                  value={passwords.confirm} 
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  className="mt-1 block w-full border-gray-200 rounded-xl py-3 focus:ring-indigo-500" 
                />
              </div>
            </div>
            <button 
              disabled={loading}
              className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone Card */}
        <div className="bg-red-50 rounded-2xl border border-red-100 p-8">
          <div className="flex items-center gap-3 mb-4 text-red-700">
            <FaExclamationTriangle />
            <h2 className="text-xl font-bold">Danger Zone</h2>
          </div>
          <p className="text-sm text-red-600 mb-6">
            Once you delete your account, there is no going back. All your listings will be removed from CampusMart instantly.
          </p>
          <button 
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition"
          >
            <FaTrashAlt /> Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;