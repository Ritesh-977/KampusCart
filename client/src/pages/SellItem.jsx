import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import { FaCloudUploadAlt, FaRupeeSign, FaMapMarkerAlt, FaTag, FaCamera, FaUser, FaPhone, FaEnvelope, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

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

      imageFiles.forEach((file) => {
        data.append('images', file); 
      });

      const token = localStorage.getItem('token'); 
      const response = await fetch('http://localhost:5000/api/items', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}` 
        },
        body: data 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create item');
      }

      toast.success('Item posted successfully!');
      navigate('/'); 

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20 transition-colors duration-200">
      <Navbar />

      <div className="bg-indigo-600 dark:bg-indigo-700 pb-24 pt-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-extrabold text-white">Sell Your Stuff</h1>
            <p className="mt-2 text-indigo-100 text-lg">Quick, easy, and trusted by MNNITians.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16">
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                <p className="text-red-700 dark:text-red-400 font-medium italic">⚠️ {error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
                {/* --- LEFT COLUMN --- */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Multi-Image Upload Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                            <FaCamera className="mr-2 text-indigo-500"/> Product Photos
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {previews.map((src, index) => (
                                <div key={index} className="relative h-24 rounded-xl overflow-hidden border-2 border-indigo-50 dark:border-gray-700 shadow-inner group">
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
                                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-indigo-200 dark:border-gray-600 rounded-xl cursor-pointer bg-indigo-50 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-gray-600 transition-all group">
                                    <FaCloudUploadAlt className="text-indigo-400 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-gray-200 text-2xl" />
                                    <span className="text-[10px] font-bold text-indigo-500 dark:text-gray-400 mt-1 uppercase">Add Image</span>
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center italic">Upload up to 3 clear photos.</p>
                    </div>
                    
                    {/* Contact Info Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                            <FaPhone className="mr-2 text-indigo-500"/> Seller Identity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase">Your Name</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser className="text-gray-300 dark:text-gray-500" />
                                    </div>
                                    <input 
                                        type="text" 
                                        name="sellerName" 
                                        required 
                                        value={formData.sellerName} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase">WhatsApp Number</label>
                                <div className="mt-1 relative flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-bold text-sm">+91</span>
                                    <input 
                                        type="tel" 
                                        name="sellerPhone" 
                                        required 
                                        maxLength="10" 
                                        value={formData.sellerPhone} 
                                        onChange={handleChange} 
                                        className="block w-full border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-r-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                                        placeholder="9876543210" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase">Email Address</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="text-gray-300 dark:text-gray-500" />
                                    </div>
                                    <input 
                                        type="email" 
                                        name="sellerEmail" 
                                        required 
                                        value={formData.sellerEmail} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN --- */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6 transition-colors">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Ad Particulars</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Item Title</label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    required 
                                    value={formData.title} 
                                    onChange={handleChange} 
                                    className="mt-2 block w-full border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 transition-colors" 
                                    placeholder="e.g. Milton 1L Steel Bottle" 
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Asking Price</label>
                                    <div className="mt-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaRupeeSign className="text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input 
                                            type="number" 
                                            name="price" 
                                            required 
                                            value={formData.price} 
                                            onChange={handleChange} 
                                            className="block w-full pl-10 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 py-3 transition-colors" 
                                            placeholder="Amount" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Hostel/Building</label>
                                    <div className="mt-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaMapMarkerAlt className="text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="location" 
                                            required 
                                            value={formData.location} 
                                            onChange={handleChange} 
                                            className="block w-full pl-10 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 py-3 transition-colors" 
                                            placeholder="e.g. Tandon Hostel" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Category</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaTag className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <select 
                                        name="category" 
                                        value={formData.category} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-indigo-500 focus:border-indigo-500 py-3 transition-colors"
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
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 transition-colors">
                                    <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 text-xs">Custom Category</label>
                                    <input 
                                        type="text" 
                                        name="customCategory" 
                                        required 
                                        value={formData.customCategory} 
                                        onChange={handleChange} 
                                        className="mt-2 block w-full border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500" 
                                        placeholder="e.g. Musical Instruments" 
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Item Description</label>
                                <textarea 
                                    name="description" 
                                    rows={5} 
                                    required 
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    className="mt-2 block w-full border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl p-4 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                                    placeholder="Condition, time used, accessories included..." 
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className={`w-full py-4 rounded-xl shadow-lg text-lg font-black text-white ${loading ? 'bg-gray-400 dark:bg-gray-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-2xl hover:-translate-y-1 transition-all'}`}
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