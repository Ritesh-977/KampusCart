import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaEdit, FaSave, FaTimes, FaCamera, FaSpinner, FaCheck, FaImage } from 'react-icons/fa';
import Cropper from 'react-easy-crop';
import { toast } from 'react-toastify';

// --- UTILITY FUNCTION FOR CROPPING ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      blob.name = 'croppedImage.jpeg';
      resolve(blob);
    }, 'image/jpeg', 1);
  });
}

const UserProfile = () => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    year: '',
    profilePic: '',
    coverImage: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const coverInputRef = useRef(null);

  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropTarget, setCropTarget] = useState(null);

  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/users/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setUser({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          year: data.year || '',
          profilePic: data.profilePic || '',
          coverImage: data.coverImage || ''
        });
        if (data.profilePic) setImagePreview(data.profilePic);
        if (data.coverImage) setCoverPreview(data.coverImage);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => setUser({ ...user, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setTempImageSrc(URL.createObjectURL(file));
      setCropTarget('profile'); 
      setShowCropModal(true);
      e.target.value = null;
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setTempImageSrc(URL.createObjectURL(file));
      setCropTarget('cover'); 
      setShowCropModal(true);
      e.target.value = null;
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    setIsCropping(true);
    try {
      const croppedImageBlob = await getCroppedImg(tempImageSrc, croppedAreaPixels);
      const croppedUrl = URL.createObjectURL(croppedImageBlob);

      if (cropTarget === 'profile') {
        setImagePreview(croppedUrl);
        setImageFile(croppedImageBlob);
      } else if (cropTarget === 'cover') {
        setCoverPreview(croppedUrl);
        setCoverFile(croppedImageBlob);
      }

      setShowCropModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not crop image");
    } finally {
      setIsCropping(false);
    }
  }, [tempImageSrc, croppedAreaPixels, cropTarget]);

  const cancelImage = () => {
    setImageFile(null);
    setCoverFile(null);
    setTempImageSrc(null);
    setZoom(1);
    setShowCropModal(false);
  };

  const triggerFileInput = () => fileInputRef.current.click();
  const triggerCoverInput = () => coverInputRef.current.click();

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', user.name);
      formData.append('phone', user.phone);
      formData.append('year', user.year);

      if (imageFile) formData.append('profilePic', imageFile);
      if (coverFile) formData.append('coverImage', coverFile);

      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const updatedData = await response.json();

      const savedUser = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('user', JSON.stringify({
        ...savedUser,
        name: updatedData.name,
        profilePic: updatedData.profilePic
      }));

      if (updatedData.profilePic) setImagePreview(updatedData.profilePic);
      if (updatedData.coverImage) setCoverPreview(updatedData.coverImage);

      setIsEditing(false);
      setImageFile(null);
      setCoverFile(null);
      toast.success("Profile updated successfully!");

    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold bg-gray-50 dark:bg-gray-900 transition-colors">Loading Profile...</div>;

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200">
      <Navbar />

      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* FIX 2: Card Background */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden relative transition-colors">

          {/* --- COVER IMAGE SECTION --- */}
          <div className="relative h-48 bg-gray-300 dark:bg-gray-700 group">
            {coverPreview || user.coverImage ? (
              <img
                src={coverPreview || user.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600"></div>
            )}

            {isEditing && (
              <>
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                  <button
                    onClick={triggerCoverInput}
                    className="bg-white/90 dark:bg-black/70 text-gray-800 dark:text-white px-4 py-2 rounded-full font-medium shadow-lg hover:bg-white dark:hover:bg-black/90 flex items-center transform hover:scale-105 transition"
                  >
                    <FaImage className="mr-2" /> Change Cover
                  </button>
                </div>
                <input type="file" ref={coverInputRef} onChange={handleCoverChange} className="hidden" accept="image/*" />
              </>
            )}
          </div>

          <div className="px-8 pb-8">
            {/* Profile Picture Section */}
            <div className="relative -mt-16 mb-6 flex justify-between items-end">
              <div className="relative group">
                {/* FIX 3: Profile Pic Border & Placeholder */}
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shadow-md overflow-hidden relative z-10 transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-300">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                {isEditing && (
                  <button onClick={triggerFileInput} className="absolute bottom-0 right-0 bg-gray-800 dark:bg-gray-700 text-white p-2 rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 transition shadow-lg z-20" title="Upload Photo">
                    <FaCamera size={16} />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mb-2">
                {isEditing ? (
                <div className="flex justify-end md:justify-start space-x-2 md:space-x-3 mb-4 md:mb-0">
                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setImagePreview(user.profilePic || null);
                      setCoverPreview(user.coverImage || null);
                      setImageFile(null);
                      setCoverFile(null);
                    }}
                    disabled={saving}
                    // FIX 4: Dark Mode Cancel Button
                    className="flex items-center px-2.5 py-1 text-xs md:px-4 md:py-2 md:text-base 
                               bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg 
                               hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    <FaTimes className="mr-1 md:mr-2" /> Cancel
                  </button>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-2.5 py-1 text-xs md:px-4 md:py-2 md:text-base 
                               bg-indigo-600 text-white rounded-lg 
                               hover:bg-indigo-700 transition shadow-md 
                               disabled:opacity-70 disabled:cursor-not-allowed
                               min-w-[90px] md:min-w-[140px] justify-center"
                  >
                    {saving ? (
                      <>
                        <FaSpinner className="animate-spin mr-1 md:mr-2" /> Saving…
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-1 md:mr-2" /> Save
                      </>
                    )}
                  </button>
                </div>

                ) : (
                  // FIX 5: Edit Button (Dark Mode)
                  <button onClick={() => setIsEditing(true)} className="flex items-center px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm font-medium">
                    <FaEdit className="mr-2 text-indigo-500 dark:text-indigo-400" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* User Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaUser className="text-gray-400 dark:text-gray-500" /></div>
                  {/* FIX 6: Input Field (Dynamic Dark Mode) */}
                  <input 
                    type="text" 
                    name="name" 
                    disabled={!isEditing} 
                    value={user.name} 
                    onChange={handleChange} 
                    className={`block w-full pl-10 py-3 rounded-lg border transition-all ${
                        isEditing 
                        ? 'border-indigo-300 bg-white dark:bg-gray-700 dark:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white' 
                        : 'border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 font-bold text-xl'
                    }`} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaEnvelope className="text-gray-400 dark:text-gray-500 mb-2" /></div>
                  {/* FIX 7: Disabled Email Input */}
                  <input 
                    type="email" 
                    value={user.email} 
                    disabled 
                    className="block w-full pl-10 py-3 rounded-lg border border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-500 -mt-1 ml-2 flex items-center gap-1">
                    <span role="img" aria-label="lock">🔒</span> Email cannot be changed</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaPhone className="text-gray-400 dark:text-gray-500" /></div>
                  <input 
                    type="text" 
                    name="phone" 
                    disabled={!isEditing} 
                    value={user.phone} 
                    onChange={handleChange} 
                    placeholder="Add phone number" 
                    className={`block w-full pl-10 py-3 rounded-lg border transition-all ${
                        isEditing 
                        ? 'border-indigo-300 bg-white dark:bg-gray-700 dark:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white' 
                        : 'border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
                    }`} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Current Year / Branch</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaGraduationCap className="text-gray-400 dark:text-gray-500" /></div>
                  <input 
                    type="text" 
                    name="year" 
                    disabled={!isEditing} 
                    value={user.year} 
                    onChange={handleChange} 
                    placeholder="e.g. 2nd Year CSE" 
                    className={`block w-full pl-10 py-3 rounded-lg border transition-all ${
                        isEditing 
                        ? 'border-indigo-300 bg-white dark:bg-gray-700 dark:border-indigo-500 focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white' 
                        : 'border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
                    }`} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- DYNAMIC CROP MODAL --- */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
          {/* FIX 8: Modal Background */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {cropTarget === 'profile' ? 'Adjust Profile Picture' : 'Adjust Cover Image'}
              </h3>
            </div>

            <div className="p-4 flex flex-col items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Drag to reposition. Use slider to zoom.</p>

              <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                <Cropper
                  image={tempImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={cropTarget === 'profile' ? 1 : 3 / 1}
                  cropShape={cropTarget === 'profile' ? 'round' : 'rect'}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="mt-6 w-full flex items-center space-x-2 px-4">
                <span role="img" aria-label="zoom out" className="text-gray-500 dark:text-gray-400">➖</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  // FIX 9: Slider Colors
                  className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span role="img" aria-label="zoom in" className="text-gray-500 dark:text-gray-400">➕</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={cancelImage}
                disabled={isCropping}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={showCroppedImage}
                disabled={isCropping}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center disabled:opacity-50"
              >
                {isCropping ? <>Processing...</> : <><FaCheck className="mr-2" /> Confirm Crop</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserProfile;