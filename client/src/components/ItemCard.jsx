import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { FaHeart, FaRegHeart, FaCommentDots } from 'react-icons/fa'; 
import API from '../api/axios'; // ✅ Using configured Axios instance
import { toast } from 'react-toastify';

const ItemCard = ({ item, isWishlisted, onToggleWishlist }) => {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user'));
  const isOtherCollege = !!(user && item.college && user.college !== item.college);

  // images can be a plain string URL (legacy) or a {url, public_id} object (new)
  const resolveUrl = (img) => (img && typeof img === 'object' ? img.url : img) || null;
  const imageSrc = item.image || resolveUrl(item.images?.[0]) || 'https://placehold.co/400x300?text=No+Image';

  const handleHeartClick = (e) => {
      e.preventDefault();    
      e.stopPropagation();   
      onToggleWishlist(e);   
  };

  const handleChatClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // ✅ FIX 1: Check for 'user' object instead of 'token'
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user) {
          toast.error("Please login to chat with the seller!", { position: "top-right", autoClose: 3000 });
          return;
      }

      const sellerId = (item.seller && typeof item.seller === 'object') ? item.seller._id : item.seller;
      const currentUserId = user._id || user.id;

      if (String(currentUserId) === String(sellerId)) {
          toast.info("You cannot chat with yourself! This is your item.", { position: "top-right", autoClose: 3000 });
          return;
      }

      try {
          // ✅ FIX 2: Use API instance (Cookie sent automatically)
          const { data } = await API.post('/chat', { userId: sellerId });
          navigate('/chats', { state: { chat: data } }); 
      } catch (error) {
          console.error("Error starting chat", error);
          toast.error("Failed to start chat. Please try again.", { position: "top-right" });
      }
  };
  
  return (
    // FIX 3: Card Background & Border with smooth fade-up animation
    <div className="item-card-animate group relative bg-surface border border-border rounded-xl flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 ease-in-out opacity-0" style={{ 
      animation: 'fadeUpIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      animationDelay: 'var(--animation-delay, 0s)'
    }}>
      
      {/* Image Container */}
      <div className="aspect-w-1 aspect-h-1 bg-surface-muted group-hover:opacity-90 h-56 relative">
        <img
          src={imageSrc}
          alt={item.title}
          className="w-full h-full object-center object-cover"
        />
        
        {/* FIX 4: Wishlist Button (Dark Mode Background) */}
        <button
          onClick={handleHeartClick}
          className="absolute top-2 right-2 p-2 rounded-full bg-surface/90 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 z-30 group/heart cursor-pointer"
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          {isWishlisted ? (
            <FaHeart className="text-danger text-lg drop-shadow-sm" />
          ) : (
            <FaRegHeart className="text-subtle text-lg group-hover/heart:text-danger transition-colors" />
          )}
        </button>

        {/* Chat Button — disabled for cross-college items */}
        {isOtherCollege ? (
          <div
            className="absolute bottom-2 right-2 p-2 rounded-full bg-surface/90 backdrop-blur-sm shadow-sm z-30 text-subtle cursor-not-allowed"
            title={`Available only for ${item.college} students`}
          >
            <FaCommentDots className="text-lg" />
          </div>
        ) : (
          <button
            onClick={handleChatClick}
            className="absolute bottom-2 right-2 p-2 rounded-full bg-surface/90 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all duration-200 z-30 text-primary hover:text-primary dark:hover:text-primary cursor-pointer group/chat"
            title="Chat with Seller"
          >
            <FaCommentDots className="text-lg group-hover/chat:scale-110 transition-transform" />
          </button>
        )}

        {/* FIX 6: Status Badge (Dark Mode Colors) */}
        <div className="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full text-foreground uppercase tracking-wider shadow-sm z-20">
          {item.isSold ? <span className="text-danger">Sold</span> : <span className="text-success">Available</span>}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col justify-between relative">
        <div>
          {/* FIX 7: Category Text */}
          <p className="text-sm text-primary font-medium mb-1">{item.category}</p>
          {/* FIX 8: Title Text */}
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">
            <Link to={`/item/${item._id}`}>
              <span aria-hidden="true" className="absolute inset-0 z-10" />
              {item.title}
            </Link>
          </h3>
        </div>

        <div className="mt-4 flex items-end justify-between relative z-20">
            {/* FIX 9: Price Text */}
            <p className="text-xl font-bold text-foreground">
                ₹{item.price ? item.price.toLocaleString('en-IN') : '0'}
            </p>
            {/* FIX 10: Link Text */}
            <span className="text-sm text-primary hover:text-primary text-primary dark:hover:text-primary font-medium pointer-events-none">
                View Details
            </span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;