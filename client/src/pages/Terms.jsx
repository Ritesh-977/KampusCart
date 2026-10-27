import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FaGavel, FaFileContract, FaUserCheck, FaBan, FaHandshake, FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';

const Terms = () => {

  // Scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-surface-2 font-sans transition-colors duration-200">
      <SEOHead {...SEO.terms()} />
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Terms of <span className="text-primary">Service</span>
          </h1>
          <p className="text-muted max-w-2xl mx-auto">
            Please read these terms carefully before using KampusCart. By accessing or using our platform, you agree to be bound by these terms.
          </p>
          <p className="text-xs text-muted mt-4">
            Last Updated: December 2025
          </p>
        </header>

        {/* Content Container */}
        <div className="space-y-8">

          {/* 1. Acceptance of Terms */}
          <section className="bg-surface border border-border rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-muted rounded-lg">
                <FaFileContract className="text-primary text-xl" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                1. Acceptance of Terms
              </h2>
            </div>
            <p className="text-foreground leading-relaxed text-sm">
              By registering for an account ("Account") or using the KampusCart marketplace, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          {/* 2. User Eligibility */}
          <section className="bg-surface border border-border rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-muted rounded-lg">
                <FaUserCheck className="text-primary text-xl" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                2. Eligibility & Accounts
              </h2>
            </div>
            <ul className="list-disc list-inside text-foreground space-y-2 text-sm ml-1">
              <li>You must be a verified student or staff member of the campus to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You agree to provide accurate, current, and complete information during the registration process.</li>
              <li>KampusCart reserves the right to suspend or terminate accounts that violate verified status protocols.</li>
            </ul>
          </section>

          {/* 3. Prohibited Items & Conduct */}
          <section className="bg-surface border border-border rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-danger-muted rounded-lg">
                <FaBan className="text-danger text-xl" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                3. Prohibited Items & Conduct
              </h2>
            </div>
            <p className="text-foreground mb-3 text-sm">
              You agree not to list, sell, or buy any items that are illegal, dangerous, or violate campus policies. Prohibited items include, but are not limited to:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-danger rounded-full"></span> Alcohol, drugs, or tobacco products</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-danger rounded-full"></span> Weapons or dangerous materials</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-danger rounded-full"></span> Stolen property</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-danger rounded-full"></span> Academic dishonesty materials</span>
            </div>
          </section>

          {/* 4. Transactions & Safety */}
          <section className="bg-surface border border-border rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-muted rounded-lg">
                <FaHandshake className="text-primary text-xl" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                4. Transactions & Safety
              </h2>
            </div>
            <p className="text-foreground leading-relaxed text-sm">
              KampusCart acts solely as a platform to connect buyers and sellers. We do not process payments or handle delivery.
            </p>
            <div className="mt-4 p-4 bg-warning-muted border border-warning rounded-xl">
              <h4 className="font-bold text-warning text-sm mb-1">Safety Advisory:</h4>
              <p className="text-warning text-xs">
                We strongly recommend meeting in safe, public locations on campus (such as libraries, cafeterias, or student centers) to complete transactions. Avoid sharing personal financial information.
              </p>
            </div>
          </section>

          {/* 5. Limitation of Liability */}
          <section className="bg-surface border border-border rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-muted rounded-lg">
                <FaExclamationTriangle className="text-primary text-xl" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                5. Limitation of Liability
              </h2>
            </div>
            <p className="text-foreground leading-relaxed text-sm">
              KampusCart is not responsible for the quality, safety, or legality of the items listed, nor the truth or accuracy of the listings. Any dispute regarding a transaction must be resolved directly between the buyer and the seller.
            </p>
          </section>

          {/* 6. Governing Law */}
          <section className="bg-surface border border-border rounded-2xl p-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-muted rounded-lg">
                <FaGavel className="text-primary text-xl" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                6. Changes to Terms
              </h2>
            </div>
            <p className="text-foreground leading-relaxed text-sm">
              We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of the new terms.
            </p>
          </section>

        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-muted text-sm">
            Have questions about our terms? <Link to="/contact" className="text-primary hover:underline font-bold">Contact Support</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Terms;