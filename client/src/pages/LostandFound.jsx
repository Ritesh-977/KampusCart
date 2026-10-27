import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { ToastContainer, toast } from 'react-toastify';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';
import { useCollege } from '../context/CollegeContext';

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
  FaCheck,
  FaWhatsapp
} from 'react-icons/fa';

const LostAndFound = () => {
  const { selectedCollege } = useCollege();
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
  
  // Safe retrieval of user object
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const campus = currentUser?.college;
      const params = campus ? { campus } : {};
      const { data } = await API.get('/lost-found', { params });
      setItems(data);
    } catch (error) {
      console.error("Error fetching items:", error);
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
      // ✅ FIX: Use API.put (Cookie sent auto)
      await API.put(`/lost-found/${itemId}/resolve`, {});
      
      setItems(items.map(item => 
        item._id === itemId ? { ...item, status: 'Resolved' } : item
      ));
      
      toast.success("Item marked as resolved!");
      
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', newItem.title);
      formData.append('type', newItem.type);
      formData.append('category', newItem.category);
      formData.append('location', newItem.location);
      const fullDescription = `${newItem.description}\n\n📅 Date: ${newItem.date}`;
      formData.append('description', fullDescription);
      formData.append('contact', newItem.contact);
      if (newItem.image) formData.append('image', newItem.image);

      // ✅ FIX: Use API.post
      // Axios automatically handles multipart/form-data headers
      const { data } = await API.post('/lost-found', formData);

      const enrichedItem = {
        ...data,
        reporter: {
          _id: currentUser._id || currentUser.id,
          name: currentUser.name,
          email: currentUser.email
        },
        contact: newItem.contact
      };
      setItems([enrichedItem, ...items]);
      setIsModalOpen(false);
      setNewItem({ type: 'Lost', title: '', category: 'Other', location: '', date: '', description: '', contact: '', image: null });
      setPreviewUrl(null);
      
      toast.success("Item reported successfully!");

    } catch (error) {
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
    <div className="min-h-screen bg-surface font-sans transition-colors duration-300">
      <SEOHead {...SEO.lostFound(selectedCollege)} />
      <Navbar />
      
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
      <div className="bg-gradient-to-br from-surface-inverse via-surface-inverse to-surface-inverse    py-10 px-4 sm:px-6 lg:px-8 text-center shadow-lg transition-colors duration-300 border-b border-accent/30">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <FaBullhorn /> Campus Lost & Found
        </h1>
        <p className="text-inverse-muted text-lg max-w-2xl mx-auto">
          Report lost items or help others find their belongings.
        </p>
        <div className="mt-8 max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-subtle" />
          </div>
          <input
            type="text"
            placeholder="Search for 'ID Card', 'Keys'..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 rounded-full border-none shadow-xl focus:ring-2 focus:ring-accent focus:outline-none text-foreground bg-surface placeholder-subtle"
          />
        </div>
      </div>

      {/* CONTROLS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="bg-surface p-1 rounded-lg shadow-sm border border-accent inline-flex transition-colors duration-300">
            <button onClick={() => handleFilterChange('all')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === 'all' ? 'bg-accent-muted text-accent' : 'text-muted hover:bg-surface-2 dark:hover:bg-surface-muted'}`}>All</button>
            <button onClick={() => handleFilterChange('Lost')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === 'Lost' ? 'bg-danger-muted text-danger' : 'text-muted hover:bg-surface-2 dark:hover:bg-surface-muted'}`}>Lost</button>
            <button onClick={() => handleFilterChange('Found')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${filterType === 'Found' ? 'bg-success-muted text-success' : 'text-muted hover:bg-surface-2 dark:hover:bg-surface-muted'}`}>Found</button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center px-6 py-2.5 bg-gradient-to-r from-accent to-primary hover:from-accent hover:to-primary text-white rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5">
            <FaPlus className="mr-2" /> Report Item
          </button>
        </div>

        {/* GRID OF ITEMS */}
        {loading ? (
            <div className="text-center py-12 text-muted">Loading items...</div>
        ) : (
            <div className="mt-8 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(item => (
                <div key={item._id} className="bg-surface rounded-xl shadow-md overflow-hidden hover:shadow-lg transition border border-border flex flex-col h-full">
                
                <div className="relative h-48 bg-surface-muted flex items-center justify-center overflow-hidden group">
                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide z-10 shadow-sm ${item.type === 'Lost' ? 'bg-danger text-white' : 'bg-success text-white'}`}>
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
                        <div className="w-full h-full flex items-center justify-center text-subtle bg-surface-muted">
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
                        <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                        <span className="text-xs px-2 py-1 bg-surface-muted rounded text-muted border border-border">{item.category}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted mb-4">
                        <div className="flex items-center"><FaMapMarkerAlt className="mr-2 text-accent" /> {item.location}</div>
                        <div className="flex items-center"><FaCalendarAlt className="mr-2 text-accent" /> {new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                    
                    <p className="text-muted text-sm mb-4 whitespace-pre-line flex-grow">{item.description}</p>

                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        {item.status === 'Resolved' ? (
                            <span className="flex items-center px-3 py-1 bg-success-muted text-success rounded-full text-xs font-bold border border-success w-full justify-center">
                                <FaCheck className="mr-1" /> RESOLVED
                            </span>
                        ) : (
                            <>
                                <span className="text-xs text-muted font-medium truncate max-w-[140px]">By: {item.reporter?.name || 'Unknown'}</span>
                                {isOwner(item) ? (
                                    <button onClick={() => handleMarkResolved(item._id)} className="text-warning hover:text-warning dark:hover:text-warning text-sm font-bold border border-warning bg-warning-muted px-3 py-1 rounded-lg hover:bg-warning-muted dark:hover:bg-warning/40 transition">Mark Resolved</button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <a href={`mailto:${item.reporter?.email}`} className="text-accent hover:text-accent dark:hover:text-accent text-sm font-bold flex items-center cursor-pointer">Contact</a>
                                        {item.contact && /^\+?\d[\d\s\-]{6,}$/.test(item.contact.trim()) && (
                                            <a
                                                href={`https://wa.me/${item.contact.replace(/[\s\-\+]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-2 py-1 bg-success hover:bg-success text-white text-xs font-bold rounded-lg transition"
                                                title="Chat on WhatsApp"
                                            >
                                                <FaWhatsapp size={14} /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                </div>
            ))}
            {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-12">
                   <div className="inline-block p-4 rounded-full bg-surface-muted mb-4"><FaSearch className="text-4xl text-subtle" /></div>
                   <h3 className="text-lg font-medium text-foreground">No items found</h3>
                   <p className="text-muted">Try adjusting your search or filters.</p>
                </div>
            )}
            </div>
        )}
      </div>

      {/* --- REPORT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-accent flex justify-between items-center bg-gradient-to-r from-accent-muted to-primary-muted  ">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary  ">Report an Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-subtle hover:text-muted dark:hover:text-subtle transition"><FaTimes size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${newItem.type === 'Lost' ? 'border-danger bg-danger-muted text-danger font-bold' : 'border-border text-subtle hover:bg-surface-2 dark:hover:bg-surface-muted'}`}>
                  <input type="radio" name="type" value="Lost" checked={newItem.type === 'Lost'} onChange={handleInputChange} className="hidden" />I Lost Something
                </label>
                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${newItem.type === 'Found' ? 'border-success bg-success-muted text-success font-bold' : 'border-border text-subtle hover:bg-surface-2 dark:hover:bg-surface-muted'}`}>
                  <input type="radio" name="type" value="Found" checked={newItem.type === 'Found'} onChange={handleInputChange} className="hidden" />I Found Something
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">Item Title</label>
                    <input required type="text" name="title" value={newItem.title} onChange={handleInputChange} placeholder="e.g. Blue Casio Calculator" className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-foreground" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                    <select name="category" value={newItem.category} onChange={handleInputChange} className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-foreground">
                        <option value="ID Card">ID Card</option><option value="Keys">Keys</option><option value="Electronics">Electronics</option><option value="Books">Books</option><option value="Other">Other</option>
                    </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-foreground mb-1">Location</label>
                    <input required type="text" name="location" value={newItem.location} onChange={handleInputChange} placeholder="e.g. Library" className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-foreground mb-1">Date</label><input required type="date" name="date" value={newItem.date} onChange={handleInputChange} className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-foreground" /></div>
                <div><label className="block text-sm font-medium text-foreground mb-1">Contact Info</label><input required type="text" name="contact" value={newItem.contact} onChange={handleInputChange} placeholder="Phone/Email" className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-foreground" /></div>
              </div>
              <div><label className="block text-sm font-medium text-foreground mb-1">Description</label><textarea required name="description" rows="3" value={newItem.description} onChange={handleInputChange} placeholder="Describe the item details..." className="w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-accent focus:outline-none bg-surface text-foreground"></textarea></div>
              <div>
                 <label className="block text-sm font-medium text-foreground mb-1">Upload Image (Optional)</label>
                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-accent border-dashed rounded-lg hover:bg-accent-muted dark:hover:bg-surface-muted cursor-pointer relative">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
                    <div className="space-y-1 text-center">
                       {previewUrl ? (
                           <div className="relative h-20 w-auto mx-auto"><img src={previewUrl} alt="Preview" className="h-full object-contain rounded" /><p className="text-xs text-success mt-1">Image Selected</p></div>
                       ) : (
                           <><FaCamera className="mx-auto h-12 w-12 text-subtle" /><p className="text-xs text-muted">Click to upload image</p></>
                       )}
                    </div>
                 </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-accent to-primary text-white rounded-lg font-bold shadow-md hover:from-accent hover:to-primary transition flex items-center justify-center">
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
            className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition z-[80]"
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