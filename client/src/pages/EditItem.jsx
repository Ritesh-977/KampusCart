import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import { FaCloudUploadAlt, FaRupeeSign, FaMapMarkerAlt, FaTag, FaCamera, FaUser, FaPhone, FaEnvelope, FaTrash, FaSave, FaArrowLeft, FaEye, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const EditItem = () => {
  const { id } = useParams();
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/items/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Failed to fetch item');

        const standardCategories = ['Books & Notes', 'Electronics', 'Hostel Essentials', 'Cycles', 'Stationery'];
        const isOther = !standardCategories.includes(data.category);

        setFormData({
          title: data.title,
          price: data.price,
          description: data.description, 
          category: isOther ? 'Others' : data.category,
          customCategory: isOther ? data.category : '',
          location: data.location || '', 
          sellerName: data.seller?.name || '', 
          sellerPhone: data.contactNumber ? data.contactNumber.replace(/^91/, '') : '',
          sellerEmail: data.seller?.email || '',
        });

        if (data.images && data.images.length > 0) {
            setPreviews(data.images);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (previews.length + selectedFiles.length > 3) {
      toast.warning("Maximum 3 images allowed");
      return;
    }

    const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setImageFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    setPreviews(prevPreviews => [...prevPreviews, ...newPreviewUrls]);
    e.target.value = null;
  };

  const removeImage = (index) => {
    const removedItem = previews[index];
    if (typeof removedItem === 'string' && removedItem.startsWith('blob:')) {
        URL.revokeObjectURL(removedItem);
    }
    setPreviews(prev => prev.filter((_, i) => i !== index));
    if (typeof removedItem === 'string' && !removedItem.startsWith('http')) {
        const existingCount = previews.filter(p => typeof p === 'string' && p.startsWith('http')).length;
        const fileIndex = index - existingCount;
        setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('price', formData.price);
      
      const finalCategory = formData.category === 'Others' ? formData.customCategory : formData.category;
      data.append('category', finalCategory);

      data.append('description', formData.description); 
      data.append('location', formData.location);
      
      data.append('contactNumber', `91${formData.sellerPhone.replace(/\D/g, '')}`);

      const existingUrls = previews.filter(p => typeof p === 'string' && p.startsWith('http'));
      data.append('existingImages', JSON.stringify(existingUrls));

      imageFiles.forEach((file) => {
        data.append('images', file); 
      });

      const token = localStorage.getItem('token'); 
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/items/${id}`, {
        method: 'PUT', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: data 
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update item');

      toast.success('Item updated successfully!');
      navigate('/my-listings');

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 bg-gray-50 dark:bg-gray-900 transition-colors">Loading...</div>;

  return (
    // FIX 1: Main Background
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans pb-20 transition-colors duration-200">
      <Navbar />

      {/* FIX 2: Sticky Header Background */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-30 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
             <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-xl">
                <FaArrowLeft />
             </button>
             <h1 className="text-xl font-black text-gray-900 dark:text-white">Edit Listing</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-md">
                            <p className="text-red-700 dark:text-red-400 text-sm font-bold italic">⚠️ {error}</p>
                        </div>
                    )}

                    {/* Media Section */}
                    {/* FIX 3: Card Background */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Photos (Max 3)</h3>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {previews.map((src, index) => (
                                <div key={index} className="relative h-28 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-600 group shadow-sm">
                                    <img src={src} alt="Item" className="h-full w-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                                    >
                                        <FaTimesCircle size={16} />
                                    </button>
                                </div>
                            ))}
                            {previews.length < 3 && (
                                <label className="h-28 border-2 border-dashed border-indigo-100 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center bg-indigo-50/30 dark:bg-gray-700/30 text-indigo-400 dark:text-gray-400 cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-700 transition">
                                    <FaCamera size={24} />
                                    <span className="text-[10px] font-bold mt-1">ADD PHOTO</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Core Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                          <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Core Info</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Item Title</label>
                                {/* FIX 4: Inputs (Dark Mode) */}
                                <input type="text" name="title" required value={formData.title} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl px-4 py-3 transition-colors" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Price (₹)</label>
                                <div className="mt-1 relative rounded-xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaRupeeSign className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <input type="number" name="price" required value={formData.price} onChange={handleChange} className="block w-full pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl py-3 transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Category</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl px-4 py-3 transition-colors">
                                    <option value="Books & Notes">Books & Notes</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Hostel Essentials">Hostel Essentials</option>
                                    <option value="Cycles">Cycles</option>
                                    <option value="Stationery">Stationery</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            {formData.category === 'Others' && (
                                <div className="md:col-span-2">
                                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Specify Category</label>
                                     <input type="text" name="customCategory" required value={formData.customCategory} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl px-4 py-3 transition-colors" placeholder="e.g. Sports Gear" />
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                                <textarea name="description" rows={4} required value={formData.description} onChange={handleChange} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl px-4 py-3 transition-colors" />
                            </div>
                          </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Contact & Location</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Hostel / Location</label>
                                <div className="mt-1 relative rounded-lg">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaMapMarkerAlt className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <input type="text" name="location" required value={formData.location} onChange={handleChange} className="block w-full pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl py-3 transition-colors" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <FaUser className="absolute top-4 left-3 text-gray-400 dark:text-gray-500" />
                                    <input type="text" name="sellerName" required value={formData.sellerName} onChange={handleChange} className="block w-full pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl py-3 transition-colors" placeholder="Seller Name" />
                                </div>
                                <div className="relative">
                                    <FaPhone className="absolute top-4 left-3 text-gray-400 dark:text-gray-500" />
                                    <input type="tel" name="sellerPhone" required maxLength="10" value={formData.sellerPhone} onChange={handleChange} className="block w-full pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl py-3 transition-colors" placeholder="Phone (10 digits)" />
                                </div>
                            </div>
                            <div className="relative">
                                <FaEnvelope className="absolute top-4 left-3 text-gray-400 dark:text-gray-500" />
                                <input type="email" name="sellerEmail" required value={formData.sellerEmail} onChange={handleChange} className="block w-full pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:ring-indigo-500 rounded-xl py-3 transition-colors" placeholder="Email Address" />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-4 pt-4">
                        <button type="button" onClick={() => navigate('/my-listings')} className="px-6 py-3 font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition">Discard</button>
                        <button type="submit" disabled={submitting} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg flex items-center disabled:bg-gray-400 dark:disabled:bg-gray-600">
                             <FaSave className="mr-2" />
                             {submitting ? 'Updating...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* PREVIEW */}
            <div className="lg:col-span-5 hidden lg:block sticky top-40 h-fit">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 relative">
                        <img src={previews[0] || 'https://via.placeholder.com/400x300'} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white line-clamp-1">{formData.title || 'Product Title'}</h3>
                            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{formData.price || '0'}</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">
                            {formData.category === 'Others' ? (formData.customCategory || 'Custom') : formData.category}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditItem;