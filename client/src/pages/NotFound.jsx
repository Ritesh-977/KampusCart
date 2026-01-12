import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaRocket } from "react-icons/fa";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col items-center justify-center overflow-hidden relative selection:bg-indigo-500 selection:text-white">
      
      {/* Background Decorative Blobs (Static - No Animation) */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200 dark:bg-indigo-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transform translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-20 w-96 h-96 bg-pink-200 dark:bg-pink-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 transform translate-y-1/2"></div>

      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        
        {/* 404 TEXT: Gradient but Static (No Glitch) */}
        <h1 className="text-9xl sm:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 drop-shadow-sm tracking-widest">
          404
        </h1>

        {/* Subtitle */}
        <div className="mt-4 sm:mt-8 space-y-4">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-white tracking-tight">
            Nothing to see here
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            The link you followed may be broken, or the page may have been removed.
          </p>
        </div>

        {/* Floating Rocket Animation */}
        <div className="my-10 flex justify-center">
            <div className="relative animate-bounce-slow">
                <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl"></div>
                <FaRocket className="text-6xl sm:text-8xl text-indigo-600 dark:text-indigo-400 transform -rotate-45" />
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Link 
            to="/" 
            className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 dark:focus:ring-offset-gray-900"
          >
            <FaHome className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
            Back to Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-8 py-3 text-base font-bold text-gray-700 dark:text-gray-200 transition-all duration-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md focus:outline-none"
          >
            Go Back Previous
          </button>
        </div>
        
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-sm text-gray-500 dark:text-gray-500">
        Error Code: 404_PAGE_NOT_FOUND
      </div>

      {/* Custom Styles for Rocket Slow Bounce Only */}
      <style>{`
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(-10%); }
            50% { transform: translateY(10%); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default NotFound;