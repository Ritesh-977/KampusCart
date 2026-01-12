import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import API from '../api/axios'; // ✅ IMPORT AXIOS INSTANCE
import Navbar from '../components/Navbar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaCommentDots, 
  FaChevronRight, FaShare, FaFacebook, FaTwitter, FaLink, FaTimes, FaFlag 
} from 'react-icons/fa'; 

// --- SKELETON COMPONENT ---
const ItemDetailsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 animate-pulse">
    <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
      
      {/* LEFT: Image Skeleton */}
      <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
        <div className="rounded-2xl bg-gray-200 dark:bg-gray-800 h-80 sm:h-[450px] w-full"></div>
        <div className="flex gap-2 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-800"></div>
          ))}
        </div>
      </div>

      {/* RIGHT: Info Skeleton */}
      <div className="mt-10 px-4 sm:px-0 lg:mt-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
          </div>
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
        </div>
        <div className="mt-6 h-10 w-1/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="mt-8">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>
          <div className="h-32 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
        </div>
        <div className="mt-8">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>
          <div className="h-14 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
        </div>
        <div className="mt-10 border-t dark:border-gray-700 pt-8">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700">
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="ml-4 flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 h-14 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-14 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-14 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
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

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await API.get(`/items/${id}`);
        setItem(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load item details.");
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

  const displayName = item ? (item.sellerName || item.seller.name) : '';
  const displayEmail = item ? (item.sellerEmail || item.seller.email) : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <ToastContainer />
      
      {loading ? (
        <ItemDetailsSkeleton />
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
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowShareModal(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b pb-4 dark:border-gray-700">
                  <h3 className="font-bold dark:text-white">Share Item</h3>
                  <button onClick={() => setShowShareModal(false)}><FaTimes className="text-gray-400" /></button>
                </div>
                <div className="flex justify-around mb-4">
                  <button onClick={shareToFacebook} className="flex flex-col items-center gap-1"><FaFacebook className="text-3xl text-blue-600" /><span className="text-xs dark:text-gray-300">Facebook</span></button>
                  <button onClick={shareToTwitter} className="flex flex-col items-center gap-1"><FaTwitter className="text-3xl text-blue-400" /><span className="text-xs dark:text-gray-300">Twitter</span></button>
                  <button onClick={shareToWhatsapp} className="flex flex-col items-center gap-1"><FaWhatsapp className="text-3xl text-green-500" /><span className="text-xs dark:text-gray-300">WhatsApp</span></button>
                  <button onClick={copyLink} className="flex flex-col items-center gap-1"><FaLink className="text-3xl text-gray-600" /><span className="text-xs dark:text-gray-300">Copy</span></button>
                </div>
              </div>
            </div>
          )}

          {/* REPORT MODAL */}
          {showReportModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowReportModal(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/20">
                  <h3 className="font-bold text-red-600 flex items-center gap-2"><FaFlag /> Report Item</h3>
                  <button onClick={() => setShowReportModal(false)}><FaTimes className="text-gray-400" /></button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Why are you reporting this?</p>
                  <div className="space-y-2">
                    {['Spam / Misleading', 'Fraud / Scam', 'Inappropriate Content', 'Duplicate Listing', 'Item Already Sold'].map((reason) => (
                        <label key={reason} className="flex items-center space-x-3 p-3 rounded-lg border dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                            <input 
                                type="radio" name="reportReason" value={reason} 
                                checked={reportReason === reason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{reason}</span>
                        </label>
                    ))}
                  </div>
                  <button onClick={handleReportSubmit} disabled={isReporting} className="w-full mt-6 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50">
                    {isReporting ? 'Sending...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
              
              {/* LEFT: IMAGES */}
              <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
                <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 h-80 sm:h-[450px] relative flex items-center justify-center cursor-zoom-in" onClick={() => setIsZoomed(true)}>
                  <img src={item.images[activeImage]} className="w-full h-full object-contain" alt="" />
                </div>
                {item.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                    {item.images.map((img, index) => (
                      <button key={index} onClick={() => setActiveImage(index)} className={`h-16 w-16 rounded-lg overflow-hidden border-2 ${activeImage === index ? 'border-indigo-600' : 'border-transparent'}`}>
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: INFO */}
              <div className="mt-10 px-4 sm:px-0 lg:mt-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{item.title}</h1>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase">{item.category}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${item.isSold ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.isSold ? 'SOLD' : 'AVAILABLE'}
                      </span>
                      
                      <div className="flex gap-1">
                        <button onClick={() => setShowShareModal(true)} className="p-2 text-gray-400 hover:text-indigo-600 transition"><FaShare size={18} /></button>
                        <button onClick={() => setShowReportModal(true)} className="p-2 text-gray-400 hover:text-red-600 transition"><FaFlag size={18} /></button>
                      </div>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-4xl text-gray-900 dark:text-white font-black">₹{item.price.toLocaleString('en-IN')}</p>
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</h3>
                  <div className="mt-3 text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm whitespace-pre-line">
                    {item.description}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Location</h3>
                  <div className="mt-3 flex items-center text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 shadow-sm">
                      <FaMapMarkerAlt className="text-indigo-500 mr-3" />
                      <span className="font-medium">{item.location || "Not specified"}</span>
                  </div>
                </div>

                {/* Seller Card */}
                <div className="mt-10 border-t dark:border-gray-700 pt-8">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Seller</h3>
                  <div onClick={handleViewProfile} className="mt-4 flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-md transition">
                    <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                      {item.seller.profilePic ? <img src={item.seller.profilePic} className="h-full w-full object-cover" alt="" /> : displayName.charAt(0)}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayEmail}</p>
                    </div>
                    <FaChevronRight className="text-gray-400" />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {!item.isSold ? (
                    <>
                      <button onClick={handleChat} className="sm:col-span-2 flex items-center justify-center bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg">
                        <FaCommentDots className="mr-2 text-xl" /> Chat with Seller
                      </button>
                      {item.contactNumber && (
                        <a href={getWhatsappLink(item.contactNumber, item.title)} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#128C7E] transition shadow-lg">
                          <FaWhatsapp className="mr-2 text-2xl" /> WhatsApp
                        </a>
                      )}
                      <a href={`mailto:${displayEmail}`} className="flex items-center justify-center bg-white dark:bg-gray-800 border-2 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-4 rounded-xl font-bold hover:bg-gray-50 transition">
                        <FaEnvelope className="mr-2 text-lg" /> Email
                      </a>
                      <button onClick={() => setShowShareModal(true)} className="sm:hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 py-4 rounded-xl font-bold">
                          <FaShare className="mr-2" /> Share
                      </button>
                    </>
                  ) : (
                    <button disabled className="sm:col-span-2 w-full bg-gray-200 rounded-xl py-4 font-bold text-gray-400 cursor-not-allowed">
                      This item has been sold
                    </button>
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