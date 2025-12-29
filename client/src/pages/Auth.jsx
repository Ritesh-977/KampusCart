import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaStore } from "react-icons/fa";
import axios from 'axios';
import { toast } from 'react-toastify';

const Auth = () => {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

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
      await axios.post('http://localhost:5000/api/auth/resend-otp', {
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

    const API_URL = 'http://localhost:5000/api/auth'; 

    try {
      if (isLogin) {
        const response = await axios.post(`${API_URL}/login`, {
          email: formData.email,
          password: formData.password
        });

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        setLoading(false);
        toast.success('Logged in successfully!');
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

        await axios.post(`${API_URL}/register`, {
          name: formData.fullName,
          email: formData.email,
          password: formData.password
        });

        toast.success('OTP sent successfully!');
        setLoading(false);
        setSignupStep(2); 
      }

      else if (signupStep === 2) {
        await axios.post(`${API_URL}/verify-otp`, {
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
    // FIX 1: Main Background
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      
      <div className="absolute top-6 left-6">
         <Link to="/" className="flex items-center text-2xl font-bold text-indigo-600 dark:text-indigo-400">
           <FaStore className="h-8 w-8 mr-2" />
           <span className="text-gray-800 dark:text-white">Campus<span className="text-indigo-600 dark:text-indigo-400">Mart</span></span>
         </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Access the secure campus buy & sell goods
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* FIX 2: Card Background & Border */}
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-transparent dark:border-gray-700 transition-colors">

          <form className="space-y-6" onSubmit={handleSubmit}>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {/* --- SIGNUP ONLY: Full Name --- */}
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

            {/* --- BOTH: Email Address --- */}
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

            {/* --- BOTH: Password --- */}
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

            {/* --- SIGNUP ONLY: Confirm Password --- */}
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

            {/* --- SIGNUP OTP STEP --- */}
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

            {/* --- SUBMIT BUTTON --- */}
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

          {/* --- TOGGLE LOGIN / SIGNUP --- */}
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
  );
};

export default Auth;