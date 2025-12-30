import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setApiError('');

    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/auth/forgot-password`, { email });
      setIsSuccess(true);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to send email. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setEmail('');
    setApiError('');
    setValidationError('');
  };

  return (
    // FIX 1: Main Background Gradient
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-8 font-sans transition-colors duration-200">
      <div className="w-full max-w-md">
        
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group">
            {/* FIX 2: Brand Text Color */}
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 bg-clip-text hover:from-orange-700 hover:to-amber-700 transition-all duration-300">
               Campus<span className="text-gray-800 dark:text-white">Mart</span>
            </h1>
          </Link>
        </div>

        {/* Main Card */}
        {/* FIX 3: Card Background & Border */}
        <div className="bg-white/80 dark:bg-gray-800 backdrop-blur-sm rounded-xl shadow-2xl border border-white dark:border-gray-700 p-8 hover:shadow-3xl transition-all duration-300">
          
          {/* Header */}
          <div className="space-y-3 pb-6">
            {/* FIX 4: Icon Circle Background */}
            <div className="mx-auto w-14 h-14 bg-[#e1e1e2] dark:bg-gray-700 rounded-full flex items-center justify-center mb-2 transition-colors">
              <Mail className="w-7 h-7 text-gray-700 dark:text-gray-200" />
            </div>
            {/* FIX 5: Headings */}
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              {isSuccess ? 'Check Your Email' : 'Forgot Password?'}
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 text-base">
              {isSuccess
                ? `We've sent a password reset link to ${email}`
                : "No worries! Enter your email and we'll send you reset instructions."}
            </p>
          </div>

          <div className="space-y-6">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* API Error Alert */}
                {apiError && (
                   // FIX 6: Error Alert Colors
                   <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                     <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                     <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                   </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                    {/* FIX 7: Input Fields */}
                    <input
                      id="email"
                      type="email"
                      placeholder="you@mnnit.ac.in"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setValidationError('');
                      }}
                      disabled={isLoading}
                      className={`w-full pl-10 pr-4 h-12 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base transition-all duration-200 outline-none placeholder-gray-400 dark:placeholder-gray-500
                        ${validationError || apiError
                          ? 'border-red-500 dark:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900'
                          : 'border-gray-200 dark:border-gray-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900'
                        }`}
                    />
                  </div>
                  {validationError && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      {validationError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-lg text-base font-semibold bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                {/* FIX 8: Success Alert Colors */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-300">
                      Password reset link sent
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      If you don't see the email, check your spam folder.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTryAgain}
                  // FIX 9: Secondary Button Colors
                  className="w-full h-12 rounded-lg text-base font-semibold border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-700 hover:border-orange-300 dark:hover:border-gray-500 transition-all duration-300"
                >
                  Try Another Email
                </button>
              </div>
            )}

            {/* Back to Login Link */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-6">
          Need more help?{' '}
         <Link
  to="/contact"
  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium hover:underline transition-colors"
>
  Contact Support
</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;