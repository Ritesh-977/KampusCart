import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const { resetToken } = useParams(); // Get token from URL
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    setError('');

    try {
      // Note: The endpoint includes the token in the URL
      await axios.put(`${import.meta.env.VITE_SERVER_URL}/api/auth/reset-password/${resetToken}`, {
        password
      });

      setMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-surface-muted flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Set New Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* FIX 2: Card Background & Border */}
        <div className="bg-surface py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-border-strong transition-colors">
          
          {message && (
            // FIX 3: Success Alert (Dark Mode)
            <div className="mb-4 bg-success-muted border border-success text-success px-4 py-3 rounded">
              {message}
            </div>
          )}
          
          {error && (
            // FIX 4: Error Alert (Dark Mode)
            <div className="mb-4 bg-danger-muted border border-danger text-danger px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground">New Password</label>
              {/* FIX 5: Input Field */}
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-border-strong rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-surface text-foreground transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Confirm Password</label>
              {/* FIX 6: Input Field */}
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-border-strong rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-surface text-foreground transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors
                ${loading 
                    ? 'bg-primary cursor-not-allowed' 
                    : 'bg-primary hover:bg-primary bg-primary dark:hover:bg-primary'}`}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;