import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { FaUser, FaEnvelope, FaPhone, FaGraduationCap, FaEdit, FaSave, FaTimes, FaCamera, FaSpinner, FaCheck, FaImage, FaLock, FaEye, FaEyeSlash, FaKey, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { toast } from 'react-toastify';
import API from '../api/axios';
import AvatarPickerModal from '../components/AvatarPickerModal';

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
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
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

  // --- Change Password State ---
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('/users/profile');

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
        setSelectedAvatarUrl(null);
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

  const handleSelectAvatar = (avatarUrl) => {
    setImagePreview(avatarUrl);
    setSelectedAvatarUrl(avatarUrl);
    setImageFile(null); // Clear local uploaded file
    setShowAvatarModal(false);
  };

  const handleModalUploadClick = () => {
    setShowAvatarModal(false);
    triggerFileInput();
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving profile...');
    try {
      const formData = new FormData();
      formData.append('name', user.name);
      formData.append('phone', user.phone);
      formData.append('year', user.year);

      if (imageFile) {
        formData.append('profilePic', imageFile);
      } else if (selectedAvatarUrl) {
        formData.append('profilePic', selectedAvatarUrl);
      }
      if (coverFile) formData.append('coverImage', coverFile);

      // ✅ FIX: Use API.put
      // - No token needed (Cookie sent automatically)
      // - No 'Content-Type' header needed (Axios detects FormData automatically)
      const { data: updatedData } = await API.put('/users/profile', formData);

      // Update LocalStorage User Info (So Navbar updates immediately)
      const savedUser = JSON.parse(localStorage.getItem('user')) || {};
      localStorage.setItem('user', JSON.stringify({ ...savedUser, ...updatedData }));
      window.dispatchEvent(new Event('userUpdated'));

      // Update UI
      if (updatedData.profilePic) {
        setImagePreview(updatedData.profilePic);
        setUser((prev) => ({ ...prev, profilePic: updatedData.profilePic }));
      }
      if (updatedData.coverImage) {
        setCoverPreview(updatedData.coverImage);
        setUser((prev) => ({ ...prev, coverImage: updatedData.coverImage }));
      }

      setIsEditing(false);
      setImageFile(null);
      setSelectedAvatarUrl(null);
      setCoverFile(null);
      toast.update(toastId, { render: 'Profile updated successfully!', type: 'success', isLoading: false, autoClose: 2000 });

    } catch (err) {
      console.error(err);
      toast.update(toastId, { render: err.response?.data?.message || 'Failed to update profile', type: 'error', isLoading: false, autoClose: 2000 });
    } finally {
      setSaving(false);
    }
  };
  const validatePasswordForm = () => {
    const errs = {};
    if (!passwordForm.currentPassword) errs.currentPassword = 'Current password is required';
    if (!passwordForm.newPassword) errs.newPassword = 'New password is required';
    else if (passwordForm.newPassword.length < 6) errs.newPassword = 'Must be at least 6 characters';
    if (!passwordForm.confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handlePasswordSave = async () => {
    const errs = validatePasswordForm();
    if (Object.keys(errs).length) { setPasswordErrors(errs); return; }
    setSavingPassword(true);
    try {
      await API.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      setShowPasswordSection(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-accent font-bold bg-surface-muted transition-colors">Loading Profile...</div>;

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-surface-2 font-sans transition-colors duration-200">
      <Navbar />

      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* FIX 2: Card Background */}
        <div className="bg-surface rounded-2xl shadow-xl overflow-hidden relative transition-colors">

          {/* --- COVER IMAGE SECTION --- */}
          <div className="relative h-48 bg-gradient-to-br from-surface-inverse via-surface-inverse to-surface-inverse group overflow-hidden">
            {/* Attractive Default Cover Pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent"></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.3),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.3),transparent_50%)]"></div>
            </div>

            {coverPreview || user.coverImage ? (
              <img
                src={coverPreview || user.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center">
                    <FaCamera className="text-white text-xl" />
                  </div>
                  <p className="text-accent text-sm font-medium">Add a cover photo</p>
                </div>
              </div>
            )}

            {isEditing && (
              <>
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                  <button
                    onClick={triggerCoverInput}
                    className="bg-surface-muted backdrop-blur-sm text-accent border border-accent/30 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-surface-muted flex items-center transform hover:scale-105 transition"
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
            {/* FIX: Changed to 'flex-col' on mobile to push buttons below the profile pic, 'md:flex-row' for desktop */}
            {/* Profile Picture Section */}
{/* Reverted to original layout: side-by-side with profile picture */}
<div className="relative -mt-16 mb-6 flex justify-between items-end">
  
  {/* Profile Picture Wrapper */}
  <div className="relative group">
    <div className="w-32 h-32 rounded-full border-4 border-border-strong bg-gradient-to-br from-surface-inverse to-surface-inverse flex items-center justify-center shadow-xl overflow-hidden relative z-10 transition-colors">
      {imagePreview ? (
        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span className="text-4xl font-bold text-accent">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </span>
      )}
    </div>
    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
    {isEditing && (
      <button 
        type="button"
        onClick={() => setShowAvatarModal(true)} 
        className="absolute bottom-0 right-0 bg-gradient-to-r from-accent to-primary text-white p-3 rounded-full hover:from-accent hover:to-primary transition shadow-lg z-20 transform hover:scale-105" 
        title="Change Profile Picture"
      >
        <FaCamera size={16} />
      </button>
    )}
  </div>

  {/* Action Buttons */}
   {/* Action Buttons */}
  <div className="mb-0">
    {isEditing ? (
      // FIX: flex-col-reverse (mobile: Save top/Cancel bottom) + md:flex-row (desktop: Cancel left/Save right)
      // FIX: md:w-auto prevents buttons from stretching on desktop
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-end mt-3 md:mt-0 gap-2 md:gap-3">
        
        {/* Cancel Button (First in code = Bottom on mobile, Left on desktop) */}
        <button
          onClick={() => {
            setIsEditing(false);
            setImagePreview(user.profilePic || null);
            setCoverPreview(user.coverImage || null);
            setImageFile(null);
            setSelectedAvatarUrl(null);
            setCoverFile(null);
          }}
          disabled={saving}
          className="flex items-center justify-center w-full md:w-auto min-w-[90px] px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm bg-surface-muted text-subtle rounded-md hover:bg-surface-muted transition disabled:opacity-50"
        >
          <FaTimes className="mr-1.5" /> Cancel
        </button>

        {/* Save Button (Second in code = Top on mobile, Right on desktop) */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center w-full md:w-auto min-w-[90px] px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm bg-gradient-to-r from-accent to-primary text-white rounded-md hover:from-accent hover:to-primary transition shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <FaSpinner className="animate-spin mr-1.5" /> Saving…
            </>
          ) : (
            <>
              <FaSave className="mr-1.5" /> Save
            </>
          )}
        </button>

      </div>
    ) : (
      // Original Edit Button
      <button 
        onClick={() => setIsEditing(true)} 
        className="flex items-center px-3 py-1.5 text-sm md:px-5 md:py-2.5 md:text-base bg-gradient-to-r from-accent to-primary text-white rounded-md md:rounded-lg hover:from-accent hover:to-primary transition shadow-sm font-medium transform hover:scale-105"
      >
        <FaEdit className="mr-1.5 md:mr-2" /> Edit Profile
      </button>
    )}
  </div>
</div>



            {/* User Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaUser className="text-subtle" /></div>
                  <input
                    type="text"
                    name="name"
                    disabled={!isEditing}
                    value={user.name}
                    onChange={handleChange}
                    className={`block w-full pl-10 py-3 rounded-lg border transition-all ${isEditing
                      ? 'border-accent bg-surface border-accent focus:ring-2 focus:ring-accent text-foreground'
                      : 'border-transparent bg-surface-2 text-foreground font-bold text-xl'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaEnvelope className="text-subtle mb-2" /></div>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="block w-full pl-10 py-3 rounded-lg border border-transparent bg-surface-2 text-muted cursor-not-allowed"
                  />
                  <span className="text-xs text-muted mt-1.5 ml-2 flex items-center gap-1">
                    <span role="img" aria-label="lock">🔒</span> Email cannot be changed</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaPhone className="text-subtle" /></div>
                  <input
                    type="text"
                    name="phone"
                    disabled={!isEditing}
                    value={user.phone}
                    onChange={handleChange}
                    placeholder="Add phone number"
                    className={`block w-full pl-10 py-3 rounded-lg border transition-all ${isEditing
                      ? 'border-accent bg-surface border-accent focus:ring-2 focus:ring-accent text-foreground'
                      : 'border-transparent bg-surface-2 text-foreground'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">Current Year / Branch</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaGraduationCap className="text-subtle" /></div>
                  <input
                    type="text"
                    name="year"
                    disabled={!isEditing}
                    value={user.year}
                    onChange={handleChange}
                    placeholder="e.g. 2nd Year CSE"
                    className={`block w-full pl-10 py-3 rounded-lg border transition-all ${isEditing
                      ? 'border-accent bg-surface border-accent focus:ring-2 focus:ring-accent text-foreground'
                      : 'border-transparent bg-surface-2 text-foreground'
                      }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- CHANGE PASSWORD CARD --- */}
      <div className="max-w-4xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-2xl shadow-xl overflow-hidden transition-colors">
          {/* Header / Toggle */}
          <button
            onClick={() => {
              setShowPasswordSection(v => !v);
              setPasswordErrors({});
            }}
            className="w-full flex items-center justify-between px-8 py-5 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow">
                <FaKey className="text-white text-sm" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm sm:text-base">Change Password</p>
                <p className="text-xs text-muted">Update your account password</p>
              </div>
            </div>
            {showPasswordSection
              ? <FaChevronUp className="text-subtle group-hover:text-accent transition" />
              : <FaChevronDown className="text-subtle group-hover:text-accent transition" />
            }
          </button>

          {showPasswordSection && (
            <div className="px-8 pb-8 border-t border-border">
              <div className="mt-6 grid grid-cols-1 gap-5 max-w-lg">

                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-subtle text-sm" />
                    </div>
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={e => { setPasswordForm(f => ({ ...f, currentPassword: e.target.value })); setPasswordErrors(er => ({ ...er, currentPassword: '' })); }}
                      placeholder="Enter current password"
                      className={`block w-full pl-10 pr-10 py-3 rounded-lg border transition-all bg-surface text-foreground focus:ring-2 focus:ring-accent outline-none ${passwordErrors.currentPassword ? 'border-danger' : 'border-border'}`}
                    />
                    <button type="button" onClick={() => setShowCurrentPw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-subtle hover:text-muted dark:hover:text-subtle transition">
                      {showCurrentPw ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && <p className="text-xs text-danger mt-1">{passwordErrors.currentPassword}</p>}
                  {/* Forgot Password link */}
                  <div className="mt-1.5 text-right">
                    <Link to="/forgot-password" className="text-base text-accent hover:text-accent dark:hover:text-accent font-medium transition">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-subtle text-sm" />
                    </div>
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={e => { setPasswordForm(f => ({ ...f, newPassword: e.target.value })); setPasswordErrors(er => ({ ...er, newPassword: '' })); }}
                      placeholder="Minimum 6 characters"
                      className={`block w-full pl-10 pr-10 py-3 rounded-lg border transition-all bg-surface text-foreground focus:ring-2 focus:ring-accent outline-none ${passwordErrors.newPassword ? 'border-danger' : 'border-border'}`}
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-subtle hover:text-muted dark:hover:text-subtle transition">
                      {showNewPw ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && <p className="text-xs text-danger mt-1">{passwordErrors.newPassword}</p>}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-subtle uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-subtle text-sm" />
                    </div>
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={e => { setPasswordForm(f => ({ ...f, confirmPassword: e.target.value })); setPasswordErrors(er => ({ ...er, confirmPassword: '' })); }}
                      placeholder="Re-enter new password"
                      className={`block w-full pl-10 pr-10 py-3 rounded-lg border transition-all bg-surface text-foreground focus:ring-2 focus:ring-accent outline-none ${passwordErrors.confirmPassword ? 'border-danger' : 'border-border'}`}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-subtle hover:text-muted dark:hover:text-subtle transition">
                      {showConfirmPw ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && <p className="text-xs text-danger mt-1">{passwordErrors.confirmPassword}</p>}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => { setShowPasswordSection(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordErrors({}); }}
                    disabled={savingPassword}
                    className="px-4 py-2 rounded-lg bg-surface-muted text-subtle hover:bg-surface-muted transition text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordSave}
                    disabled={savingPassword}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-accent to-primary text-white text-sm font-medium hover:from-accent hover:to-primary transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? <><FaSpinner className="animate-spin" /> Saving…</> : <><FaSave /> Update Password</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- DYNAMIC CROP MODAL --- */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
          {/* FIX 8: Modal Background */}
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full overflow-hidden transition-colors">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                {cropTarget === 'profile' ? 'Adjust Profile Picture' : 'Adjust Cover Image'}
              </h3>
            </div>

            <div className="p-4 flex flex-col items-center">
              <p className="text-sm text-muted mb-4">Drag to reposition. Use slider to zoom.</p>

              <div className="relative w-full h-64 bg-surface-muted rounded-lg overflow-hidden">
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
                <span role="img" aria-label="zoom out" className="text-muted">➖</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  // FIX 9: Slider Colors
                  className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <span role="img" aria-label="zoom in" className="text-muted">➕</span>
              </div>
            </div>

            <div className="p-4 bg-surface-2 flex justify-end space-x-3 border-t border-border">
              <button
                onClick={cancelImage}
                disabled={isCropping}
                className="px-4 py-2 text-muted hover:text-foreground dark:hover:text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={showCroppedImage}
                disabled={isCropping}
                className="px-6 py-2 bg-gradient-to-r from-accent to-primary text-white rounded-lg hover:from-accent hover:to-primary font-medium flex items-center disabled:opacity-50"
              >
                {isCropping ? <>Processing...</> : <><FaCheck className="mr-2" /> Confirm Crop</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AVATAR PICKER MODAL --- */}
      <AvatarPickerModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelectAvatar={handleSelectAvatar}
        onUploadClick={handleModalUploadClick}
        currentAvatar={imagePreview}
      />

    </div>
  );
};

export default UserProfile;