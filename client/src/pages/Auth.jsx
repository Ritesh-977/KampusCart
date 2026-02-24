import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaStore } from "react-icons/fa";
import API from '../api/axios'; // ✅ Using configured Axios instance
import { toast } from 'react-toastify';

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

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateEmail = (email) => {
    const collegeRegex = /^[a-zA-Z0-9._%+-]+@mnnit\.ac\.in$/;
    return collegeRegex.test(email);
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
        if (!validateEmail(formData.email)) {
          setError('Only @mnnit.ac.in emails are allowed.');
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
                        placeholder="name.regNo@mnnit.ac.in"
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
    </div>
  );
};

export default Auth;