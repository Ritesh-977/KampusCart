import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaStore } from "react-icons/fa";
import API from '../api/axios'; // ✅ Using configured Axios instance
import { toast } from 'react-toastify';
import { colleges } from '../data/colleges';
import { useGoogleLogin } from '@react-oauth/google';

// --- IMPORTS FOR PARTICLES ---
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; 

// --- IMPORT THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext'; 
import { subscribeUserToPush } from '../utils/pushSubscription';

const Auth = () => {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const { theme } = useTheme(); 

  // --- PARTICLE INIT ---
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  // --- REDIRECT IF ALREADY LOGGED IN ---
  useEffect(() => {
    // ✅ FIX 1: Check for 'user' object, not 'token'
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  const galaxyConfig = useMemo(() => ({
    fullScreen: { enable: false },
    particles: {
      number: { value: 160, density: { enable: true, area: 800 } },
      color: { value: theme === 'dark' ? "#ffffff" : "#4f46e5" },
      shape: { type: "circle" },
      opacity: { value: { min: 0.1, max: 1 }, animation: { enable: true, speed: 1, sync: false } },
      size: { value: { min: 0.1, max: 2 } },
      move: { enable: true, speed: 0.4, direction: "none", random: true, straight: false, outModes: "out" },
      links: { enable: true, distance: 100, color: theme === 'dark' ? "#ffffff" : "#4f46e5", opacity: 0.1, width: 1 },
    },
    interactivity: {
      events: { onHover: { enable: true, mode: "grab" }, onClick: { enable: true, mode: "push" } },
      modes: { grab: { distance: 140, links: { opacity: 0.5 } }, push: { quantity: 4 } },
    },
    detectRetina: true,
    background: { color: "transparent" },
  }), [theme]); 

  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [signupCollege, setSignupCollege] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- GOOGLE SIGNUP STATES ---
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [modalCollege, setModalCollege] = useState(null);
  const [pendingGoogleLogin, setPendingGoogleLogin] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // --- GOOGLE SIGNUP HOOK (signup tab — filtered by campus domain) ---
  // Re-configured on every render so hosted_domain always reflects current signupCollege
  const googleSignupHook = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const response = await API.post('/auth/google-signup', {
          access_token: tokenResponse.access_token,
          emailDomain: signupCollege?.emailDomain,
        });
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Account created with Google!');
        navigate('/');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Google sign-up failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google sign-up was cancelled or failed.');
    },
    hosted_domain: signupCollege?.emailDomain || undefined,
  });

  // --- GOOGLE LOGIN HOOK (login tab — no domain filter) ---
  const googleSigninHook = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const response = await API.post('/auth/google-login', {
          access_token: tokenResponse.access_token,
        });
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Signed in with Google successfully!');
        navigate('/');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google sign-in was cancelled or failed.');
    },
  });

  // Ref so the useEffect can always call the latest version of googleSignupHook
  const googleSignupRef = useRef(googleSignupHook);
  useEffect(() => { googleSignupRef.current = googleSignupHook; });

  // Trigger Google signup after college is set from the modal (state has settled)
  useEffect(() => {
    if (pendingGoogleLogin && signupCollege) {
      setPendingGoogleLogin(false);
      googleSignupRef.current();
    }
  }, [pendingGoogleLogin, signupCollege]);

  const handleGoogleSignupClick = () => {
    if (!signupCollege) {
      setIsCampusModalOpen(true);
    } else {
      googleSignupHook();
    }
  };

  const handleModalConfirm = () => {
    if (!modalCollege) {
      toast.error('Please select a college to continue.');
      return;
    }
    setSignupCollege(modalCollege);
    setPendingGoogleLogin(true);
    setIsCampusModalOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateEmail = (email) => {
    if (!signupCollege?.emailDomain) {
      // No specific domain — just check it's a valid email format
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    const escapedDomain = signupCollege.emailDomain.replace(/\./g, '\\.');
    return new RegExp(`^[a-zA-Z0-9._%+\\-]+@${escapedDomain}$`, 'i').test(email);
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      // ✅ FIX 2: Use relative path (BaseURL is in axios.js)
      await API.post('/auth/resend-otp', {
        email: formData.email
      });
      toast.success("New code sent! Check your email.");
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // ✅ FIX 3: Login Logic using API instance
        const response = await API.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });

        // Store user info (Cookie handles the token automatically)
        localStorage.setItem('user', JSON.stringify(response.data.user));

        setLoading(false);
        toast.success('Logged in successfully!');

      const currentUserId = response.data.user.id; 

      if (!currentUserId) {
          console.error("CRITICAL: The user ID is missing from the login response!");
      } else {
          try {
              await subscribeUserToPush(currentUserId);
          } catch (err) {
              console.log("Push subscription skipped or denied.");
          }
      }


        navigate('/'); 
      }

      else if (signupStep === 1) {
        if (!signupCollege) {
          setError('Please select your college.');
          setLoading(false);
          return;
        }
        if (!validateEmail(formData.email)) {
          const domainHint = signupCollege.emailDomain ? `@${signupCollege.emailDomain}` : 'your college email';
          setError(`Please use your ${signupCollege.name} institutional email (${domainHint}).`);
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        // ✅ FIX 4: Register Logic
        await API.post('/auth/register', {
          name: formData.fullName,
          email: formData.email,
          password: formData.password
        });

        toast.success('OTP sent successfully!');
        setLoading(false);
        setSignupStep(2); 
      }

      else if (signupStep === 2) {
        // ✅ FIX 5: Verify Logic
        await API.post('/auth/verify-otp', {
          email: formData.email,
          otp: formData.otp
        });

        toast.success('Account created successfully!');
        setIsLogin(true); 
        setSignupStep(1);
        setLoading(false);
      }

    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 relative overflow-x-hidden">
      
      {init && (
        <div className="fixed inset-0 z-0">
            <Particles
            id="tsparticles"
            options={galaxyConfig}
            className="h-full w-full"
            />
        </div>
      )}

      <div className="relative z-10 flex flex-col min-h-screen pt-24 pb-12 sm:px-6 lg:px-8 md:justify-center md:pt-0">
        
        {/* Logo */}
        <div className="absolute top-6 left-6">
            <Link to="/" className="flex items-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            <FaStore className="h-8 w-8 mr-2" />
            <span className="text-gray-800 dark:text-white">kampus<span className="text-indigo-600 dark:text-indigo-400">Cart</span></span>
            </Link>
        </div>

        {/* Header */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Access the secure campus buy & sell goods
            </p>
        </div>

        {/* Form Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
            <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-transparent dark:border-gray-700 transition-colors">

            <form className="space-y-6" onSubmit={handleSubmit}>

                {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-2 rounded text-sm">
                    {error}
                </div>
                )}

                {!isLogin && signupStep === 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                    <div className="mt-1">
                    <input
                        name="fullName"
                        type="text"
                        required
                        placeholder="Your full name"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    </div>
                </div>
                )}

                {!isLogin && signupStep === 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your College</label>
                    <div className="mt-1">
                    <select
                        value={signupCollege?.id || ''}
                        onChange={(e) => {
                          const found = colleges.find(c => c.id === e.target.value);
                          setSignupCollege(found || null);
                          setError('');
                        }}
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    >
                        <option value="">— Select your college —</option>
                        {colleges.filter(c => c.id !== 'other').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    </div>
                    {signupCollege?.emailDomain && (
                      <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                        Use your institutional email ending with <strong>@{signupCollege.emailDomain}</strong>
                      </p>
                    )}
                </div>
                )}

                {signupStep === 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    College Email
                    </label>
                    <div className="mt-1">
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder={!isLogin && signupCollege?.emailDomain ? `yourname@${signupCollege.emailDomain}` : 'your.email@college.ac.in'}
                        value={formData.email}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    </div>
                </div>
                )}

                {(isLogin || signupStep === 1) && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                    </label>
                    <div className="mt-1 relative">
                    <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={!isLogin ? "Create a strong password" : undefined}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    {formData.password && (
                        <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    )}
                    </div>
                    {isLogin && (
                        <div className="flex items-center justify-end mt-1">
                            <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                                Forgot your password?
                            </Link>
                        </div>
                    )}
                </div>
                )}

                {!isLogin && signupStep === 1 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                    <div className="mt-1">
                    <input
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    </div>
                </div>
                )}

                {!isLogin && signupStep === 2 && (
                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    We sent a code to <b className="text-gray-900 dark:text-white">{formData.email}</b>
                    </p>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left">Verification Code</label>
                    <div className="mt-1">
                    <input
                        name="otp"
                        type="text"
                        maxLength="6"
                        placeholder="123456"
                        required
                        value={formData.otp}
                        onChange={handleChange}
                        className="text-center text-2xl tracking-widest appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                    </div>
                    
                    <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Didn't receive the code?{' '}
                        <button
                        type="button"
                        onClick={handleResendOtp}
                        className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline"
                        >
                        Resend Code
                        </button>
                    </p>
                    </div>
                </div>
                )}

                {!isLogin && signupStep === 1 && (
                <div className="flex items-start gap-2 mt-4">
                    <input
                    id="terms"
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-1 h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:bg-gray-700"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the{" "}
                    <Link to="/terms" className="text-green-600 dark:text-green-400 hover:underline font-medium">Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-green-600 dark:text-green-400 hover:underline font-medium">Privacy Policy</Link>
                    </label>
                </div>
                )}

                <div>
                <button
                    type="submit"
                    disabled={loading || (!isLogin && !agree && signupStep === 1)}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                    ${loading || (!isLogin && !agree && signupStep === 1)
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors`}
                >
                    {loading
                    ? 'Processing...'
                    : isLogin
                        ? 'Sign in'
                        : signupStep === 1
                        ? 'Get Verification Code'
                        : 'Verify & Create Account'
                    }
                </button>
                </div>

            </form>

            {/* Google Sign-in — only visible on login tab */}
            {isLogin && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      — OR —
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => googleSigninHook()}
                  disabled={googleLoading}
                  className="mt-4 w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>
            )}

            {/* Google Sign-up — only visible on signup step 1 */}
            {!isLogin && signupStep === 1 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      — OR —
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignupClick}
                  disabled={googleLoading}
                  className="mt-4 w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </button>
              </div>
            )}

            <div className="mt-6">
                <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {isLogin ? "New in this app?" : "Already have an account?"}
                    </span>
                </div>
                </div>

                <div className="mt-6">
                <button
                    onClick={() => {
                    setIsLogin(!isLogin);
                    setSignupStep(1);
                    setError('');
                    setSignupCollege(null);
                    }}
                    className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-[#5dbd62] hover:bg-[#51a956] dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-medium transition-colors"
                >
                    {isLogin ? 'Create an account' : 'Sign in instead'}
                </button>
                </div>
            </div>

            </div>
        </div>
      </div>

      {/* Campus Selection Modal */}
      {isCampusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCampusModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-1">Select Your Campus</h3>
            <p className="text-sm text-gray-400 mb-5">
              We need to verify your campus before connecting with Google.
            </p>

            <label className="block text-sm font-medium text-gray-300 mb-1">Your College</label>
            <select
              value={modalCollege?.id || ''}
              onChange={(e) => {
                const found = colleges.find(c => c.id === e.target.value);
                setModalCollege(found || null);
              }}
              className="w-full px-3 py-2.5 border border-gray-600 rounded-md bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="">— Select your college —</option>
              {colleges.filter(c => c.id !== 'other').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {modalCollege?.emailDomain && (
              <p className="mt-2 text-xs text-indigo-400">
                Google will filter accounts ending with <strong>@{modalCollege.emailDomain}</strong>
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setIsCampusModalOpen(false); setModalCollege(null); }}
                className="flex-1 py-2 px-4 border border-gray-600 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalConfirm}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-medium text-white transition-colors"
              >
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;