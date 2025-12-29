import React, { useState, useEffect } from 'react';
import { FaCamera, FaTimesCircle } from 'react-icons/fa';

const ItemForm = ({ initialData, onSubmit, buttonText, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: 'Other',
    contactNumber: ''
  });

  // Now handling arrays for multiple images
  const [imageFiles, setImageFiles] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (initialData) {
      const displayData = { ...initialData };
      // Strip '91' for the UI if it exists
      if (displayData.contactNumber && displayData.contactNumber.startsWith('91')) {
        displayData.contactNumber = displayData.contactNumber.slice(2);
      }
      setFormData(displayData);
      
      // Load existing images if editing
      if (initialData.images && initialData.images.length > 0) {
        setPreviews(initialData.images);
      }
    }
  }, [initialData]);

  const validatePhone = (number) => {
    const cleanNumber = number.replace(/\D/g, ''); 
    if (cleanNumber.length > 0 && cleanNumber.length !== 10) {
      setPhoneError("Please enter a valid 10-digit mobile number.");
    } else {
      setPhoneError('');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'contactNumber') {
      validatePhone(value);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check if adding these files exceeds the limit of 3
    if (imageFiles.length + files.length > 3) {
      alert("You can only upload a maximum of 3 images.");
      return;
    }

    // Add new files to the state
    const updatedFiles = [...imageFiles, ...files];
    setImageFiles(updatedFiles);

    // Generate previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index) => {
    // Remove from both files and previews
    const updatedFiles = imageFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setImageFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const rawNumber = formData.contactNumber.replace(/\D/g, '');
    
    if (rawNumber.length !== 10) {
        alert("Please enter a valid 10-digit number.");
        return;
    }

    if (previews.length === 0) {
        alert("Please upload at least one image.");
        return;
    }

    const finalPhoneNumber = `91${rawNumber}`;
    const data = new FormData();
    data.append('title', formData.title);
    data.append('price', formData.price);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('contactNumber', finalPhoneNumber);

    const existingUrls = previews.filter(p => typeof p === 'string' && p.startsWith('http'));
    data.append('existingImages', JSON.stringify(existingUrls));

    // Append each image to 'images' (Backend should use upload.array('images', 3))
    imageFiles.forEach((file) => {
      data.append('images', file);
    });

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <div>
        <label className="block text-sm font-semibold text-gray-700">Product Title</label>
        <input
          name="title"
          type="text"
          required
          value={formData.title}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="e.g. Hero Ranger Cycle"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700">Price (₹)</label>
          <input
            name="price"
            type="number"
            required
            value={formData.price}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {['Cycles','Books & Notes', 'Electronics', 'Hostel Essentials','Stationery', 'Other'].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700">Description</label>
        <textarea
          name="description"
          rows="4"
          required
          value={formData.description}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Condition, age, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700">WhatsApp Contact Number</label>
        <div className="mt-1 relative rounded-lg shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm font-bold">+91</span>
          </div>
          <input
            name="contactNumber"
            type="tel"
            required
            maxLength="10"
            value={formData.contactNumber}
            onChange={handleChange}
            className={`block w-full pl-12 pr-3 py-3 border rounded-lg outline-none transition focus:ring-2 ${
              phoneError ? 'border-red-500 focus:ring-red-100' : 'border-gray-300 focus:ring-indigo-500'
            }`}
            placeholder="9876543210"
          />
        </div>
        {phoneError && <p className="mt-1 text-xs text-red-600 font-medium italic">{phoneError}</p>}
      </div>

      {/* Multi-Image Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Product Images (Max 3)</label>
        <div className="flex flex-wrap gap-4">
          {previews.map((src, index) => (
            <div key={index} className="relative h-24 w-24 rounded-lg overflow-hidden border shadow-sm group">
              <img src={src} alt="preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 text-red-500 bg-white rounded-full hover:bg-red-50"
              >
                <FaTimesCircle size={18} />
              </button>
            </div>
          ))}

          {previews.length < 3 && (
            <label className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed border-indigo-200 rounded-lg bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-100 transition">
              <FaCamera size={20} />
              <span className="text-[10px] font-bold mt-1">ADD</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </label>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg disabled:bg-gray-400"
      >
        {loading ? "Processing..." : buttonText}
      </button>
    </form>
  );
};

export default ItemForm;