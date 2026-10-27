import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FaHeart, FaMapMarkerAlt, FaSadTear, FaExternalLinkAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios'; // ✅ IMPORT YOUR AXIOS INSTANCE

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        // ✅ FIX 1: Use API instead of fetch
        // No need to manually set Authorization header, cookie is sent automatically
        const { data } = await API.get('/users/wishlist');
        setItems(data);
      } catch (err) {
        console.error("Failed to fetch wishlist", err);
        // Optional: specific error handling
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  const handleRemove = async (e, itemId) => {
    e.preventDefault(); 
    
    // Optimistic UI update (remove immediately)
    setItems(items.filter(item => item._id !== itemId));

    try {
      // ✅ FIX 2: Use API.post
      await API.post('/users/wishlist', { itemId });
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error("Could not remove item");
      // Optional: Revert state if failed
    }
  };

  if (loading) return (
      <div className="min-h-screen flex items-center justify-center bg-surface-2 transition-colors">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-danger"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-surface-2 font-sans pb-20 transition-colors duration-200">
      <Navbar />

      {/* Header */}
      <div className="bg-danger pt-10 pb-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold text-white">My Wishlist</h1>
            <p className="mt-2 text-danger text-lg">Items you are keeping an eye on.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        
        {items.length === 0 ? (
           <div className="bg-surface rounded-2xl shadow-xl p-10 text-center flex flex-col items-center border border-border transition-colors">
              <FaSadTear className="text-subtle text-6xl mb-4" />
              <h3 className="text-xl font-bold text-foreground">Your wishlist is empty</h3>
              <p className="text-muted mt-2 mb-6">Explore the marketplace and save items you like!</p>
              <Link to="/" className="px-6 py-3 bg-danger hover:bg-danger bg-danger dark:hover:bg-danger text-white rounded-full font-bold transition shadow-md">
                  Browse Items
              </Link>
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <div key={item._id} className="group relative bg-surface rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-border overflow-hidden flex flex-col">
                    
                    <Link to={`/item/${item._id}`} className="absolute inset-0 z-0" />

                    <div className="relative h-56 w-full bg-surface-muted overflow-hidden">
                       <img 
                        src={item.image || (item.images && (item.images[0]?.url || item.images[0]))} 
                        alt={item.title} 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                       />
                       
                       <button 
                         onClick={(e) => handleRemove(e, item._id)}
                         className="absolute top-3 right-3 z-10 p-2 bg-surface rounded-full shadow-md hover:bg-surface-2 dark:hover:bg-surface-muted transition transform hover:scale-110 group/btn"
                         title="Remove from Wishlist"
                       >
                         <FaHeart className="text-danger text-lg group-hover/btn:text-subtle dark:group-hover/btn:text-muted transition-colors" />
                       </button>

                       <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-bold">
                         ₹{item.price}
                       </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-foreground line-clamp-1 mb-1">{item.title}</h3>
                        <p className="text-xs text-muted uppercase font-bold tracking-wider mb-3">{item.category}</p>
                        
                        <div className="mt-auto flex items-center justify-between text-xs text-subtle font-medium pt-3 border-t border-border">
                             <span className="flex items-center"><FaMapMarkerAlt className="mr-1 text-danger" /> {item.location || 'Campus'}</span>
                             <span className="flex items-center text-danger font-bold group-hover:underline">
                                View Details <FaExternalLinkAlt className="ml-1" />
                             </span>
                        </div>
                    </div>
                </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;