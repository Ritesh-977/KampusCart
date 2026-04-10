import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

const HeroSection = () => {
  const navigate = useNavigate();
  const [activeItemsCount, setActiveItemsCount] = useState(1);
  const [targetItemsCount, setTargetItemsCount] = useState(1);
  const [usersCount, setUsersCount] = useState(1);
  const [targetUsersCount, setTargetUsersCount] = useState(1);

  const handleStartBrowsing = () => {
    navigate('/browse');
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const { data } = await API.get('/users/counts');
        setTargetItemsCount(Math.max(1, data.itemsCount || 1));
        setTargetUsersCount(Math.max(1, data.usersCount || 1));
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    fetchCounts();
  }, []);

  useEffect(() => {
    if (targetItemsCount <= 1) {
      setActiveItemsCount(targetItemsCount);
      return;
    }

    const duration = 800;
    const steps = 60;
    const increment = Math.max(1, Math.ceil((targetItemsCount - 1) / steps));
    let current = 1;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetItemsCount) {
        setActiveItemsCount(targetItemsCount);
        clearInterval(timer);
      } else {
        setActiveItemsCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [targetItemsCount]);

  useEffect(() => {
    if (targetUsersCount <= 1) {
      setUsersCount(targetUsersCount);
      return;
    }

    const duration = 800;
    const steps = 60;
    const increment = Math.max(1, Math.ceil((targetUsersCount - 1) / steps));
    let current = 1;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetUsersCount) {
        setUsersCount(targetUsersCount);
        clearInterval(timer);
      } else {
        setUsersCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [targetUsersCount]);

  return (
    // Dark Navy/Slate with Cyan Accents
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden min-h-[500px] lg:h-[550px] flex items-center transition-colors duration-300">

      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        {/* Floating Blob 1 - Cyan */}
        <div className="absolute -top-[30%] -right-[10%] w-[500px] h-[500px] bg-cyan-500 dark:bg-cyan-400 rounded-full blur-3xl opacity-20 dark:opacity-10 float-animation"></div>

        {/* Floating Blob 2 - Teal */}
        <div className="absolute top-[20%] -left-[20%] w-[400px] h-[400px] bg-teal-500 dark:bg-teal-400 rounded-full blur-3xl opacity-15 dark:opacity-10 float-animation" style={{ animationDelay: '1s' }}></div>

        {/* Animated Geometric Shapes */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 border-2 border-cyan-500/20 rounded-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 border border-teal-500/15 rounded-full animate-pulse" style={{ animationDuration: '4s' }}></div>

        {/* Animated Lines */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="url(#lineGrad)" strokeWidth="2" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="url(#lineGrad)" strokeWidth="2" />
          </svg>
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent dark:from-white/3 dark:to-transparent"></div>
      </div>

      <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* --- LEFT SIDE: CONTENT --- */}
          <div className="text-center lg:text-left mb-8 lg:mb-0 py-8 lg:py-0 z-20 relative">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-4 slide-in-blur">
              Your Campus <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 drop-shadow-lg">
                Marketplace
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 dark:text-slate-300 mb-8 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed slide-in-blur" style={{ '--animation-delay': '0.2s' }}>
              Buy, sell, and find everything you need for college life right here within your campus community.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start slide-in-blur" style={{ '--animation-delay': '0.4s' }}>
              <button
                onClick={handleStartBrowsing}
                className="px-8 py-3.5 bg-white dark:bg-white text-slate-900 dark:text-slate-900 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-110 transition-all transform duration-300 text-base sm:text-lg relative overflow-hidden group"
              >
                <span className="relative z-10">Start Browsing</span>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              <Link
                to="/sell"
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 dark:from-cyan-500 dark:to-teal-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:scale-110 transition-all transform duration-300 flex items-center justify-center text-base sm:text-lg border border-cyan-400/30 group"
              >
                <span className="relative z-10">Sell an Item</span>
              </Link>
            </div>

            {/* Stats */}
            {/* <div className="grid grid-cols-3 gap-4 mt-12 lg:mt-8 max-w-sm mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <p className="text-2xl font-bold text-cyan-400">{activeItemsCount >= targetItemsCount ? `${activeItemsCount}+` : activeItemsCount}</p>
                <p className="text-xs text-gray-400">Active Items</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl font-bold text-teal-400">{usersCount >= targetUsersCount ? `${usersCount}+` : usersCount}</p>
                <p className="text-xs text-gray-400">Users</p>
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl font-bold text-cyan-400">4.8★</p>
                <p className="text-xs text-gray-400">Rating</p>
              </div>
            </div> */}
          </div>

          {/* --- RIGHT SIDE: Animated Illustration --- */}
          <div className="hidden lg:block relative h-[450px] w-full overflow-hidden">
            {/* Animated Circles */}
            <div className="absolute w-80 h-80 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full blur-2xl opacity-20 animate-blob top-1/4 -right-20"></div>
            <div className="absolute w-72 h-72 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full blur-2xl opacity-15 animate-blob animation-delay-2000 bottom-1/4 -left-10" style={{ animationDelay: '2s' }}></div>
            <div className="absolute w-64 h-64 bg-cyan-400 rounded-full blur-2xl opacity-10 animate-blob animation-delay-4000 top-1/3 right-1/3" style={{ animationDelay: '4s' }}></div>

            {/* Animated Icons/Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full max-w-xs">
                {/* Center Circle with Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 backdrop-blur-sm border border-cyan-400/40 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl">🛒</p>
                      <p className="text-xs text-cyan-300 mt-2 font-bold">Campus</p>
                      <p className="text-xs text-teal-300">Trading Hub</p>
                    </div>
                  </div>
                </div>

                {/* Orbiting Elements */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white">📚</div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }}>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-gradient-to-br from-teal-400 to-green-500 rounded-lg shadow-lg shadow-teal-500/50 flex items-center justify-center text-white">💻</div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '12s' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white">🎧</div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '14s', animationDirection: 'reverse' }}>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg shadow-lg shadow-teal-500/50 flex items-center justify-center text-white">🚴</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;