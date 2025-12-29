import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FaEnvelope, FaComments } from 'react-icons/fa';

const Contact = () => {

  // Smooth scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="text-center mb-16">
          {/* FIX 2: Headings & Subtext */}
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Get in <span className="text-indigo-600 dark:text-indigo-400">Touch</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Have a question, need support, or want to connect?  
            Reach out to us via email or message us directly.
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Email Card */}
          {/* FIX 3: Card Background & Border */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition-all">
            {/* FIX 4: Icon Circle Background & Color */}
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 mb-6">
              <FaEnvelope size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Email Us
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              For general inquiries and support.
            </p>

            <a
              href="mailto:kampusCart@gmail.com"
              // FIX 5: Button/Link Background & Text
              className="w-full block p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-gray-600 transition"
            >
              <span className="font-medium text-gray-700 dark:text-gray-200 text-sm break-all">
                kampuscart@gmail.com
              </span>
            </a>
          </div>

          {/* Message Card */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition-all">
            {/* FIX 6: Purple Icon Variant */}
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400 mb-6">
              <FaComments size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Message Us
            </h3>
            
            {/* FIX 7: Info Box Background */}
            <div className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 space-y-1">
              <span className="block font-medium text-gray-800 dark:text-gray-200 text-sm select-all">
              Ritesh:  +91 9151380456
              </span>
              <span className="block font-medium text-gray-800 dark:text-gray-200 text-sm select-all">
              Nishan:  +91 7307912002
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;