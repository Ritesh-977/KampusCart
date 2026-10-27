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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warning-muted via-white to-warning-muted    px-4 py-8 font-sans transition-colors duration-200">
      <div className="w-full max-w-md">
        
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block group">
            {/* FIX 2: Brand Text Color */}
             <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight">
              <img
                src="/logo.png"
                alt="KampusCart Logo"
                className="h-10 w-10 sm:h-12 sm:w-12 mr-0.5 sm:mr-1 object-contain"
              />

              <span className="bg-gradient-to-r from-tertiary to-info bg-clip-text text-transparent">
                kampusCart
              </span>
            </div>
          </Link>
        </div>

        {/* Main Card */}
        {/* FIX 3: Card Background & Border */}
        <div className="bg-surface backdrop-blur-sm rounded-xl shadow-2xl border border-border-strong p-8 hover:shadow-3xl transition-all duration-300">
          
          {/* Header */}
          <div className="space-y-3 pb-6">
            {/* FIX 4: Icon Circle Background */}
            <div className="mx-auto w-14 h-14 bg-surface-muted rounded-full flex items-center justify-center mb-2 transition-colors">
              <Mail className="w-7 h-7 text-foreground" />
            </div>
            {/* FIX 5: Headings */}
            <h2 className="text-2xl font-bold text-center text-foreground">
              {isSuccess ? 'Check Your Email' : 'Forgot Password?'}
            </h2>
            <p className="text-center text-muted text-base">
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
                   <div className="bg-danger-muted border border-danger rounded-lg p-4 flex items-start gap-3">
                     <AlertCircle className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
                     <p className="text-sm text-danger">{apiError}</p>
                   </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-subtle" />
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
                      className={`w-full pl-10 pr-4 h-12 rounded-lg border bg-surface text-foreground text-base transition-all duration-200 outline-none placeholder-subtle
                        ${validationError || apiError
                          ? 'border-danger focus:ring-2 focus:ring-danger dark:focus:ring-danger'
                          : 'border-border focus:border-warning focus:ring-2 focus:ring-warning dark:focus:ring-warning'
                        }`}
                    />
                  </div>
                  {validationError && (
                    <p className="text-sm text-danger flex items-center gap-1">
                      {validationError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-lg text-base font-semibold bg-primary hover:bg-primary dark:hover:bg-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
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
                <div className="bg-success-muted border border-success rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-success">
                      Password reset link sent
                    </p>
                    <p className="text-sm text-success">
                      If you don't see the email, check your spam folder.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTryAgain}
                  // FIX 9: Secondary Button Colors
                  className="w-full h-12 rounded-lg text-base font-semibold border-2 border-border text-foreground hover:bg-warning-muted dark:hover:bg-surface-muted hover:border-warning dark:hover:border-border-strong transition-all duration-300"
                >
                  Try Another Email
                </button>
              </div>
            )}

            {/* Back to Login Link */}
            <div className="pt-4 border-t border-border">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-warning dark:hover:text-warning transition-colors duration-200 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-muted mt-6">
          Need more help?{' '}
         <Link
  to="/contact"
  className="text-warning hover:text-warning dark:hover:text-warning font-medium hover:underline transition-colors"
>
  Contact Support
</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;