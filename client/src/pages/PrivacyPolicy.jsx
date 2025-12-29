import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FaLock, FaUserShield, FaDatabase } from 'react-icons/fa';

const PrivacyPolicy = () => {

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-white dark:bg-gray-900 font-sans transition-colors duration-200">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <header className="mb-12">
          {/* FIX 2: Title Color */}
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          {/* FIX 3: Subtitle Color */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: December 2025
          </p>
        </header>

        {/* Content */}
        {/* FIX 4: Body Text Color */}
        <div className="space-y-10 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          {/* 1. Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-gray-900 dark:text-white">
              {/* FIX 5: Icon Colors */}
              <FaDatabase className="text-gray-500 dark:text-indigo-400" />
              <h2 className="font-medium">
                1. Information We Collect
              </h2>
            </div>

            <p className="mb-3">
              To provide our services, we collect necessary information when you
              register and use KampusCart. This may include:
            </p>

            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Account details such as name, email address, and profile image.</li>
              <li>Item listings including images, descriptions, and pricing.</li>
              <li>Messages exchanged through the in-app chat feature.</li>
              <li>Basic usage data related to platform access.</li>
            </ul>
          </section>

          {/* 2. How We Use Information */}
          <section>
            <h2 className="font-medium text-gray-900 dark:text-white mb-3">
              2. How We Use Your Information
            </h2>

            <p className="mb-3">
              We use your information solely to operate, maintain, and improve
              KampusCart. This includes:
            </p>

            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Managing user accounts.</li>
              <li>Enabling communication between buyers and sellers.</li>
              <li>Displaying listings to other users.</li>
              <li>Maintaining platform safety and security.</li>
            </ul>
          </section>

          {/* 3. Chat Privacy */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-gray-900 dark:text-white">
              <FaLock className="text-gray-500 dark:text-indigo-400" />
              <h2 className="font-medium">
                3. Chat & Messaging Privacy
              </h2>
            </div>

            <p>
              Messages exchanged between users on KampusCart are private and visible
              only to the participants of the conversation. Chats are not actively
              monitored unless required for safety, compliance, or legal reasons.
            </p>
          </section>

          {/* 4. Data Sharing & Security */}
          <section>
            <div className="flex items-center gap-3 mb-3 text-gray-900 dark:text-white">
              <FaUserShield className="text-gray-500 dark:text-indigo-400" />
              <h2 className="font-medium">
                4. Data Sharing & Security
              </h2>
            </div>

            <p>
              We do not sell or rent personal data to third parties. Information may
              be disclosed only when legally required or necessary to protect users
              and the platform.
            </p>

            <p className="mt-3">
              We use standard security practices to protect your data; however, no
              system can guarantee absolute security.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;