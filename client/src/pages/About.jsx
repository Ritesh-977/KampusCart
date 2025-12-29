import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FaUsers, FaHandshake, FaShieldAlt } from 'react-icons/fa';

const About = () => {
  // Smooth scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-4">
            About <span className="text-gray-700 dark:text-indigo-400">KampusCart</span>
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            KampusCart is a community-focused marketplace designed to help students
            buy and sell items easily within their campus network.
          </p>
        </div>

        {/* Who We Are */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 mb-10 transition-colors">
          <div className="flex items-start gap-4">
            <FaUsers size={20} className="text-gray-500 dark:text-indigo-400 mt-1" />
            <div>
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
                Who We Are
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                KampusCart is built to bridge the gap between students who need items
                and those who have items to sell. From textbooks and electronics to
                daily essentials, our platform enables students to connect locally
                and trade with confidence.
              </p>
            </div>
          </div>
        </div>

        {/* What We Do */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 transition-colors">
            <FaHandshake size={20} className="text-gray-500 dark:text-indigo-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Simple & Efficient Trading
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              KampusCart provides a straightforward way for students to list unused
              items and discover affordable deals from peers within the same campus.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 transition-colors">
            <FaShieldAlt size={20} className="text-gray-500 dark:text-indigo-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Secure Communication
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Our in-app messaging system allows buyers and sellers to communicate
              securely without sharing personal contact details.
            </p>
          </div>
        </div>

        {/* Why We Exist */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 transition-colors">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4 text-center">
            Why We Exist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center max-w-3xl mx-auto">
            KampusCart was created to make local buying and selling simple, transparent,
            and reliable. We aim to reduce waste by giving items a second life while
            fostering trust and collaboration within campus communities.
          </p>
        </div>

      </div>
    </div>
  );
};

export default About;