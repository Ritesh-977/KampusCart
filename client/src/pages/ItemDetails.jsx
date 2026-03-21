import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import API from '../api/axios'; // ✅ IMPORT AXIOS INSTANCE
import Navbar from '../components/Navbar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaCommentDots, 
  FaChevronRight, FaShare, FaFacebook, FaTwitter, FaLink, FaTimes, FaFlag,
  FaChevronLeft, FaChevronRight as FaArrowRight, FaCalendarAlt, FaUser, FaEye
} from 'react-icons/fa'; 

// --- SKELETON COMPONENT ---
const ItemDetailsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 animate-pulse">
    <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
      
      {/* LEFT: Image Skeleton */}
      <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
        <div className="rounded-2xl bg-slate-200 dark:bg-slate-700 h-80 sm:h-[450px] w-full shadow-lg"></div>
        <div className="flex gap-2 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-16 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
          ))}
        </div>
      </div>

      {/* RIGHT: Info Skeleton */}
      <div className="mt-10 px-4 sm:px-0 lg:mt-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          </div>
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
        <div className="mt-6 h-10 w-1/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="mt-8">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
          <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        </div>
        <div className="mt-8">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
          <div className="h-14 w-full bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        </div>
        <div className="mt-10 border-t dark:border-slate-700 pt-8">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
          <div className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-2xl border dark:border-cyan-700/50">
            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <div className="ml-4 flex-1 space-y-2">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  
  // State for Modals
  const [showShareModal, setShowShareModal] = useState(false);
  
  // State for Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await API.get(`/items/${id}`);
        setItem(res.data);
      } catch (err) {
        if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          console.error(err);
          toast.error("Failed to load item details.");
        }
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    fetchItem();
  }, [id]);

  const handleChat = async () => {
    // ✅ FIX 1: Check user object instead of token
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        toast.error("Please login to chat!", { position: "top-right" });
        navigate('/login');
        return;
    }
    
    const currentUserId = user._id || user.id;
    const sellerId = item.seller?._id || item.seller;

    if (String(currentUserId) === String(sellerId)) {
        toast.info("You cannot chat with yourself!", { position: "top-right" });
        return;
    }

    try {
        // ✅ FIX 2: Use API instance (Cookie sent automatically)
        const { data } = await API.post('/chat', { userId: sellerId });
        navigate('/chats', { state: { chat: data } }); 
    } catch (error) {
        toast.error("Failed to start chat.");
    }
  };

  const handleViewProfile = () => {
    const sellerId = item.seller?._id || item.seller;
    navigate(`/profile/view/${sellerId}`);
  };

  // --- SHARE FUNCTIONS ---
  const currentUrl = window.location.href;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("Link copied!");
      setShowShareModal(false);
    } catch (err) { toast.error("Failed to copy"); }
  };
  const shareToFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
  const shareToTwitter = () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=Check out this item!`, '_blank');
  const shareToWhatsapp = () => {
    const text = `Check out ${item.title} on KampusCart!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + currentUrl)}`;
    window.open(url, '_blank');
  };

  // REPORT FUNCTION
  const handleReportSubmit = async () => {
    if (!reportReason) return toast.warning("Please select a reason.");
    
    // ✅ FIX 3: Check user object instead of token
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        toast.error("Please login to report items.");
        return navigate('/login');
    }

    try {
        setIsReporting(true);
        // ✅ FIX 4: Use API instance
        await API.post(`/items/${id}/report`, { reason: reportReason });
        toast.success("Item reported to Admin. Thank you for keeping our community safe!");
        setShowReportModal(false);
    } catch (error) {
        const msg = error.response?.data?.message || "Failed to report item.";
        toast.error(msg);
    } finally {
        setIsReporting(false);
    }
  };

  const getWhatsappLink = (number, title) => {
    const cleanNumber = number.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi, I'm interested in: ${title}. Link: ${currentUrl}`);
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  const user = JSON.parse(localStorage.getItem('user'));
  const isOtherCollege = !!(user && item?.college && user.college !== item.college);

  const displayName = item ? (item.sellerName || item.seller.name) : '';
  const displayEmail = item ? (item.sellerEmail || item.seller.email) : '';

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-200">
      <Navbar />
      <ToastContainer />
      
      {loading ? (
        <ItemDetailsSkeleton />
      ) : accessDenied ? (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Outside Your Campus</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            You cannot interact with items outside your college. This listing belongs to a different campus marketplace.
          </p>
          <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-teal-600 transition shadow-lg">
            Go Back
          </button>
        </div>
      ) : !item ? (
        <div className="text-center py-20 text-gray-600 dark:text-gray-400">Item not found.</div>
      ) : (
        <>
          {/* ZOOM MODAL */}
          {isZoomed && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
              <img src={item.images[activeImage]} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
            </div>
          )}

          {/* SHARE MODAL */}
          {showShareModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setShowShareModal(false)}>
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-cyan-200 dark:border-cyan-700/50 animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-cyan-200 dark:border-cyan-700/50 pb-4">
                  <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                    <FaShare className="text-cyan-500" />
                    Share Item
                  </h3>
                  <button 
                    onClick={() => setShowShareModal(false)} 
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <FaTimes className="text-slate-400 hover:text-slate-600" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button 
                    onClick={shareToFacebook} 
                    className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-blue-200 dark:border-blue-800"
                  >
                    <FaFacebook className="text-3xl text-blue-600" />
                    <span className="text-sm font-medium dark:text-blue-300">Facebook</span>
                  </button>
                  
                  <button 
                    onClick={shareToTwitter} 
                    className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-blue-200 dark:border-blue-800"
                  >
                    <FaTwitter className="text-3xl text-blue-400" />
                    <span className="text-sm font-medium dark:text-blue-300">Twitter</span>
                  </button>
                  
                  <button 
                    onClick={shareToWhatsapp} 
                    className="flex flex-col items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-green-200 dark:border-green-800"
                  >
                    <FaWhatsapp className="text-3xl text-green-500" />
                    <span className="text-sm font-medium dark:text-green-300">WhatsApp</span>
                  </button>
                  
                  <button 
                    onClick={copyLink} 
                    className="flex flex-col items-center gap-3 p-4 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-cyan-200 dark:border-cyan-800"
                  >
                    <FaLink className="text-3xl text-cyan-500" />
                    <span className="text-sm font-medium dark:text-cyan-300">Copy Link</span>
                  </button>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Or share this link:</p>
                  <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 break-all">
                    {currentUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT MODAL */}
          {showReportModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setShowReportModal(false)}>
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-200 dark:border-red-700/50 animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-red-600 flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <FaFlag className="text-red-600" />
                      </div>
                      Report Item
                    </h3>
                    <button 
                      onClick={() => setShowReportModal(false)} 
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                    >
                      <FaTimes className="text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-slate-600 dark:text-slate-300 mb-6 text-center font-medium">Why are you reporting this item?</p>
                  
                  <div className="space-y-3 mb-6">
                    {['Spam / Misleading', 'Fraud / Scam', 'Inappropriate Content', 'Duplicate Listing', 'Item Already Sold'].map((reason) => (
                        <label 
                          key={reason} 
                          className="flex items-center space-x-4 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                        >
                            <input 
                                type="radio" name="reportReason" value={reason} 
                                checked={reportReason === reason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="text-red-600 focus:ring-red-500 w-4 h-4"
                            />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{reason}</span>
                        </label>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleReportSubmit} 
                    disabled={isReporting || !reportReason} 
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-[1.02] flex items-center justify-center"
                  >
                    {isReporting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Sending Report...
                      </>
                    ) : (
                      <>
                        <FaFlag className="mr-3" />
                        Submit Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="flex mb-6" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <button onClick={() => navigate('/')} className="inline-flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition">
                    <FaChevronRight className="w-3 h-3 mr-2 rotate-180" />
                    Home
                  </button>
                </li>
                <li>
                  <div className="flex items-center">
                    <FaChevronRight className="w-3 h-3 text-slate-400 mx-1" />
                    <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400 md:ml-2">{item.category}</span>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <FaChevronRight className="w-3 h-3 text-slate-400 mx-1" />
                    <span className="ml-1 text-sm font-medium text-cyan-600 dark:text-cyan-400 md:ml-2">{item.title}</span>
                  </div>
                </li>
              </ol>
            </nav>

            <div className="lg:grid lg:grid-cols-2 lg:gap-x-16 lg:items-start">
              
              {/* LEFT: IMAGES */}
              <div className="flex flex-col gap-6 max-w-md mx-auto lg:mx-0 animate-fadeIn" style={{ animation: 'fadeUpIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                {/* Main Image Container */}
                <div className="relative group">
                  <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-white to-cyan-50 dark:from-slate-800 dark:to-slate-900 h-80 sm:h-[500px] relative flex items-center justify-center cursor-zoom-in border-2 border-cyan-200 dark:border-cyan-700/50 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:border-cyan-400" onClick={() => setIsZoomed(true)}>
                    <img src={item.images[activeImage]} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" alt="" />
                    
                    {/* Zoom Indicator */}
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FaEye className="text-white text-sm" />
                    </div>
                    
                    {/* Navigation Arrows */}
                    {item.images.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveImage((activeImage - 1 + item.images.length) % item.images.length); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                        >
                          <FaChevronLeft />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveImage((activeImage + 1) % item.images.length); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                        >
                          <FaArrowRight />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Image Counter */}
                  {item.images.length > 1 && (
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                      {activeImage + 1} / {item.images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {item.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide px-2">
                    {item.images.map((img, index) => (
                      <button 
                        key={index} 
                        onClick={() => setActiveImage(index)} 
                        className={`relative flex-shrink-0 h-20 w-20 rounded-xl overflow-hidden border-3 transition-all duration-200 ${
                          activeImage === index 
                            ? 'border-cyan-500 shadow-lg shadow-cyan-500/30 scale-110' 
                            : 'border-slate-300 dark:border-slate-700 hover:border-cyan-400'
                        }`}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                        {activeImage === index && (
                          <div className="absolute inset-0 bg-cyan-500/20 rounded-xl"></div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: INFO */}
              <div className="mt-12 px-4 sm:px-0 lg:mt-0 animate-fadeIn" style={{ animation: 'fadeUpIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards', animationFillMode: 'both' }}>
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold uppercase rounded-full shadow-md">
                        {item.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-md ${
                        item.isSold 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {item.isSold ? 'SOLD' : 'AVAILABLE'}
                      </span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-3">{item.title}</h1>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowShareModal(true)} 
                        className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-cyan-600 rounded-xl transition-all duration-200 hover:scale-105 shadow-md"
                      >
                        <FaShare size={16} />
                      </button>
                      <button 
                        onClick={() => setShowReportModal(true)} 
                        className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 rounded-xl transition-all duration-200 hover:scale-105 shadow-md"
                      >
                        <FaFlag size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-3 mb-2">
                    <p className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                      ₹{item.price.toLocaleString('en-IN')}
                    </p>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <p className="text-xl text-slate-500 dark:text-slate-400 line-through">
                        ₹{item.originalPrice.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-bold rounded-full">
                      Save ₹{(item.originalPrice - item.price).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {/* Description Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Description</h3>
                  </div>
                  <div className="bg-gradient-to-br from-white to-cyan-50/50 dark:from-slate-800 dark:to-slate-900/50 p-6 rounded-2xl border border-cyan-200 dark:border-cyan-700/50 shadow-lg hover:shadow-xl transition-all duration-300 whitespace-pre-line text-gray-700 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Location Card */}
                  <div className="bg-gradient-to-br from-white to-cyan-50/30 dark:from-slate-800 dark:to-slate-900/30 p-5 rounded-2xl border border-cyan-200 dark:border-cyan-700/50 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                        <FaMapMarkerAlt className="text-cyan-600 dark:text-cyan-400 text-lg" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Location</h4>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">{item.location || "Not specified"}</p>
                  </div>

                  {/* Date Posted Card */}
                  <div className="bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-800 dark:to-slate-900/30 p-5 rounded-2xl border border-teal-200 dark:border-teal-700/50 shadow-md hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                        <FaCalendarAlt className="text-teal-600 dark:text-teal-400 text-lg" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200">Posted</h4>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">{new Date(item.createdAt).toLocaleDateString('en-IN', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                </div>

                {/* Seller Card */}
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-teal-500 rounded-full"></div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Seller Information</h3>
                  </div>
                  
                  <div 
                    onClick={handleViewProfile} 
                    className="bg-gradient-to-r from-white via-cyan-50/20 to-teal-50/20 dark:from-slate-800 dark:via-slate-900/50 dark:to-slate-800 p-6 rounded-3xl border border-cyan-200 dark:border-cyan-700/50 shadow-lg hover:shadow-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400 dark:hover:border-cyan-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-lg">
                            {item.seller.profilePic ? (
                              <img src={item.seller.profilePic} className="h-full w-full object-cover" alt="" />
                            ) : (
                              displayName.charAt(0)
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                            <FaUser className="text-white text-xs" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{displayName}</h4>
                          <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{displayEmail}</p>
                        </div>
                      </div>
                      
                      <div className="text-cyan-500 dark:text-cyan-400">
                        <FaChevronRight className="text-2xl" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4">
                  {isOtherCollege ? (
                    <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-700/50 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-400">
                        <FaMapMarkerAlt className="text-lg" />
                        <span className="font-bold text-center">Available only for {item.college} students</span>
                      </div>
                    </div>
                  ) : !item.isSold ? (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Primary Action - Chat */}
                      <button 
                        onClick={handleChat} 
                        className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 via-cyan-600 to-teal-500 text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FaCommentDots className="mr-3 text-xl relative z-10" />
                        <span className="relative z-10">Chat with Seller</span>
                      </button>

                      {/* Secondary Actions Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {item.contactNumber && (
                          <a 
                            href={getWhatsappLink(item.contactNumber, item.title)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="group bg-[#25D366] hover:bg-[#128C7E] text-white py-4 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center"
                          >
                            <FaWhatsapp className="mr-3 text-2xl" />
                            WhatsApp
                          </a>
                        )}
                        
                        <a 
                          href={`mailto:${displayEmail}`} 
                          className="group bg-white dark:bg-slate-800 border-2 border-cyan-300 dark:border-cyan-700/50 hover:border-cyan-500 text-gray-700 dark:text-slate-200 py-4 px-6 rounded-2xl font-bold hover:bg-cyan-50 dark:hover:bg-slate-700 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center shadow-md hover:shadow-lg"
                        >
                          <FaEnvelope className="mr-3 text-lg" />
                          Email
                        </a>
                      </div>

                      {/* Share Button for Mobile */}
                      <button 
                        onClick={() => setShowShareModal(true)} 
                        className="sm:hidden bg-slate-100 dark:bg-slate-800 hover:bg-cyan-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 py-4 px-6 rounded-2xl font-bold transition-all duration-300 hover:scale-[1.02] flex items-center justify-center shadow-md hover:shadow-lg"
                      >
                        <FaShare className="mr-3" />
                        Share Item
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 p-6 rounded-2xl border border-slate-300 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-400">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-bold text-center">This item has been sold</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ItemDetails;