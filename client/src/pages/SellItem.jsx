import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar'; 
import { FaCloudUploadAlt, FaRupeeSign, FaMapMarkerAlt, FaTag, FaCamera, FaUser, FaPhone, FaEnvelope, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

// ✅ FIX: Use the custom apiCall wrapper instead of raw Axios!
import { apiCall } from '../api/apiWithFallback'; 

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
  const submittingRef = React.useRef(false);

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
    
    // Prevent duplicate submissions
    if (submittingRef.current) {
      return;
    }
    
    setLoading(true);
    submittingRef.current = true;
    setError('');

    if (imageFiles.length === 0) {
      setError('Please upload at least one image.');
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const rawPhone = formData.sellerPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      setError('Please enter a valid Indian mobile number (must start with 6, 7, 8, or 9).');
      setLoading(false);
      submittingRef.current = false;
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

      // ✅ FIX: Use apiCall so it automatically generates the Idempotency Key
      // Added a 60 second timeout to ensure large image uploads on slow Wi-Fi don't fail prematurely.
      await apiCall.post('/items', data, { timeout: 60000 });

      toast.success('Item posted successfully!');
      setTimeout(() => navigate('/'), 100);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create item');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-surface-2 font-sans pb-20 transition-colors duration-200">
      <Navbar />

      <div className="bg-gradient-to-br from-accent via-accent to-primary pb-24 pt-10 transition-colors gradient-animated">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-extrabold text-white">Sell Your Stuff</h1>
            <p className="mt-2 text-accent text-lg slide-in-blur" style={{"--animation-delay": "0.2s"}}>Quick, easy, and trusted across campuses.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16">
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-accent-muted border-l-4 border-accent p-4 rounded-md shadow-sm">
                <p className="text-accent font-medium italic">⚠️ {error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
                {/* --- LEFT COLUMN --- */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Multi-Image Upload Card */}
                    <div className="bg-surface rounded-2xl shadow-xl p-6 transition-colors border border-border">
                        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
                            <FaCamera className="mr-2 text-accent"/> Product Photos
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {previews.map((src, index) => (
                                <div key={index} className="relative h-24 rounded-xl overflow-hidden border-2 border-accent shadow-inner group">
                                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 bg-danger text-white rounded-full p-1 shadow-md hover:bg-danger"
                                    >
                                        <FaTimesCircle size={14} />
                                    </button>
                                </div>
                            ))}
                            
                            {previews.length < 3 && (
                                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-accent rounded-xl cursor-pointer bg-accent-muted hover:bg-accent-muted dark:hover:bg-surface-muted transition-all group">
                                    <FaCloudUploadAlt className="text-accent group-hover:text-accent dark:group-hover:text-subtle text-2xl" />
                                    <span className="text-[10px] font-bold text-accent mt-1 uppercase">Add Image</span>
                                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-subtle text-center italic">Upload up to 3 clear photos.</p>
                    </div>
                    
                    {/* Contact Info Card */}
                    <div className="bg-surface rounded-2xl shadow-xl p-6 transition-colors border border-border">
                        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center">
                            <FaPhone className="mr-2 text-accent"/> Seller Identity
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-subtle uppercase">Your Name</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser className="text-subtle" />
                                    </div>
                                    <input 
                                        type="text" 
                                        name="sellerName" 
                                        required 
                                        value={formData.sellerName} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-border bg-surface text-foreground rounded-xl focus:ring-accent focus:border-accent transition-colors" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-subtle uppercase">WhatsApp Number</label>
                                <div className="mt-1 relative flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-surface-2 text-muted font-bold text-sm">+91</span>
                                    <input 
                                        type="tel" 
                                        name="sellerPhone" 
                                        required 
                                        maxLength="10"
                                        value={formData.sellerPhone} 
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/\D/g, '');
                                          setFormData(prev => ({ ...prev, sellerPhone: val }));
                                        }}
                                        className={`block w-full border bg-surface text-foreground rounded-r-xl focus:ring-accent focus:border-accent transition-colors ${
                                          formData.sellerPhone.length > 0 && !/^[6-9]\d{0,9}$/.test(formData.sellerPhone)
                                            ? 'border-danger'
                                            : 'border-border'
                                        }`}
                                        placeholder="9876543210" 
                                    />
                                </div>
                                {formData.sellerPhone.length > 0 && !/^[6-9]\d{0,9}$/.test(formData.sellerPhone) && (
                                  <p className="mt-1 text-xs text-danger">Must start with 6, 7, 8, or 9</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-black text-subtle uppercase">Email Address</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="text-subtle" />
                                    </div>
                                    <input 
                                        type="email" 
                                        name="sellerEmail" 
                                        required 
                                        value={formData.sellerEmail} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-border bg-surface text-foreground rounded-xl focus:ring-accent focus:border-accent transition-colors" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN --- */}
                <div className="lg:col-span-2">
                    <div className="bg-surface rounded-2xl shadow-xl p-8 space-y-6 transition-colors border border-border">
                        <h3 className="text-2xl font-black text-foreground">Ad Particulars</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-foreground">Item Title</label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    required 
                                    value={formData.title} 
                                    onChange={handleChange} 
                                    className="mt-2 block w-full border-border bg-surface text-foreground rounded-xl shadow-sm focus:ring-accent focus:border-accent py-3 px-4 transition-colors" 
                                    placeholder="e.g. Milton 1L Steel Bottle" 
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-foreground">Asking Price</label>
                                    <div className="mt-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaRupeeSign className="text-subtle" />
                                        </div>
                                        <input 
                                            type="number" 
                                            name="price" 
                                            required 
                                            value={formData.price} 
                                            onChange={handleChange} 
                                            className="block w-full pl-10 border-border bg-surface text-foreground rounded-xl focus:ring-accent focus:border-accent py-3 transition-colors" 
                                            placeholder="Amount" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-foreground">Hostel/Building</label>
                                    <div className="mt-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaMapMarkerAlt className="text-subtle" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="location" 
                                            required 
                                            value={formData.location} 
                                            onChange={handleChange} 
                                            className="block w-full pl-10 border-border bg-surface text-foreground rounded-xl focus:ring-accent focus:border-accent py-3 transition-colors" 
                                            placeholder="e.g. Tandon Hostel" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground">Category</label>
                                <div className="mt-2 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaTag className="text-subtle" />
                                    </div>
                                    <select 
                                        name="category" 
                                        value={formData.category} 
                                        onChange={handleChange} 
                                        className="block w-full pl-10 border-border bg-surface text-foreground rounded-xl focus:ring-accent focus:border-accent py-3 transition-colors"
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
                                <div className="bg-accent-muted p-4 rounded-xl border border-accent transition-colors">
                                    <label className="block text-sm font-bold text-accent text-xs">Custom Category</label>
                                    <input 
                                        type="text" 
                                        name="customCategory" 
                                        required 
                                        value={formData.customCategory} 
                                        onChange={handleChange} 
                                        className="mt-2 block w-full border-accent bg-surface text-foreground rounded-lg py-2 px-3 focus:ring-accent focus:border-accent" 
                                        placeholder="e.g. Musical Instruments" 
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-foreground">Item Description</label>
                                <textarea 
                                    name="description" 
                                    rows={5} 
                                    required 
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    className="mt-2 block w-full border-border bg-surface text-foreground rounded-xl p-4 focus:ring-accent focus:border-accent transition-colors" 
                                    placeholder="Condition, time used, accessories included..." 
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className={`w-full py-4 rounded-xl shadow-lg text-lg font-black text-white ${loading ? 'bg-surface-muted animate-pulse' : 'bg-gradient-to-r from-accent to-primary hover:from-accent hover:to-primary  dark:hover:from-accent  dark:hover:to-primary hover:shadow-2xl hover:-translate-y-1 transition-all'}`}
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