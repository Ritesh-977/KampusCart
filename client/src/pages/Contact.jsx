import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FaEnvelope, FaComments } from 'react-icons/fa';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';

const Contact = () => {

  // Smooth scroll to top when page opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-surface-2 font-sans transition-colors duration-200">
      <SEOHead {...SEO.contact()} />
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="text-center mb-16">
          {/* FIX 2: Headings & Subtext */}
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            Get in <span className="text-primary">Touch</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Have a question, need support, or want to connect?  
            Reach out to us via email or message us directly.
          </p>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Email Card */}
          {/* FIX 3: Card Background & Border */}
          <div className="bg-surface p-8 rounded-2xl shadow-sm border border-border flex flex-col items-center text-center hover:shadow-md transition-all">
            {/* FIX 4: Icon Circle Background & Color */}
            <div className="p-4 bg-primary-muted rounded-full text-primary mb-6">
              <FaEnvelope size={24} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Email Us
            </h3>
            <p className="text-muted mb-6 text-sm">
              For general inquiries, support, or to request account and data deletion, email us below.
            </p>

            <a
              href="mailto:support@kampuscart.site"
              // FIX 5: Button/Link Background & Text
              className="w-full block p-4 bg-surface-2 rounded-xl border border-border hover:border-primary dark:hover:border-primary/50 hover:bg-primary-muted dark:hover:bg-surface-muted transition"
            >
              <span className="font-medium text-foreground text-sm break-all">
                support@kampuscart.site
              </span>
            </a>
          </div>

          {/* Message Card */}
          <div className="bg-surface p-8 rounded-2xl shadow-sm border border-border flex flex-col items-center text-center hover:shadow-md transition-all">
            {/* FIX 6: Purple Icon Variant */}
            <div className="p-4 bg-tertiary-muted rounded-full text-tertiary mb-6">
              <FaComments size={24} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Message Us
            </h3>
            
            {/* FIX 7: Info Box Background */}
            <div className="w-full p-4 bg-surface-2 rounded-xl border border-border space-y-1">
              <span className="block font-medium text-foreground text-sm select-all">
              Ritesh:  +91 9151380456
              </span>
              <span className="block font-medium text-foreground text-sm select-all">
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