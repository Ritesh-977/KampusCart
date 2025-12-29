import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaCommentDots } from 'react-icons/fa';

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await API.get(`/items/${id}`);
        setItem(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load item details.");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleChat = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
        toast.error("Please login to chat with the seller!", { position: "top-right", autoClose: 3000 });
        navigate('/login');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    const currentUserId = user._id || user.id;
    const sellerId = item.seller?._id || item.seller;

    if (String(currentUserId) === String(sellerId)) {
        toast.info("You cannot chat with yourself! This is your item.", { position: "top-right", autoClose: 3000 });
        return;
    }

    try {
        const { data } = await API.post('/chat', { userId: sellerId });
        navigate('/chats', { state: { chat: data } }); 
    } catch (error) {
        console.error("Error starting chat:", error);
        toast.error("Failed to start chat. Please try again.", { position: "top-right" });
    }
  };

  if (loading) return <div className="text-center py-20 font-medium text-indigo-600 dark:text-indigo-400">Loading item details...</div>;
  if (!item) return <div className="text-center py-20 text-gray-600 dark:text-gray-300">Item not found.</div>;

  const getWhatsappLink = (number, title) => {
    const cleanNumber = number.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi, I'm interested in your listing: ${title} on CampusMart.`);
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  return (
    // FIX 1: Page Background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <ToastContainer />

      {isZoomed && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <button className="absolute top-6 right-6 text-white text-4xl hover:text-gray-300 transition">&times;</button>
          <img
            src={item.images[activeImage]}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            alt="Full size preview"
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
          
          {/* LEFT: IMAGE GALLERY */}
          <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
            {/* FIX 2: Image Container Background/Border */}
            <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 h-80 sm:h-[450px] relative flex items-center justify-center"
               onClick={() => setIsZoomed(true)}
            >
              <img
                src={item.images[activeImage]}
                alt={item.title}
                className="w-full h-full object-contain"
              />
              {item.images.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm font-bold">
                  {activeImage + 1} / {item.images.length}
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <span className="bg-white/90 text-gray-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-md">Click to enlarge</span>
              </div>
            </div>

            {item.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {item.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    // FIX 3: Thumbnails in Dark Mode
                    className={`relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all bg-white dark:bg-gray-800 ${activeImage === index
                        ? 'border-indigo-600 shadow-sm'
                        : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                  >
                    <img src={img} alt={`Thumb ${index}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: ITEM INFO */}
          <div className="mt-10 px-4 sm:px-0 lg:mt-0">
            <div className="flex justify-between items-start">
              <div>
                {/* FIX 4: Title Text */}
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{item.title}</h1>
                {/* FIX 5: Category Text */}
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase tracking-widest">{item.category}</p>
              </div>
              {/* FIX 6: Status Badge (Dark mode friendly) */}
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${item.isSold 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {item.isSold ? 'SOLD' : 'AVAILABLE'}
              </span>
            </div>

            <div className="mt-6">
              {/* FIX 7: Price Text */}
              <p className="text-4xl text-gray-900 dark:text-white font-black">₹{item.price.toLocaleString('en-IN')}</p>
            </div>

            <div className="mt-8">
              <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Description</h3>
              {/* FIX 8: Description Box */}
              <div className="mt-3 text-base text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                {item.description}
              </div>
            </div>

            {/* --- LOCATION SECTION --- */}
            <div className="mt-8">
              <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Location</h3>
              {/* FIX 9: Location Box */}
              <div className="mt-3 flex items-center text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                 <FaMapMarkerAlt className="text-indigo-500 dark:text-indigo-400 text-lg mr-3" />
                 <span className="font-medium">{item.location || "Location not specified by seller"}</span>
              </div>
            </div>

            {/* Seller Information Card */}
            <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Seller Information</h3>
              {/* FIX 10: Seller Card */}
              <div className="mt-4 flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-inner overflow-hidden">
                  {item.seller.profilePic ? <img src={item.seller.profilePic} className="h-full w-full object-cover" alt="" /> : item.seller.name.charAt(0)}
                </div>
                <div className="ml-4">
                  {/* FIX 11: Seller Name & Email */}
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{item.seller.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.sellerEmail || item.seller.email}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!item.isSold ? (
                <>
                  {/* --- CHAT BUTTON --- */}
                  <button
                    onClick={handleChat}
                    className="col-span-1 sm:col-span-2 flex items-center justify-center bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95"
                  >
                    <FaCommentDots className="mr-2 text-xl" /> Chat with Seller
                  </button>

                  {item.contactNumber && (
                    <a
                      href={getWhatsappLink(item.contactNumber, item.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center bg-[#25D366] text-white py-4 rounded-xl font-bold hover:bg-[#128C7E] transition shadow-lg shadow-green-100 dark:shadow-none active:scale-95"
                    >
                      <FaWhatsapp className="mr-2 text-2xl" /> WhatsApp
                    </a>
                  )}

                  {/* FIX 12: Email Button (White in Light, Dark Gray in Dark) */}
                  <a
                    href={`mailto:${item.seller.email}?subject=Interest in ${item.title}`}
                    className="flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-4 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95"
                  >
                    <FaEnvelope className="mr-2 text-lg" /> Email Seller
                  </a>
                </>
              ) : (
                <button disabled className="sm:col-span-2 w-full bg-gray-200 dark:bg-gray-800 rounded-xl py-4 text-base font-bold text-gray-400 dark:text-gray-500 cursor-not-allowed uppercase tracking-widest">
                  This item has been sold
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;