import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { FaHeart, FaRegHeart, FaCommentDots } from 'react-icons/fa'; 
import API from '../api/axios'; 
import { toast } from 'react-toastify';

const ItemCard = ({ item, isWishlisted, onToggleWishlist }) => {
  const navigate = useNavigate(); 

  const imageSrc = item.image || (item.images && item.images.length > 0 ? item.images[0] : 'https://via.placeholder.com/400');

  const handleHeartClick = (e) => {
      e.preventDefault();    
      e.stopPropagation();   
      onToggleWishlist(e);   
  };

  const handleChatClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const token = localStorage.getItem('token');
      if (!token) {
          toast.error("Please login to chat with the seller!", { position: "top-right", autoClose: 3000 });
          return;
      }

      const user = JSON.parse(localStorage.getItem('user'));
      const sellerId = (item.seller && typeof item.seller === 'object') ? item.seller._id : item.seller;
      const currentUserId = user._id || user.id;

      if (String(currentUserId) === String(sellerId)) {
          toast.info("You cannot chat with yourself! This is your item.", { position: "top-right", autoClose: 3000 });
          return;
      }

      try {
          const { data } = await API.post('/chat', { userId: sellerId });
          navigate('/chats', { state: { chat: data } }); 
      } catch (error) {
          console.error("Error starting chat", error);
          toast.error("Failed to start chat. Please try again.", { position: "top-right" });
      }
  };
  
  return (
    // FIX 1: Card Background & Border
    <div className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 ease-in-out">
      
      {/* Image Container */}
      <div className="aspect-w-1 aspect-h-1 bg-gray-200 dark:bg-gray-700 group-hover:opacity-90 h-56 relative">
        <img
          src={imageSrc}
          alt={item.title}
          className="w-full h-full object-center object-cover"
        />
        
        {/* FIX 2: Wishlist Button (Dark Mode Background) */}
        <button
          onClick={handleHeartClick}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 z-30 group/heart cursor-pointer"
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          {isWishlisted ? (
            <FaHeart className="text-pink-500 text-lg drop-shadow-sm" />
          ) : (
            <FaRegHeart className="text-gray-400 dark:text-gray-300 text-lg group-hover/heart:text-pink-500 transition-colors" />
          )}
        </button>

        {/* FIX 3: Chat Button (Dark Mode Colors) */}
        <button
          onClick={handleChatClick}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 z-30 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer group/chat"
          title="Chat with Seller"
        >
           <FaCommentDots className="text-lg group-hover/chat:scale-110 transition-transform" />
        </button>

        {/* FIX 4: Status Badge (Dark Mode Colors) */}
        <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full text-gray-700 dark:text-gray-200 uppercase tracking-wider shadow-sm z-20">
          {item.isSold ? <span className="text-red-600 dark:text-red-400">Sold</span> : <span className="text-green-600 dark:text-green-400">Available</span>}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col justify-between relative">
        <div>
          {/* FIX 5: Category Text */}
          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">{item.category}</p>
          {/* FIX 6: Title Text */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            <Link to={`/item/${item._id}`}>
              <span aria-hidden="true" className="absolute inset-0 z-10" />
              {item.title}
            </Link>
          </h3>
        </div>

        <div className="mt-4 flex items-end justify-between relative z-20">
            {/* FIX 7: Price Text */}
            <p className="text-xl font-bold text-gray-900 dark:text-white">
                ₹{item.price ? item.price.toLocaleString('en-IN') : '0'}
            </p>
            {/* FIX 8: Link Text */}
            <span className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium pointer-events-none">
                View Details
            </span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;