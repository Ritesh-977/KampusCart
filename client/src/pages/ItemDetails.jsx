import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaCommentDots, 
  FaChevronRight, FaShare, FaFacebook, FaTwitter, FaLink, FaTimes, FaFlag,
  FaChevronLeft, FaChevronRight as FaArrowRight, FaCalendarAlt, FaUser
} from 'react-icons/fa'; 

// --- SKELETON COMPONENT ---
const ItemDetailsSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 animate-pulse">
    <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
      <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
        <div className="rounded-2xl bg-surface-muted h-80 sm:h-[450px] w-full shadow-lg"></div>
        <div className="flex gap-2 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-16 rounded-lg bg-surface-muted"></div>
          ))}
        </div>
      </div>
      <div className="mt-10 px-4 sm:px-0 lg:mt-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <div className="h-8 bg-surface-muted rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-surface-muted rounded w-1/4"></div>
          </div>
        </div>
        <div className="mt-6 h-10 w-1/3 bg-surface-muted rounded"></div>
        <div className="mt-8 space-y-4">
           <div className="h-24 w-full bg-surface-muted rounded-xl"></div>
           <div className="h-20 w-full bg-surface-muted rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);

const ItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const [item, setItem] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const scrollContainerRef = useRef(null);
  
  // State for Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchItemAndRelated = async () => {
      try {
        // 1. Fetch the main item
        const res = await API.get(`/items/${id}`);
        const fetchedItem = res.data.data || res.data; 
        setItem(fetchedItem);
        
        // 2. Fetch related items
        try {
          const categoryQuery = encodeURIComponent(fetchedItem.category);
          const collegeQuery = encodeURIComponent(fetchedItem.college); 
          
          const relatedRes = await API.get(`/items?category=${categoryQuery}&college=${collegeQuery}`);
          
          let itemsArray = [];
          if (Array.isArray(relatedRes.data)) {
            itemsArray = relatedRes.data;
          } else if (relatedRes.data && Array.isArray(relatedRes.data.data)) {
            itemsArray = relatedRes.data.data;
          } else if (relatedRes.data && Array.isArray(relatedRes.data.items)) {
            itemsArray = relatedRes.data.items;
          }

          // Filter out the viewed item AND sold items
          const filtered = itemsArray
            .filter(i => String(i._id) !== String(id) && !i.isSold)
            .slice(0, 4);
            
          setRelatedItems(filtered);
        } catch (relatedErr) {
          console.error("Could not fetch related items:", relatedErr);
        }

      } catch (err) {
        if (err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          console.error(err);
          toast.error("Failed to load item details.");
        }
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    
    setLoading(true);
    setActiveImage(0);
    fetchItemAndRelated();
  }, [id]);

  const handleChat = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        toast.error("Please login to chat!", { position: "top-right" });
        navigate('/login');
        return;
    }
    
    const currentUserId = user._id || user.id;
    const sellerId = item.seller?._id || item.seller;

    if (String(currentUserId) === String(sellerId)) {
        toast.info("You cannot chat with yourself!", { position: "top-right" });
        return;
    }

    try {
        const { data } = await API.post('/chat', { userId: sellerId });
        navigate('/chats', { state: { chat: data } }); 
    } catch (error) {
        toast.error("Failed to start chat.");
    }
  };

  const handleViewProfile = () => {
    const sellerId = item.seller?._id || item.seller;
    navigate(`/profile/view/${sellerId}`);
  };

  // --- SHARE FUNCTIONS ---
  const currentUrl = window.location.href;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("Link copied!");
      setShowShareModal(false);
    } catch (err) { toast.error("Failed to copy"); }
  };
  const shareToFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
  const shareToTwitter = () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=Check out this item!`, '_blank');
  const shareToWhatsapp = () => {
    const text = `Check out ${item.title} on KampusCart!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + currentUrl)}`;
    window.open(url, '_blank');
  };

  // REPORT FUNCTION
  const handleReportSubmit = async () => {
    if (!reportReason) return toast.warning("Please select a reason.");
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        toast.error("Please login to report items.");
        return navigate('/login');
    }

    try {
        setIsReporting(true);
        await API.post(`/items/${id}/report`, { reason: reportReason });
        toast.success("Item reported to Admin. Thank you for keeping our community safe!");
        setShowReportModal(false);
    } catch (error) {
        const msg = error.response?.data?.message || "Failed to report item.";
        toast.error(msg);
    } finally {
        setIsReporting(false);
    }
  };

  const getWhatsappLink = (number, title) => {
    const cleanNumber = number.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi, I'm interested in: ${title}. Link: ${currentUrl}`);
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  // --- IMAGE NAVIGATION HANDLER ---
  const handleImageChange = useCallback((index, e = null) => {
    if (e) e.stopPropagation();
    setActiveImage(index);
    
    // On mobile, scroll the container to the correct image smoothly
    if (scrollContainerRef.current) {
      const child = scrollContainerRef.current.querySelector('.flex.sm\\:hidden');
      if (child) {
        scrollContainerRef.current.scrollTo({ 
          left: index * scrollContainerRef.current.offsetWidth, 
          behavior: 'smooth' 
        });
      }
    }
  }, []);

  const user = JSON.parse(localStorage.getItem('user'));
  const isOtherCollege = !!(user && item?.college && user.college !== item.college);

  const PLACEHOLDER = 'https://placehold.co/600x400?text=No+Image';
  // Helper: handles legacy plain string URLs and new {url, public_id} objects
  const resolveUrl = (img) => (img && typeof img === 'object' ? img.url : img) || null;
  const imgUrl = (img) => resolveUrl(img) || PLACEHOLDER;
  const getItemThumb = (itm) => itm?.image || resolveUrl(itm?.images?.[0]) || PLACEHOLDER;

  const images = item?.images?.length ? item.images : (item?.image ? [item.image] : []);
  const displayName = item ? (item.sellerName || item.seller?.name) : '';
  const displayEmail = item ? (item.sellerEmail || item.seller?.email) : '';

  const seo = item ? SEO.item(item, null) : null;

  return (
    <div className="min-h-screen bg-surface transition-colors duration-200">
      {seo && <SEOHead {...seo} />}
      <Navbar />
      <ToastContainer />
      
      {loading ? (
        <ItemDetailsSkeleton />
      ) : accessDenied ? (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Outside Your Campus</h2>
          <p className="text-muted max-w-sm">
            You cannot interact with items outside your college. This listing belongs to a different campus marketplace.
          </p>
          <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 bg-gradient-to-r from-accent to-primary text-white rounded-xl font-semibold hover:from-accent hover:to-primary transition shadow-lg">
            Go Back
          </button>
        </div>
      ) : !item ? (
        <div className="text-center py-20 text-muted">Item not found.</div>
      ) : (
        <>
          {/* ZOOM MODAL */}
          {isZoomed && (
            <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
              <img src={imgUrl(images[activeImage])} onError={e => { e.target.src = PLACEHOLDER; }} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
            </div>
          )}

          {/* SHARE MODAL */}
          {showShareModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setShowShareModal(false)}>
              <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md p-6 border border-accent animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-accent pb-4">
                  <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                    <FaShare className="text-accent" /> Share Item
                  </h3>
                  <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-surface-muted dark:hover:bg-surface-muted rounded-xl transition-colors">
                    <FaTimes className="text-subtle hover:text-muted" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button onClick={shareToFacebook} className="flex flex-col items-center gap-3 p-4 bg-info-muted hover:bg-info-muted dark:hover:bg-info/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-info"><FaFacebook className="text-3xl text-info" /><span className="text-sm font-medium text-info">Facebook</span></button>
                  <button onClick={shareToTwitter} className="flex flex-col items-center gap-3 p-4 bg-info-muted hover:bg-info-muted dark:hover:bg-info/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-info"><FaTwitter className="text-3xl text-info" /><span className="text-sm font-medium text-info">Twitter</span></button>
                  <button onClick={shareToWhatsapp} className="flex flex-col items-center gap-3 p-4 bg-success-muted hover:bg-success-muted dark:hover:bg-success/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-success"><FaWhatsapp className="text-3xl text-success" /><span className="text-sm font-medium text-success">WhatsApp</span></button>
                  <button onClick={copyLink} className="flex flex-col items-center gap-3 p-4 bg-accent-muted hover:bg-accent-muted dark:hover:bg-accent/30 rounded-2xl transition-all duration-200 hover:scale-105 border border-accent"><FaLink className="text-3xl text-accent" /><span className="text-sm font-medium text-accent">Copy Link</span></button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted mb-2">Or share this link:</p>
                  <div className="bg-surface-muted p-3 rounded-xl text-xs font-mono text-foreground break-all">{currentUrl}</div>
                </div>
              </div>
            </div>
          )}

          {/* REPORT MODAL */}
          {showReportModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={() => setShowReportModal(false)}>
              <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-danger animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-danger bg-danger-muted">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-danger flex items-center gap-3">
                      <div className="p-2 bg-danger-muted rounded-lg"><FaFlag className="text-danger" /></div>
                      Report Item
                    </h3>
                    <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-danger-muted dark:hover:bg-danger/30 rounded-xl transition-colors">
                      <FaTimes className="text-subtle hover:text-muted" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted mb-6 text-center font-medium">Why are you reporting this item?</p>
                  <div className="space-y-3 mb-6">
                    {['Spam / Misleading', 'Fraud / Scam', 'Inappropriate Content', 'Duplicate Listing', 'Item Already Sold'].map((reason) => (
                        <label key={reason} className="flex items-center space-x-4 p-4 rounded-2xl border-2 border-border cursor-pointer hover:border-danger dark:hover:border-danger hover:bg-danger-muted dark:hover:bg-danger/20 transition-all duration-200">
                            <input type="radio" name="reportReason" value={reason} checked={reportReason === reason} onChange={(e) => setReportReason(e.target.value)} className="text-danger focus:ring-danger w-4 h-4"/>
                            <span className="text-foreground font-medium">{reason}</span>
                        </label>
                    ))}
                  </div>
                  <button onClick={handleReportSubmit} disabled={isReporting || !reportReason} className="w-full bg-danger hover:bg-danger disabled:bg-surface-muted text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center">
                    {isReporting ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>Sending...</> : <><FaFlag className="mr-3" />Submit Report</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <nav className="flex mb-6" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <button onClick={() => navigate('/')} className="inline-flex items-center text-sm font-medium text-muted hover:text-accent dark:hover:text-accent transition">
                    <FaChevronRight className="w-3 h-3 mr-2 rotate-180" />
                    Home
                  </button>
                </li>
                <li>
                  <div className="flex items-center">
                    <FaChevronRight className="w-3 h-3 text-subtle mx-1" />
                    <span className="ml-1 text-sm font-medium text-muted md:ml-2">{item.category}</span>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <FaChevronRight className="w-3 h-3 text-subtle mx-1" />
                    <span className="ml-1 text-sm font-medium text-accent md:ml-2">{item.title}</span>
                  </div>
                </li>
              </ol>
            </nav>

            <div className="lg:grid lg:grid-cols-2 lg:gap-x-16 lg:items-start">
              
              {/* LEFT: IMAGES */}
              <div className="flex flex-col gap-6 max-w-md mx-auto lg:mx-0 animate-fadeIn" style={{ animation: 'fadeUpIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                <div className="relative group">
                  {/* Mobile: horizontal scroll/swipe. Desktop: single image view */}
                  <div
                    ref={scrollContainerRef}
                    className="rounded-3xl overflow-x-auto overflow-y-hidden sm:overflow-hidden bg-gradient-to-br from-white to-accent-muted   h-80 sm:h-[500px] relative flex sm:items-center sm:justify-center cursor-zoom-in border-2 border-accent shadow-2xl hover:shadow-accent/20 transition-all duration-300 hover:border-accent snap-x snap-mandatory scroll-smooth scrollbar-hide"
                    onClick={() => setIsZoomed(true)}
                    onScroll={(e) => {
                      const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                      if (idx !== activeImage) setActiveImage(idx);
                    }}
                  >
                    {/* Mobile: all images side by side for swiping */}
                    <div className="flex sm:hidden w-full h-full flex-shrink-0">
                      {images.map((img, i) => (
                        <div key={i} className="snap-center flex-shrink-0 w-full h-full flex items-center justify-center">
                          <img src={imgUrl(img)} onError={e => { e.target.src = PLACEHOLDER; }} className="w-full h-full object-contain" alt="" />
                        </div>
                      ))}
                    </div>
                    {/* Desktop: single active image */}
                    <img src={imgUrl(images[activeImage])} onError={e => { e.target.src = PLACEHOLDER; }} className="hidden sm:block w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" alt="" />

                    {images.length > 1 && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleImageChange((activeImage - 1 + images.length) % images.length); }} className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"><FaChevronLeft /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleImageChange((activeImage + 1) % images.length); }} className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"><FaArrowRight /></button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-full">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => handleImageChange(i, e)}
                          style={{
                            width:   i === activeImage ? '8px' : Math.abs(i - activeImage) === 1 ? '6px' : '5px',
                            height:  i === activeImage ? '8px' : Math.abs(i - activeImage) === 1 ? '6px' : '5px',
                            opacity: i === activeImage ? 1    : Math.abs(i - activeImage) === 1 ? 0.5  : 0.3,
                          }}
                          className="rounded-full bg-surface transition-all duration-300"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto py-2 scrollbar-hide px-2">
                    {images.map((img, index) => (
                      <button 
                        key={index} 
                        onClick={(e) => handleImageChange(index, e)} 
                        className={`relative flex-shrink-0 h-20 w-20 rounded-xl overflow-hidden border-3 transition-all duration-200 ${
                          activeImage === index ? 'border-accent shadow-lg shadow-accent/30 scale-110' : 'border-border-strong hover:border-accent'
                        }`}
                      >
                        <img src={imgUrl(img)} onError={e => { e.target.src = PLACEHOLDER; }} className="w-full h-full object-cover" alt="" />
                        {activeImage === index && <div className="absolute inset-0 bg-accent/20 rounded-xl"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: INFO */}
              <div className="mt-12 px-4 sm:px-0 lg:mt-0 animate-fadeIn" style={{ animation: 'fadeUpIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards', animationFillMode: 'both' }}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-gradient-to-r from-accent to-primary text-white text-xs font-bold uppercase rounded-full shadow-md">{item.category}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-md ${item.isSold ? 'bg-danger-muted text-danger' : 'bg-success-muted text-success'}`}>
                        {item.isSold ? 'SOLD' : 'AVAILABLE'}
                      </span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black text-foreground leading-tight mb-3">{item.title}</h1>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-2">
                      <button onClick={() => setShowShareModal(true)} className="p-2.5 bg-surface-muted hover:bg-accent-muted dark:hover:bg-surface-muted text-muted hover:text-accent rounded-xl transition-all duration-200 hover:scale-105 shadow-md"><FaShare size={14} /></button>
                      <button onClick={() => setShowReportModal(true)} className="p-2.5 bg-surface-muted hover:bg-danger-muted dark:hover:bg-surface-muted text-muted hover:text-danger rounded-xl transition-all duration-200 hover:scale-105 shadow-md"><FaFlag size={14} /></button>
                    </div>
                  </div>
                </div>

                {/* SMALLER PRICE SECTION */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-1">
                    <p className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      ₹{item.price.toLocaleString('en-IN')}
                    </p>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <p className="text-lg text-muted line-through">
                        ₹{item.originalPrice.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <div className="inline-flex items-center px-2.5 py-1 bg-success-muted text-success text-xs font-bold rounded-full">
                      Save ₹{(item.originalPrice - item.price).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>

                {/* DESCRIPTION */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-gradient-to-b from-accent to-primary rounded-full"></div>
                    <h3 className="text-base font-bold text-foreground uppercase tracking-wide">Description</h3>
                  </div>
                  <div className="bg-gradient-to-br from-white to-accent-muted   p-4 rounded-xl border border-accent shadow-md whitespace-pre-line text-sm text-foreground leading-relaxed">
                    {item.description}
                  </div>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-white to-accent-muted   p-4 rounded-xl border border-accent shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-accent-muted rounded-lg">
                        <FaMapMarkerAlt className="text-accent text-sm" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground">Location</h4>
                    </div>
                    <p className="text-muted text-sm font-medium">{item.location || "Not specified"}</p>
                  </div>

                  <div className="bg-gradient-to-br from-white to-primary-muted   p-4 rounded-xl border border-primary shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-primary-muted rounded-lg">
                        <FaCalendarAlt className="text-primary text-sm" />
                      </div>
                      <h4 className="font-bold text-sm text-foreground">Posted</h4>
                    </div>
                    <p className="text-muted text-sm font-medium">{new Date(item.createdAt).toLocaleDateString('en-IN', { 
                      year: 'numeric', month: 'short', day: 'numeric' 
                    })}</p>
                  </div>
                </div>

                {/* SELLER CARD */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-gradient-to-b from-accent to-primary rounded-full"></div>
                    <h3 className="text-base font-bold text-foreground uppercase tracking-wide">Seller Info</h3>
                  </div>
                  
                  <div 
                    onClick={handleViewProfile} 
                    className="bg-gradient-to-r from-white via-accent-muted to-primary-muted    p-4 rounded-2xl border border-accent shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-md">
                            {item.seller.profilePic ? (
                              <img src={item.seller.profilePic} className="h-full w-full object-cover" alt="" />
                            ) : (
                              displayName.charAt(0)
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-border-strong flex items-center justify-center">
                            <FaUser className="text-white" style={{ fontSize: '0.5rem' }} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-bold text-base text-foreground mb-0.5">{displayName}</h4>
                          <p className="text-muted text-xs">{displayEmail}</p>
                        </div>
                      </div>
                      <div className="text-accent">
                        <FaChevronRight className="text-xl" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="space-y-4">
                  {isOtherCollege ? (
                    <div className="bg-gradient-to-r from-surface-muted to-surface-muted   p-5 rounded-xl border border-dashed border-border-strong">
                      <div className="flex items-center justify-center gap-2 text-muted">
                        <FaMapMarkerAlt />
                        <span className="font-bold text-sm text-center">Available only for {item.college} students</span>
                      </div>
                    </div>
                  ) : !item.isSold ? (
                    <div className="grid grid-cols-1 gap-3">
                      <button onClick={handleChat} className="group relative overflow-hidden bg-gradient-to-r from-accent via-accent to-primary text-white py-4 px-6 rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:shadow-accent/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <FaCommentDots className="mr-2 text-lg relative z-10" />
                        <span className="relative z-10">Chat with Seller</span>
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.contactNumber && (
                          <a href={getWhatsappLink(item.contactNumber, item.title)} target="_blank" rel="noreferrer" className="group bg-whatsapp hover:bg-whatsapp-hover text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all duration-300 hover:scale-[1.02] flex items-center justify-center">
                            <FaWhatsapp className="mr-2 text-xl" /> WhatsApp
                          </a>
                        )}
                        <a href={`mailto:${displayEmail}`} className="group bg-surface border border-accent hover:border-accent text-foreground py-3 px-4 rounded-xl font-bold text-sm hover:bg-accent-muted dark:hover:bg-surface-muted transition-all duration-300 hover:scale-[1.02] flex items-center justify-center shadow-sm">
                          <FaEnvelope className="mr-2" /> Email
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-surface-muted to-surface-muted   p-5 rounded-xl border border-border-strong">
                      <div className="flex items-center justify-center gap-2 text-muted">
                        <div className="w-2.5 h-2.5 bg-danger rounded-full"></div>
                        <span className="font-bold text-sm text-center">This item has been sold</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* RELATED PRODUCTS SECTION */}
            {relatedItems && (
              <div className="mt-16 pt-10 border-t border-border animate-fadeIn" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-accent to-primary rounded-full"></div>
                  <h2 className="text-2xl font-bold text-foreground">Similar {item.category} Items</h2>
                </div>
                
                {relatedItems.length === 0 ? (
                  <div className="bg-surface-2 rounded-2xl p-8 text-center border border-border">
                     <p className="text-muted font-medium">No similar items found in this category right now.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {relatedItems.map((related) => (
                      <div 
                        key={related._id} 
                        onClick={() => navigate(`/item/${related._id}`)}
                        className="group cursor-pointer bg-surface rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-accent dark:hover:border-accent transition-all duration-300 flex flex-col"
                      >
                        <div className="h-48 w-full bg-surface-muted relative overflow-hidden">
                          <img 
                            src={getItemThumb(related)}
                            onError={e => { if (e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER; }}
                            alt={related.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {related.isSold && (
                            <div className="absolute top-2 right-2 bg-danger text-white text-[10px] font-bold px-2 py-1 rounded-full">
                              SOLD
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-foreground line-clamp-1 mb-1 group-hover:text-accent dark:group-hover:text-accent transition-colors">
                            {related.title}
                          </h3>
                          <p className="text-accent font-bold text-lg mb-2">
                            ₹{related.price.toLocaleString('en-IN')}
                          </p>
                          <div className="mt-auto flex items-center justify-between text-xs text-muted">
                            <span className="flex items-center gap-1"><FaMapMarkerAlt /> {related.location || 'Campus'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
          </div>
        </>
      )}
    </div>
  );
};

export default ItemDetails;