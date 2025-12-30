import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaStore
} from 'react-icons/fa';

const Footer = () => {

  // Smooth link animation class
  const linkClass =
    "inline-block transition-all duration-200 ease-out hover:text-indigo-400 hover:translate-x-0.5 active:scale-95";

  return (
    <footer className="bg-gray-900 text-gray-300 pt-8 pb-4 mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* GRID CHANGES: 
           1. 'grid-cols-2': Sets mobile layout to 2 columns side-by-side.
           2. 'lg:grid-cols-3': Reverts to 3 columns for desktop.
        */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 mb-6">

          {/* BRAND SECTION CHANGES: 
             1. 'col-span-2': Makes the logo/brand text span the full width on mobile.
             2. 'lg:col-span-1': Makes it take just 1 column on desktop.
          */}
          <div className="col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="flex items-center text-lg font-bold text-white tracking-tight mb-3"
            >
              <FaStore className="h-5 w-5 mr-2 text-indigo-500" />
              <span>
                kampus<span className="text-indigo-400">Cart</span>
              </span>
            </Link>

            <p className="text-gray-400 mb-3 text-sm leading-snug max-w-xs">
              A trusted marketplace for students to buy and sell locally.
            </p>

            <div className="flex space-x-2">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaFacebook size={16} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaTwitter size={16} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaInstagram size={16} /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><FaLinkedin size={16} /></a>
            </div>
          </div>

          {/* PLATFORM SECTION: 
             Naturally falls into Column 1 (Left) on mobile 
          */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Platform
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className={linkClass}>Home</Link></li>
              <li><Link to="/sell" className={linkClass}>Sell</Link></li>
              <li><Link to="/lost-and-found" className={linkClass}>Lost & Found</Link></li>
              <li><Link to="/chats" className={linkClass}>Messages</Link></li>
            </ul>
          </div>

          {/* SUPPORT SECTION: 
             Naturally falls into Column 2 (Right) on mobile 
          */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Support
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className={linkClass}>About</Link></li>
              <li><Link to="/contact" className={linkClass}>Contact</Link></li>
              <li><Link to="/privacy" className={linkClass}>Privacy</Link></li>
              <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-3 text-xs text-gray-500 text-center md:text-left">
          © {new Date().getFullYear()} kampusCart. All rights reserved.
        </div>

      </div>
    </footer>
  );
};

export default Footer;