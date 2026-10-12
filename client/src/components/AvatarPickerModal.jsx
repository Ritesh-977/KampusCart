import React, { useState, useEffect } from 'react';
import { FaTimes, FaCamera, FaSmile, FaSyncAlt, FaCheck, FaCloudUploadAlt } from 'react-icons/fa';
import { AVATAR_CATEGORIES, AVATAR_PRESETS, buildDiceBearUrl, generateRandomAvatars } from '../constants/avatarOptions';

const AvatarPickerModal = ({
  isOpen,
  onClose,
  onSelectAvatar,
  onUploadClick,
  currentAvatar
}) => {
  const [activeTab, setActiveTab] = useState('avatars'); // 'avatars' | 'upload'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customAvatars, setCustomAvatars] = useState([]);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    // Reset category and shuffle on modal open
    if (isOpen) {
      setSelectedCategory('all');
      setCustomAvatars([]);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter avatars based on selected category
  const baseAvatars = selectedCategory === 'all'
    ? AVATAR_PRESETS
    : AVATAR_PRESETS.filter((av) => av.style === selectedCategory);

  const displayAvatars = customAvatars.length > 0 ? customAvatars : baseAvatars.map((av) => ({
    ...av,
    url: buildDiceBearUrl(av.style, av.seed)
  }));

  const handleShuffle = () => {
    setIsShuffling(true);
    const randomized = generateRandomAvatars(selectedCategory, 16);
    setCustomAvatars(randomized);
    setTimeout(() => setIsShuffling(false), 300);
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setCustomAvatars([]); // reset shuffle when category changes
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-500">
                <FaSmile size={18} />
              </span>
              Change Profile Picture
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Choose an avatar preset or upload a custom photo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700 px-6 pt-3 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveTab('avatars')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'avatars'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <FaSmile size={14} />
            Choose an Avatar
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <FaCamera size={14} />
            Upload Photo
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto">
          {activeTab === 'avatars' ? (
            <div>
              {/* Category Pills & Shuffle */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {AVATAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition whitespace-nowrap ${
                        selectedCategory === cat.id && customAvatars.length === 0
                          ? 'bg-cyan-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Shuffle Button */}
                <button
                  onClick={handleShuffle}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition shrink-0 ${
                    isShuffling ? 'opacity-60 pointer-events-none' : ''
                  }`}
                  title="Generate new avatars"
                >
                  <FaSyncAlt className={isShuffling ? 'animate-spin' : ''} size={11} />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* Avatar Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1 pr-2">
                {displayAvatars.map((avatar) => {
                  const isCurrent = currentAvatar === avatar.url;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => onSelectAvatar(avatar.url)}
                      className={`group relative aspect-square rounded-2xl bg-slate-100 dark:bg-slate-900/80 p-2 border-2 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 ${
                        isCurrent
                          ? 'border-cyan-500 ring-2 ring-cyan-400/40 shadow-lg'
                          : 'border-slate-200/80 dark:border-slate-700/80 hover:border-cyan-400 dark:hover:border-cyan-400'
                      }`}
                      title={avatar.label || 'Select avatar'}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label || 'Avatar'}
                        className="w-full h-full object-contain pointer-events-none"
                        loading="lazy"
                      />
                      {isCurrent && (
                        <div className="absolute top-1 right-1 bg-cyan-500 text-white rounded-full p-0.5 shadow-sm">
                          <FaCheck size={9} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-4">
                Clicking an avatar instantly updates your profile preview.
              </p>
            </div>
          ) : (
            /* Upload Photo Section */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-20 h-20 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border-2 border-dashed border-cyan-400 dark:border-cyan-500/60 flex items-center justify-center mb-4 text-cyan-500">
                <FaCloudUploadAlt size={36} />
              </div>

              <h4 className="text-base font-bold text-gray-800 dark:text-white mb-1">
                Upload from your device
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-6">
                Supports JPG, PNG, or WEBP up to 5MB. You can crop, zoom, and reposition your photo right after selecting.
              </p>

              <button
                onClick={onUploadClick}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium text-sm hover:from-cyan-600 hover:to-teal-600 shadow-md hover:shadow-cyan-500/25 transform hover:scale-105 transition"
              >
                <FaCamera size={14} />
                Browse Device Photo
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
