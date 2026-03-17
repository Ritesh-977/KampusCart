// src/pages/CollegeSelection.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaStore, FaMapMarkerAlt, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { useCollege } from '../context/CollegeContext';
import { colleges } from '../data/colleges';

const CollegeSelection = () => {
  const { setSelectedCollege } = useCollege();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Filter colleges based on search query
  const filteredColleges = colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCollege = colleges.find((c) => c.id === selectedId);

  const handleSelect = (college) => {
    setSelectedId(college.id);
  };

  const handleConfirm = async () => {
    if (!selectedCollege) return;
    setIsConfirming(true);
    // Short delay for visual feedback
    await new Promise((r) => setTimeout(r, 400));
    setSelectedCollege(selectedCollege);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Animated background blobs */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', animationDelay: '1s' }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 text-2xl font-black text-indigo-400">
          <FaStore />
          <span className="text-white">kampus<span className="text-gray-400">Cart</span></span>
        </div>
        <span className="text-xs text-gray-500 font-medium tracking-widest uppercase">Multi-Campus Marketplace</span>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col items-center px-4 py-12">
        {/* Headline */}
        <div className="text-center mb-10 max-w-xl">
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4">
            Step 1 of 1
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Campus</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Select your college to browse listings, post items, and connect with your campus community.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-lg mb-8 relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by college name, city, or short name..."
            autoFocus
            className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
          />
          {searchQuery && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
              {filteredColleges.length} result{filteredColleges.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* College Grid */}
        <div className="w-full max-w-5xl">
          {filteredColleges.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-gray-400 font-medium">No colleges found matching "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-indigo-400 text-sm hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredColleges.map((college) => {
                const isSelected = selectedId === college.id;
                const isHovered = hoveredId === college.id;
                return (
                  <button
                    key={college.id}
                    onClick={() => handleSelect(college)}
                    onMouseEnter={() => setHoveredId(college.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`relative text-left p-5 rounded-2xl border transition-all duration-200 focus:outline-none ${
                      isSelected
                        ? 'border-white/30 shadow-lg scale-[1.02]'
                        : 'border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/8 hover:scale-[1.01]'
                    }`}
                    style={
                      isSelected
                        ? {
                            background: `linear-gradient(135deg, ${college.theme.primary}22, ${college.theme.primary}11)`,
                            borderColor: `${college.theme.primary}66`,
                            boxShadow: `0 0 24px ${college.theme.primary}33`,
                          }
                        : isHovered
                        ? { background: `${college.theme.primary}0d` }
                        : { background: 'rgba(255,255,255,0.02)' }
                    }
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <span
                        className="absolute top-3 right-3 text-sm"
                        style={{ color: college.theme.primary }}
                      >
                        <FaCheckCircle />
                      </span>
                    )}

                    {/* Emoji badge */}
                    <span
                      className="text-2xl mb-3 block"
                      style={{
                        filter: isSelected || isHovered ? 'none' : 'grayscale(0.3)',
                      }}
                    >
                      {college.emoji}
                    </span>

                    {/* Short name badge */}
                    <span
                      className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mb-2"
                      style={{
                        background: `${college.theme.primary}22`,
                        color: college.theme.primary,
                      }}
                    >
                      {college.shortName}
                    </span>

                    <h3 className="text-sm font-bold text-white leading-snug mb-1.5 line-clamp-2">
                      {college.name}
                    </h3>

                    <p className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-auto">
                      <FaMapMarkerAlt className="flex-shrink-0" />
                      {college.location}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Spacer so FAB doesn't overlap last row */}
        <div className="h-28" />
      </main>

      {/* Bottom Confirm Bar — only visible when a college is selected */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          selectedCollege ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{selectedCollege?.emoji}</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Selected Campus</p>
              <p className="text-white font-bold truncate text-sm">{selectedCollege?.name}</p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white text-sm transition-all transform hover:scale-105 active:scale-95 shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: selectedCollege
                ? `linear-gradient(135deg, ${selectedCollege.theme.primary}, ${selectedCollege.theme.primary}cc)`
                : '#6366f1',
              boxShadow: selectedCollege ? `0 4px 24px ${selectedCollege.theme.primary}55` : undefined,
            }}
          >
            {isConfirming ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Entering...
              </>
            ) : (
              <>
                Enter Campus <FaArrowRight className="text-xs" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollegeSelection;
