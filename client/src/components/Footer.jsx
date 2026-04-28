import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaGooglePlay
} from 'react-icons/fa';

// import AdBanner from './AdBanner';s

const Footer = () => {

  // Smooth link animation class
  const linkClass =
    "inline-block transition-all duration-200 ease-out hover:text-cyan-400 hover:translate-x-0.5 active:scale-95";

  return (
    <>
      {/* Responsive horizontal ad banner above the footer */}
      {/* <div className="w-full bg-white border-t border-gray-200 py-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdBanner
            adClient="ca-pub-8205690358508264"
            adSlot="5413300350"
            adFormat="auto"
            fullWidthResponsive={true}
          />
        </div>
      </div> */}

    <footer className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 pt-8 pb-4 mt-auto border-t border-cyan-700/30 shadow-lg shadow-cyan-500/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* GRID UPDATE: Changed to lg:grid-cols-4 to make room for the App column */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-6">

          {/* COLUMN 1: BRAND SECTION */}
          <div className="col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="flex items-center text-lg font-bold text-white tracking-tight mb-3"
            >
              <img 
                src="/logo.png" 
                alt="KampusCart Logo" 
                className="h-6 w-6 mr-1 object-contain" 
              />
              <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
    kampusCart
  </span>
            </Link>

            <p className="text-slate-400 mb-4 text-sm leading-snug max-w-xs">
              A trusted marketplace for students to buy and sell locally.
            </p>

            {/* Social Icons */}
            <div className="flex space-x-3 mb-6">
              {/* <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors"><FaFacebook size={18} /></a> */}
              <a href="https://x.com/kampus_cart" className="text-slate-400 hover:text-cyan-400 transition-colors"><FaTwitter size={18} /></a>
              <a href="https://www.instagram.com/kampuscart/?hl=en" className="text-slate-400 hover:text-cyan-400 transition-colors"><FaInstagram size={18} /></a>
              <a href="https://www.linkedin.com/company/kampuscart" className="text-slate-400 hover:text-cyan-400 transition-colors"><FaLinkedin size={18} /></a>
            </div>
          </div>

          {/* COLUMN 2: PLATFORM SECTION */}
          <div>
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 mt-2 lg:mt-0">
              Platform
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className={linkClass}>Home</Link></li>
              <li><Link to="/sell" className={linkClass}>Sell</Link></li>
              <li><Link to="/lost-and-found" className={linkClass}>Lost & Found</Link></li>
              <li><Link to="/chats" className={linkClass}>Messages</Link></li>
            </ul>
          </div>

          {/* COLUMN 3: SUPPORT SECTION */}
          <div>
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 mt-2 lg:mt-0">
              Support
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className={linkClass}>About</Link></li>
              <li><Link to="/contact" className={linkClass}>Contact</Link></li>
              <li><Link to="/privacy" className={linkClass}>Privacy</Link></li>
              <li><Link to="/terms" className={linkClass}>Terms of Service</Link></li>
            </ul>
          </div>

          {/* COLUMN 4: APP DOWNLOAD SECTION */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 mt-2 lg:mt-0">
              Get Our App
            </h3>
            <a 
              href="https://play.google.com/store/apps/details?id=com.ritesh977.kampuscart" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 transition-all rounded-xl px-4 py-2 group shadow-sm w-fit"
            >
              <FaGooglePlay className="text-cyan-400 text-xl group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-1">
                  GET IT ON
                </div>
                <div className="text-sm font-black text-white leading-none tracking-wide">
                  Google Play
                </div>
              </div>
            </a>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 pt-4 mt-2 text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-2 text-center md:text-left">
          <p>© {new Date().getFullYear()} kampusCart. All rights reserved.</p>
        </div>

      </div>
    </footer>
    </>
  );
};

export default Footer;