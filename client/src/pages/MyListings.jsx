import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FaTrash, FaCheckCircle, FaTimesCircle, FaBoxOpen } from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios'; // ✅ IMPORT AXIOS INSTANCE

const MyListings = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyItems = async () => {
      try {
        // ✅ FIX 1: Use API.get (Cookie sent automatically)
        const { data } = await API.get('/items/my-listings');
        setItems(Array.isArray(data) ? data : data.items || []);
      } catch (err) {
        console.error("Error fetching listings", err);
        // Optional: toast.error("Could not load listings");
      } finally {
        setLoading(false);
      }
    };
    fetchMyItems();
  }, []);

  const handleToggleSold = async (e, id, currentStatus) => {
    e.preventDefault(); 
    try {
      // ✅ FIX 2: Use API.patch
      await API.patch(`/items/${id}/status`, { isSold: !currentStatus });

      // Update UI immediately on success
      setItems(items.map(item => item._id === id ? { ...item, isSold: !currentStatus } : item));
      toast.success(`Item marked as ${!currentStatus ? 'Sold' : 'Active'}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); 
    if (window.confirm("Are you sure you want to remove this item permanently?")) {
      try {
        // ✅ FIX 3: Use API.delete
        await API.delete(`/items/${id}`);

        // Update UI immediately
        setItems(items.filter(item => item._id !== id));
        toast.success("Item deleted successfully");
      } catch (err) {
        toast.error("Failed to delete item");
      }
    }
  };

  if (loading) return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center transition-colors">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-surface-2 font-sans transition-colors duration-200">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 border-b border-border pb-5">
          <h1 className="text-3xl font-extrabold text-foreground">My Listings</h1>
          <p className="text-muted mt-2">Manage your active ads and sold items.</p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-3xl shadow-sm border-2 border-dashed border-border">
            <div className="bg-accent-muted p-4 rounded-full mb-4">
                <FaBoxOpen className="text-accent text-4xl" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No items listed yet</h3>
            <p className="text-muted mt-2 text-center max-w-sm">
                Once you sell an item using the "Sell" page, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div 
                key={item._id} 
                className={`group relative bg-surface rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-border overflow-hidden flex flex-col ${item.isSold ? 'opacity-75' : ''}`}
              >
                {/* View Details Link */}
                <Link to={`/edit-item/${item._id}`} className="absolute inset-0 z-0" title="Edit Item" />

                <div className="relative h-48 w-full bg-surface-muted overflow-hidden pointer-events-none">
                   <img 
                    src={item.image || (item.images && item.images[0]?.url || item.images[0]) || `https://placehold.co/300x200?text=No+Image`} 
                    alt={item.title} 
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                   />
                   <div className="absolute top-3 right-3">
                       <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wide ${
                           item.isSold 
                           ? 'bg-danger text-white' 
                           : 'bg-success text-white'
                       }`}>
                           {item.isSold ? 'Sold' : 'Active'}
                       </span>
                   </div>
                </div>

                <div className="p-5 flex-1 flex flex-col relative z-10 pointer-events-none">
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-foreground line-clamp-1">{item.title}</h3>
                                <p className="text-xs text-muted uppercase font-semibold mt-1">{item.category}</p>
                            </div>
                            <p className="text-lg font-bold text-accent">₹{item.price}</p>
                        </div>
                         <div className="mt-4 flex items-center text-xs text-subtle">
                             <span>Posted on {new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-3 pointer-events-auto">
                        <button 
                            onClick={(e) => handleToggleSold(e, item._id, item.isSold)} 
                            className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold transition-colors z-20 relative ${
                                item.isSold 
                                ? 'bg-success-muted text-success hover:bg-success/20' 
                                : 'bg-accent-muted text-accent hover:bg-accent/20'
                            }`}
                        >
                            {item.isSold ? (
                                <><FaCheckCircle className="mr-2"/> Repost</>
                            ) : (
                                <><FaTimesCircle className="mr-2"/> Mark Sold</>
                            )}
                        </button>

                        <button 
                            onClick={(e) => handleDelete(e, item._id)} 
                            className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-semibold bg-danger-muted text-danger hover:bg-danger/20 transition-colors z-20 relative"
                        >
                            <FaTrash className="mr-2"/> Delete
                        </button>
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

export default MyListings;