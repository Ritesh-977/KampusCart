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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 font-sans">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        
        {/* Profile Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 relative">
          {/* Cover Photo */}
          <div className="h-48 sm:h-64 bg-gray-200 dark:bg-gray-700"></div>
          
          <div className="px-6 pb-8">
            <div className="relative flex justify-between items-end -mt-16 mb-6">
              {/* Profile Pic */}
              <div className="bg-white dark:bg-gray-800 p-1.5 rounded-full z-10">
                <div className="h-32 w-32 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-800"></div>
              </div>
            </div>

            <div>
              {/* Name Skeleton */}
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              
              {/* Details Pills Skeleton */}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Header Skeleton */}
        <div className="mt-12 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
             <div className="space-y-2">
               <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
               <div className="h-4 w-60 bg-gray-200 dark:bg-gray-700 rounded"></div>
             </div>
          </div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* Items Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="h-48 bg-gray-200 dark:bg-gray-700 w-full"></div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex justify-between">
                  <div className="h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                   <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                   <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
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

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // 1. Fetch Public User Details
        const userRes = await API.get(`/users/${userId}`); 
        setProfile(userRes.data);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <FaExclamationCircle className="text-4xl mb-4" />
          <p className="text-lg font-medium">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* --- PROFILE HEADER CARD --- */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 relative">
          
          {/* 1. Cover Photo */}
          <div className="h-48 sm:h-64 relative bg-gray-300 dark:bg-gray-700">
            {profile.coverImage ? (
              <img 
                src={profile.coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600"></div>
            )}
          </div>

          <div className="px-6 pb-8">
            <div className="relative flex justify-between items-end -mt-16 mb-6">
              {/* 2. Profile Picture */}
              <div className="bg-white dark:bg-gray-800 p-1.5 rounded-full z-10">
                <div className="h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center">
                  {profile.profilePic ? (
                    <img src={profile.profilePic} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-5xl font-bold">
                        {profile.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{profile.name}</h1>
              
              {/* 3. User Details (Branch, Phone, Email, Joined) */}
              <div className="flex flex-wrap gap-3 text-sm font-medium mt-4">
                
                {/* Branch (Year/Department) */}
                {profile.year && ( 
                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                    <FaUniversity className="mr-2 text-indigo-500" /> 
                    {profile.year}
                  </div>
                )}

                {/* Mobile Number */}
                {profile.phone && ( 
                  <div className="flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                    <FaPhone className="mr-2" /> 
                    {profile.phone}
                  </div>
                )}

                {/* Email */}
                <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <FaEnvelope className="mr-2" />
                    {profile.email}
                </div>

                {/* Join Date */}
                <div className="flex items-center text-gray-500 dark:text-gray-400 px-2 py-1.5">
                  <FaCalendarAlt className="mr-2" />
                  Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ACTIVE LISTINGS GRID --- */}
        <div className="mt-12">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl mr-4">
                <FaBoxOpen className="text-2xl text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Active Listings</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Items currently being sold by {profile.name.split(' ')[0]}</p>
            </div>
            <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold px-4 py-1 rounded-full border border-gray-200 dark:border-gray-600">
              {items.length} Items
            </span>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <Link 
                  to={`/item/${item._id}`} 
                  key={item._id}
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className="aspect-w-4 aspect-h-3 bg-gray-100 dark:bg-gray-700 relative overflow-hidden h-48">
                    <img 
                      src={item.images[0]} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {item.isSold && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow uppercase tracking-wider">
                        Sold
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-2 flex-1">{item.title}</h3>
                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{item.price}</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                        {item.description}
                    </p>
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                        <span className="uppercase tracking-wide">{item.category}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <FaBoxOpen className="text-3xl text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active listings</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{profile.name} hasn't listed anything yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;