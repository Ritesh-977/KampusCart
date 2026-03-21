import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import { FaCloudUploadAlt, FaRupeeSign, FaMapMarkerAlt, FaTag, FaCamera, FaUser, FaPhone, FaEnvelope, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import API from '../api/axios'; // ✅ IMPORT AXIOS INSTANCE

const SellItem = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: 'Books & Notes', 
    customCategory: '',        
    location: '',
    sellerName: '',
    sellerPhone: '',
    sellerEmail: '',
  });

  const [imageFiles, setImageFiles] = useState([]); 
  const [previews, setPreviews] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill user details for UI convenience (Auth is handled by cookie)
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (savedUser.name) {
      setFormData(prev => ({
        ...prev,
        sellerName: savedUser.name,
        sellerEmail: savedUser.email
      }));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 3) {
      toast.warning("Maximum 3 images allowed");
      return;
    }
    setImageFiles([...imageFiles, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (imageFiles.length === 0) {
      setError('Please upload at least one image.');
      setLoading(false);
      return;
    }

    const rawPhone = formData.sellerPhone.replace(/\D/g, '');
    if (rawPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('price', formData.price);
      data.append('category', formData.category === 'Others' ? formData.customCategory : formData.category);
      data.append('location', formData.location);
      data.append('contactNumber', `91${rawPhone}`); 
      data.append('description', formData.description);

      // Seller info
      data.append('sellerName', formData.sellerName);
      data.append('sellerEmail', formData.sellerEmail);

      imageFiles.forEach((file) => {
        data.append('images', file); 
      });

      // ✅ FIX: Use API.post
      // - No token needed (Cookie sent automatically)
      // - Axios handles 'Content-Type: multipart/form-data' automatically
      await API.post('/items', data);

      toast.success('Item posted successfully!');
      navigate('/'); 

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-20 transition-colors duration-200">
      <Navbar />

      <div className="bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 pb-24 pt-10 transition-colors gradient-animated">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-extrabold text-white">Sell Your Stuff</h1>
            <p className="mt-2 text-cyan-50 text-lg slide-in-blur" style={{"--animation-delay": "0.2s"}}>Quick, easy, and trusted across campuses.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16">
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-cyan-500 p-4 rounded-md shadow-sm">
                <p className="text-cyan-700 dark:text-cyan-400 font-medium italic">⚠️ {error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
                {/* --- LEFT COLUMN --- */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Multi-Image Upload Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 transition-colors border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <FaCamera className="mr-2 text-cyan-500"/> Product Photos
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {previews.map((src, index) => (
                                <div key={index} className="relative h-24 rounded-xl overflow-hidden border-2 border-cyan-100 dark:border-slate-600 shadow-inner group">
                                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                                    >
                                        <FaTimesCircle size={14} />
                                    </button>
                                </div>
                            ))}
                            
                            {previews.length < 3 && (
                                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-cyan-200 dark:border-slate-600 rounded-xl cursor-pointer bg-cyan-50 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-slate-600 transition-all group">
                                    <FaCloudUploadAlt className="text-cyan-400 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-slate-200 text-2xl" />
                                    <span className="text-[10px] font-bold text-cyan-500 dark:text-slate-400 mt-1 uppercase">Add Image</span>
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic">Upload up to 3 clear photos.</p>
                    </div>
                    
                    {/* Contact Info Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 transition-colors border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                            <FaPhone className="mr-2 text-cyan-500"/> Seller Identity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase">Your Name</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser className="text-slate-300 dark:text-slate-500" />
                                    </div>
                                    <input 
                                        type="text" 
                                        name="sellerName" 
                                        required 
                                        value={formData.sellerName} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-cyan-500 focus:border-cyan-500 transition-colors" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase">WhatsApp Number</label>
                                <div className="mt-1 relative flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-300 font-bold text-sm">+91</span>
                                    <input 
                                        type="tel" 
                                        name="sellerPhone" 
                                        required 
                                        maxLength="10" 
                                        value={formData.sellerPhone} 
                                        onChange={handleChange} 
                                        className="block w-full border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-r-xl focus:ring-cyan-500 focus:border-cyan-500 transition-colors" 
                                        placeholder="9876543210" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase">Email Address</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="text-slate-300 dark:text-slate-500" />
                                    </div>
                                    <input 
                                        type="email" 
                                        name="sellerEmail" 
                                        required 
                                        value={formData.sellerEmail} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-cyan-500 focus:border-cyan-500 transition-colors" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN --- */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6 transition-colors border border-slate-100 dark:border-slate-700">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Ad Particulars</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Item Title</label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    required 
                                    value={formData.title} 
                                    onChange={handleChange} 
                                    className="mt-2 block w-full border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl shadow-sm focus:ring-cyan-500 focus:border-cyan-500 py-3 px-4 transition-colors" 
                                    placeholder="e.g. Milton 1L Steel Bottle" 
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Asking Price</label>
                                    <div className="mt-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaRupeeSign className="text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <input 
                                            type="number" 
                                            name="price" 
                                            required 
                                            value={formData.price} 
                                            onChange={handleChange} 
                                            className="block w-full pl-10 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-cyan-500 focus:border-cyan-500 py-3 transition-colors" 
                                            placeholder="Amount" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Hostel/Building</label>
                                    <div className="mt-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaMapMarkerAlt className="text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="location" 
                                            required 
                                            value={formData.location} 
                                            onChange={handleChange} 
                                            className="block w-full pl-10 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-cyan-500 focus:border-cyan-500 py-3 transition-colors" 
                                            placeholder="e.g. Tandon Hostel" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Category</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaTag className="text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <select 
                                        name="category" 
                                        value={formData.category} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl focus:ring-cyan-500 focus:border-cyan-500 py-3 transition-colors"
                                    >
                                        <option value="Books & Notes">Books & Notes</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Hostel Essentials">Hostel Essentials</option>
                                        <option value="Cycles">Cycles</option>
                                        <option value="Stationery">Stationery</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                            </div>

                            {formData.category === 'Others' && (
                                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-xl border border-cyan-100 dark:border-cyan-800 transition-colors">
                                    <label className="block text-sm font-bold text-cyan-700 dark:text-cyan-300 text-xs">Custom Category</label>
                                    <input 
                                        type="text" 
                                        name="customCategory" 
                                        required 
                                        value={formData.customCategory} 
                                        onChange={handleChange} 
                                        className="mt-2 block w-full border-cyan-200 dark:border-cyan-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-3 focus:ring-cyan-500 focus:border-cyan-500" 
                                        placeholder="e.g. Musical Instruments" 
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Item Description</label>
                                <textarea 
                                    name="description" 
                                    rows={5} 
                                    required 
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    className="mt-2 block w-full border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl p-4 focus:ring-cyan-500 focus:border-cyan-500 transition-colors" 
                                    placeholder="Condition, time used, accessories included..." 
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className={`w-full py-4 rounded-xl shadow-lg text-lg font-black text-white ${loading ? 'bg-slate-400 dark:bg-slate-600 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 dark:from-cyan-500 dark:hover:from-cyan-600 dark:to-teal-500 dark:hover:to-teal-600 hover:shadow-2xl hover:-translate-y-1 transition-all'}`}
                            >
                                {loading ? 'PUBLISHING...' : 'POST AD NOW'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default SellItem;