import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import axios from 'axios';
import {ToastContainer, toast } from 'react-toastify';

import { 
  FaSearch, 
  FaPlus, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaTag, 
  FaTimes, 
  FaCamera, 
  FaBullhorn,
  FaSpinner,
  FaCheck
} from 'react-icons/fa';


const LostAndFound = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const [newItem, setNewItem] = useState({
    type: 'Lost', 
    title: '',
    category: 'Other', 
    location: '',
    date: '', 
    description: '',
    contact: '', 
    image: null 
  });
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/lost-found`);
      setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error);
      // Optional: toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type) => setFilterType(type);

  const handleInputChange = (e) => {
    setNewItem({ ...newItem, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewItem({ ...newItem, image: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleMarkResolved = async (itemId) => {
    if(!window.confirm("Are you sure you want to mark this as resolved?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_SERVER_URL}/api/lost-found/${itemId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(items.map(item => 
        item._id === itemId ? { ...item, status: 'Resolved' } : item
      ));
      
      // --- 2. SUCCESS TOAST ---
      toast.success("Item marked as resolved!");
      
    } catch (error) {
      // --- 3. ERROR TOAST ---
      toast.error("Failed to update status");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', newItem.title);
      formData.append('type', newItem.type); 
      formData.append('category', newItem.category);
      formData.append('location', newItem.location);
      const fullDescription = `${newItem.description}\n\n📅 Date: ${newItem.date}\n📞 Contact: ${newItem.contact}`;
      formData.append('description', fullDescription);
      if (newItem.image) formData.append('image', newItem.image);

      const { data } = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/lost-found`, formData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      const enrichedItem = {
        ...data, 
        reporter: {
          _id: currentUser._id || currentUser.id, 
          name: currentUser.name,
          email: currentUser.email
        }
      };
      setItems([enrichedItem, ...items]);
      setIsModalOpen(false);
      setNewItem({ type: 'Lost', title: '', category: 'Other', location: '', date: '', description: '', contact: '', image: null });
      setPreviewUrl(null);
      
      // --- 4. SUCCESS TOAST ---
      toast.success("Item reported successfully!");

    } catch (error) {
      // --- 5. ERROR TOAST ---
      toast.error(error.response?.data?.message || "Failed to report item");
    } finally {
      setSubmitting(false);
    }
  };

  const isOwner = (item) => {
    if (!currentUser || !item.reporter) return false;
    const currentUserId = currentUser._id || currentUser.id;
    const reporterId = item.reporter._id || item.reporter;
    return String(currentUserId) === String(reporterId);
  };

  const filteredItems = items.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
      <Navbar />
      
      {/* --- 6. TOAST CONTAINER (Essential for toasts to show) --- */}
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* HERO SECTION */}
      <div className="bg-indigo-600 dark:bg-indigo-900 py-10 px-4 sm:px-6 lg:px-8 text-center shadow-lg transition-colors duration-300">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <FaBullhorn /> Campus Lost & Found
        </h1>
        <p className="text-indigo-100 dark:text-indigo-200 text-lg max-w-2xl mx-auto">
          Report lost items or help others find their belongings.
        </p>
        <div className="mt-8 max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search for 'ID Card', 'Keys'..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 rounded-full border-none shadow-xl focus:ring-2 focus:ring-white focus:outline-none text-gray-800 dark:text-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 inline-flex transition-colors duration-300">
            <button onClick={() => handleFilterChange('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === 'all' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>All</button>
            <button onClick={() => handleFilterChange('Lost')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === 'Lost' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Lost</button>
            <button onClick={() => handleFilterChange('Found')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === 'Found' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>Found</button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5">
            <FaPlus className="mr-2" /> Report Item
          </button>
        </div>

        {/* GRID OF ITEMS */}
        {loading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading items...</div>
        ) : (
            <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(item => (
                <div key={item._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100 dark:border-gray-700 flex flex-col h-full">
                
                <div className="relative h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden group">
                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide z-10 shadow-sm ${item.type === 'Lost' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                      {item.type}
                    </span>
                    
                    {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                          onClick={() => setFullScreenImage(item.image)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700">
                            <FaTag className="text-5xl opacity-20" />
                        </div>
                    )}
                    {item.image && (
                       <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center pointer-events-none">
                          <p className="text-white opacity-0 group-hover:opacity-100 font-bold bg-black/50 px-2 py-1 rounded text-xs">Click to Expand</p>
                       </div>
                    )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{item.title}</h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{item.category}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <div className="flex items-center"><FaMapMarkerAlt className="mr-2 text-indigo-500" /> {item.location}</div>
                        <div className="flex items-center"><FaCalendarAlt className="mr-2 text-indigo-500" /> {new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 whitespace-pre-line flex-grow">{item.description}</p>

                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        {item.status === 'Resolved' ? (
                            <span className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold border border-green-200 dark:border-green-800 w-full justify-center">
                                <FaCheck className="mr-1" /> RESOLVED
                            </span>
                        ) : (
                            <>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[140px]">By: {item.reporter?.name || 'Unknown'}</span>
                                {isOwner(item) ? (
                                    <button onClick={() => handleMarkResolved(item._id)} className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 text-sm font-bold border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition">Mark Resolved</button>
                                ) : (
                                    <a href={`mailto:${item.reporter?.email}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-bold flex items-center cursor-pointer">Contact</a>
                                )}
                            </>
                        )}
                    </div>
                </div>
                </div>
            ))}
            {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-12">
                   <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4"><FaSearch className="text-4xl text-gray-300 dark:text-gray-600" /></div>
                   <h3 className="text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
                   <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
                </div>
            )}
            </div>
        )}
      </div>

      {/* --- REPORT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Report an Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><FaTimes size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${newItem.type === 'Lost' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold' : 'border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input type="radio" name="type" value="Lost" checked={newItem.type === 'Lost'} onChange={handleInputChange} className="hidden" />I Lost Something
                </label>
                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${newItem.type === 'Found' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold' : 'border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  <input type="radio" name="type" value="Found" checked={newItem.type === 'Found'} onChange={handleInputChange} className="hidden" />I Found Something
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Title</label>
                    <input required type="text" name="title" value={newItem.title} onChange={handleInputChange} placeholder="e.g. Blue Casio Calculator" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select name="category" value={newItem.category} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white">
                        <option value="ID Card">ID Card</option><option value="Keys">Keys</option><option value="Electronics">Electronics</option><option value="Books">Books</option><option value="Other">Other</option>
                    </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                    <input required type="text" name="location" value={newItem.location} onChange={handleInputChange} placeholder="e.g. Library" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input required type="date" name="date" value={newItem.date} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Info</label><input required type="text" name="contact" value={newItem.contact} onChange={handleInputChange} placeholder="Phone/Email" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea required name="description" rows="3" value={newItem.description} onChange={handleInputChange} placeholder="Describe the item details..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-gray-700 dark:text-white"></textarea></div>
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Image (Optional)</label>
                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer relative">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
                    <div className="space-y-1 text-center">
                       {previewUrl ? (
                           <div className="relative h-20 w-auto mx-auto"><img src={previewUrl} alt="Preview" className="h-full object-contain rounded" /><p className="text-xs text-green-600 mt-1">Image Selected</p></div>
                       ) : (
                           <><FaCamera className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" /><p className="text-xs text-gray-500 dark:text-gray-400">Click to upload image</p></>
                       )}
                    </div>
                 </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition flex items-center justify-center">
                {submitting ? <><FaSpinner className="animate-spin mr-2" /> Posting...</> : "Submit Report"}
              </button>
            </form>
          </div>
        </div>
      )}

      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm animate-fadeIn p-4 cursor-pointer"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 text-white bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition z-[80]"
          >
            <FaTimes size={24} />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full Screen" 
            className="max-h-full max-w-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
};

export default LostAndFound;