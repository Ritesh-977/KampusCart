import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const SLIDER_IMAGES = [
  "https://ik.imagekit.io/gucotw3hj/Gemini_Generated_Image_bu1rsrbu1rsrbu1r.png", 
  "https://ik.imagekit.io/gucotw3hj/Gemini_Generated_Image_26brjo26brjo26br.png",
  "https://ik.imagekit.io/gucotw3hj/Gemini_Generated_Image_w8q5njw8q5njw8q5.png",
  "https://ik.imagekit.io/gucotw3hj/Gemini_Generated_Image_6el2t16el2t16el2.png"
  
];

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- AUTO-SLIDE LOGIC ---
  useEffect(() => {
    const slideInterval = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(slideInterval);
  }, [currentSlide]); 

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === SLIDER_IMAGES.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? SLIDER_IMAGES.length - 1 : prev - 1));
  };

  const handleStartBrowsing = () => {
    window.scrollTo({
      top: 600, 
      behavior: 'smooth'
    });
  };

  return (
    // FIX 1: Main Background (Indigo in Light, Gray in Dark)
    <div className="relative bg-indigo-900 dark:bg-gray-900 overflow-hidden min-h-[450px] lg:h-[550px] flex items-center transition-colors duration-300">
      
      {/* Background Decorative Shape */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[200%] bg-indigo-800/30 dark:bg-indigo-500/10 rounded-full blur-3xl transform rotate-12 transition-colors"></div>
      </div>

      <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="lg:grid lg:grid-cols-2 gap-12 items-center">
          
          {/* --- LEFT SIDE: CONTENT --- */}
          <div className="text-center lg:text-left mb-8 lg:mb-0 py-8 lg:py-0 z-20 relative">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-4">
              Your Campus <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
                Marketplace
              </span>
            </h1>
            {/* FIX 2: Subtext Color */}
            <p className="text-base sm:text-lg text-indigo-100 dark:text-gray-300 mb-8 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">
              Buy, sell, and find everything you need for college life right here within your campus community.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* FIX 3: Start Browsing Button (White -> Dark Gray) */}
              <button 
                onClick={handleStartBrowsing}
                className="px-8 py-3.5 bg-white dark:bg-gray-800 text-indigo-900 dark:text-white font-bold rounded-xl shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 transition-all transform duration-200 text-base sm:text-lg"
              >
                Start Browsing
              </button>
              
              {/* FIX 4: Sell Button (Indigo -> Dark Indigo) */}
              <Link 
                to="/sell"
                className="px-8 py-3.5 bg-indigo-600 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-500 dark:hover:bg-indigo-500 hover:scale-105 transition-all transform duration-200 flex items-center justify-center text-base sm:text-lg border border-transparent"
              >
                Sell an Item
              </Link>
            </div>
          </div>

          {/* --- RIGHT SIDE: AUTOMATIC IMAGE SLIDER --- */}
          <div className="relative h-[300px] sm:h-[350px] lg:h-full w-full overflow-hidden group lg:absolute lg:top-0 lg:right-0 lg:w-1/2">
            
            {/* Slider Track */}
            <div 
              className="w-full h-full flex transition-transform duration-1000 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {SLIDER_IMAGES.map((img, index) => (
                <div key={index} className="min-w-full h-full relative">
                  <img 
                    src={img} 
                    alt={`Slide ${index + 1}`} 
                    className="w-full h-full object-cover object-center"
                  />
                  {/* FIX 5: Gradient Overlay (Matches Background Color) */}
                  <div className="absolute inset-0 
                    bg-gradient-to-t from-indigo-900 via-indigo-900/40 to-transparent 
                    dark:from-gray-900 dark:via-gray-900/40 dark:to-transparent 
                    lg:bg-gradient-to-l lg:from-transparent lg:via-indigo-900/10 lg:to-indigo-900
                    dark:lg:via-gray-900/10 dark:lg:to-gray-900
                    transition-colors duration-300"
                  ></div>
                </div>
              ))}
            </div>

            {/* --- CONTROLS --- */}
            <button 
              onClick={prevSlide}
              className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer z-20"
            >
              <FaChevronLeft size={18} />
            </button>

            <button 
              onClick={nextSlide}
              className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer z-20"
            >
              <FaChevronRight size={18} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {SLIDER_IMAGES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === index ? "bg-white w-6" : "bg-white/40 w-1.5 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;