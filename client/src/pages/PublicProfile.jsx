import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { 
  FaUserCircle, FaMapMarkerAlt, FaCalendarAlt, FaBoxOpen, 
  FaExclamationCircle, FaPhone, FaUniversity, FaEnvelope 
} from 'react-icons/fa';
import { toast } from 'react-toastify';

// --- SKELETON COMPONENT ---
const PublicProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-muted via-white to-tertiary-muted text-foreground transition-colors duration-200 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        
        {/* Profile Header Skeleton */}
        <div className="bg-surface rounded-3xl shadow-xl overflow-hidden border border-border relative">
          {/* Cover Photo */}
          <div className="h-48 sm:h-64 bg-surface-muted"></div>
          
          <div className="px-6 pb-8">
            <div className="relative flex justify-between items-end -mt-16 mb-6">
              {/* Profile Pic */}
              <div className="bg-surface p-1.5 rounded-full z-10">
                <div className="h-32 w-32 rounded-full bg-surface-muted border-4 border-border-strong"></div>
              </div>
            </div>

            <div>
              {/* Name Skeleton */}
              <div className="h-8 w-64 bg-surface-muted rounded mb-4"></div>
              
              {/* Details Pills Skeleton */}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="h-8 w-32 bg-surface-muted rounded-lg"></div>
                <div className="h-8 w-40 bg-surface-muted rounded-lg"></div>
                <div className="h-8 w-48 bg-surface-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Header Skeleton */}
        <div className="mt-12 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-xl bg-surface-muted"></div>
             <div className="space-y-2">
               <div className="h-6 w-40 bg-surface-muted rounded"></div>
               <div className="h-4 w-60 bg-surface-muted rounded"></div>
             </div>
          </div>
          <div className="h-8 w-24 bg-surface-muted rounded-full"></div>
        </div>

        {/* Items Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border overflow-hidden flex flex-col h-full">
              <div className="h-48 bg-surface-muted w-full"></div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex justify-between">
                  <div className="h-5 w-2/3 bg-surface-muted rounded"></div>
                  <div className="h-5 w-1/4 bg-surface-muted rounded"></div>
                </div>
                <div className="h-4 w-full bg-surface-muted rounded"></div>
                <div className="h-4 w-1/2 bg-surface-muted rounded"></div>
                <div className="mt-auto pt-3 border-t border-border flex justify-between">
                   <div className="h-3 w-16 bg-surface-muted rounded"></div>
                   <div className="h-3 w-20 bg-surface-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOtherUserProfile, setIsOtherUserProfile] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // 1. Fetch Public User Details
        const userRes = await API.get(`/users/${userId}`); 
        setProfile(userRes.data);

        // Determine whether we are viewing someone else
        const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
        setIsOtherUserProfile(
          Boolean(loggedInUser?._id && userRes.data?._id && loggedInUser._id !== userRes.data._id)
        );

        // 2. Fetch User's Items
        const itemsRes = await API.get(`/items/user/${userId}`);
        setItems(itemsRes.data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast.error("Could not load user profile.");
      } finally {
        // Optional: Small timeout to prevent flicker on fast loads
        setTimeout(() => setLoading(false), 300);
      }
    };

    if (userId) fetchProfileData();
  }, [userId]);

  // --- REPLACED SPINNER WITH SKELETON COMPONENT ---
  if (loading) {
    return <PublicProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className={`min-h-screen ${isOtherUserProfile ? 'bg-gradient-to-br from-primary-muted via-white to-tertiary-muted text-foreground' : 'bg-surface-2'} flex flex-col transition-colors duration-200`}>
        <Navbar />
        <div className={`flex-1 flex flex-col items-center justify-center ${isOtherUserProfile ? 'text-foreground' : 'text-muted'}`}>
          <FaExclamationCircle className="text-4xl mb-4" />
          <p className="text-lg font-medium">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isOtherUserProfile ? 'bg-gradient-to-br from-primary-muted via-white to-tertiary-muted text-foreground' : 'bg-surface-2'} transition-colors duration-200 font-sans`}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* --- PROFILE HEADER CARD --- */}
        <div className={`rounded-3xl overflow-hidden relative transition-all duration-300 ${isOtherUserProfile ? 'bg-surface border border-primary shadow-2xl' : 'bg-surface shadow-xl border border-border'}`}>
          
          {/* 1. Cover Photo */}
          <div className={`h-48 sm:h-64 relative ${isOtherUserProfile ? 'bg-primary-muted' : 'bg-surface-muted'}`}>
            {profile.coverImage ? (
              <img 
                src={profile.coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary to-tertiary"></div>
            )}
          </div>

          <div className="px-6 pb-8">
            <div className="relative flex justify-between items-end -mt-16 mb-6">
              {/* 2. Profile Picture */}
              <div className="bg-surface p-1.5 rounded-full z-10">
                <div className="h-32 w-32 rounded-full bg-surface-muted overflow-hidden border-4 border-border-strong shadow-lg flex items-center justify-center">
                  {profile.profilePic ? (
                    <img src={profile.profilePic} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary-muted text-primary text-5xl font-bold">
                        {profile.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">{profile.name}</h1>
              
              {/* 3. User Details (Branch, Phone, Email, Joined) */}
              <div className="flex flex-wrap gap-3 text-sm font-medium mt-4">
                
                {/* Branch (Year/Department) */}
                {profile.year && ( 
                  <div className="flex items-center bg-surface-muted text-foreground px-3 py-1.5 rounded-lg border border-border">
                    <FaUniversity className="mr-2 text-primary" /> 
                    {profile.year}
                  </div>
                )}

                {/* Mobile Number */}
                {profile.phone && ( 
                  <div className="flex items-center bg-success-muted text-success px-3 py-1.5 rounded-lg border border-success">
                    <FaPhone className="mr-2" /> 
                    {profile.phone}
                  </div>
                )}

                {/* Email */}
                <div className="flex items-center bg-info-muted text-info px-3 py-1.5 rounded-lg border border-info">
                    <FaEnvelope className="mr-2" />
                    {profile.email}
                </div>

                {/* Join Date */}
                <div className="flex items-center text-muted px-2 py-1.5">
                  <FaCalendarAlt className="mr-2" />
                  Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ACTIVE LISTINGS GRID --- */}
        <div className={`mt-12 transition-colors duration-200 ${isOtherUserProfile ? 'bg-surface p-5 rounded-3xl border border-primary' : ''}`}>
          <div className="flex items-center mb-6">
            <div className="p-3 bg-primary-muted rounded-xl mr-4">
                <FaBoxOpen className="text-2xl text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-foreground">Active Listings</h2>
                <p className="text-sm text-muted">Items currently being sold by {profile.name.split(' ')[0]}</p>
            </div>
            <span className="ml-auto bg-surface-muted text-foreground text-sm font-bold px-4 py-1 rounded-full border border-border">
              {items.length} Items
            </span>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <Link 
                  to={`/item/${item._id}`} 
                  key={item._id}
                  className="group bg-surface rounded-2xl shadow-sm hover:shadow-xl border border-border overflow-hidden transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className="aspect-w-4 aspect-h-3 bg-surface-muted relative overflow-hidden h-48">
                    <img 
                      src={item.images[0]?.url || item.images[0]} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {item.isSold && (
                      <div className="absolute top-2 right-2 bg-danger text-white text-[10px] font-bold px-2 py-1 rounded shadow uppercase tracking-wider">
                        Sold
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-foreground truncate pr-2 flex-1">{item.title}</h3>
                        <p className="text-lg font-black text-primary">₹{item.price}</p>
                    </div>
                    <p className="text-sm text-muted line-clamp-2 mb-4 flex-1">
                        {item.description}
                    </p>
                    <div className="flex justify-between items-center text-xs font-semibold text-subtle pt-3 border-t border-border mt-auto">
                        <span className="uppercase tracking-wide">{item.category}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-surface rounded-3xl border-2 border-dashed border-border">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-muted mb-4">
                <FaBoxOpen className="text-3xl text-subtle" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No active listings</h3>
              <p className="text-muted mt-1">{profile.name} hasn't listed anything yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;