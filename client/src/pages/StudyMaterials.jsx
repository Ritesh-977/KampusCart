import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import { toast } from 'react-toastify';
import SEOHead from '../components/SEOHead';
import { SEO } from '../utils/seoTemplates';
import { useCollege } from '../context/CollegeContext';
import {
  FaBook, FaPlus, FaSearch, FaDownload, FaTrashAlt,
  FaTimes, FaSpinner, FaUpload, FaFilePdf, FaImage,
  FaFilter, FaChevronDown,
} from 'react-icons/fa';

const CATEGORIES = ['Exam Paper', 'Note', 'Book'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const CATEGORY_COLORS = {
  'Exam Paper': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  'Note':       { bg: 'bg-teal-100 dark:bg-teal-900/30',  text: 'text-teal-700 dark:text-teal-400',  border: 'border-teal-200 dark:border-teal-800' },
  'Book':       { bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-700 dark:text-blue-400',  border: 'border-blue-200 dark:border-blue-800' },
};

const BLANK_FORM = { title: '', subjectName: '', semester: '', category: 'Note', file: null };

const StudyMaterials = () => {
  const { selectedCollege } = useCollege();
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUserId = currentUser._id || currentUser.id;

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filterSem, setFilterSem] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMaterials = useCallback(async (reset = false) => {
    const nextPage = reset ? 1 : page;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: nextPage, limit: 18 };
      if (currentUser?.college) params.college = currentUser.college;
      if (filterSem) params.semester = filterSem;
      if (filterCat) params.category = filterCat;
      if (searchSubject) params.subject = searchSubject;

      const { data } = await API.get('/materials', { params });
      const items = data.data || [];
      setMaterials(prev => reset ? items : [...prev, ...items]);
      setHasMore(data.pagination?.hasMore || false);
      setPage(reset ? 2 : nextPage + 1);
    } catch {
      toast.error('Failed to load materials.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterSem, filterCat, searchSubject, page]);

  // Refetch when filters change
  useEffect(() => { fetchMaterials(true); }, [filterSem, filterCat, searchSubject]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchSubject(searchInput.trim());
  };

  // ─── Upload ─────────────────────────────────────────────────────────────────
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, file });
      setFilePreview(file.name);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) { toast.error('Please select a file.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('subjectName', form.subjectName);
      fd.append('semester', form.semester);
      fd.append('category', form.category);
      fd.append('file', form.file);

      const { data } = await API.post('/materials/upload', fd);
      const enriched = { ...data.data, uploadedBy: { _id: currentUserId, name: currentUser.name } };
      setMaterials(prev => [enriched, ...prev]);
      setIsModalOpen(false);
      setForm(BLANK_FORM);
      setFilePreview(null);
      toast.success('Material uploaded!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mat) => {
    if (!window.confirm(`Delete "${mat.title}"?`)) return;
    try {
      await API.delete(`/materials/${mat._id}`);
      setMaterials(prev => prev.filter(m => m._id !== mat._id));
      toast.success('Material deleted.');
    } catch {
      toast.error('Failed to delete material.');
    }
  };

  const canDelete = (mat) => {
    const uploaderId = mat.uploadedBy?._id || mat.uploadedBy;
    return String(uploaderId) === String(currentUserId) || currentUser.isAdmin;
  };

  const INPUT = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white dark:bg-slate-700 dark:text-white text-sm";
  const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans transition-colors duration-300">
      <SEOHead {...SEO.studyMaterials(selectedCollege)} />
      <Navbar />

      {/* HERO */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-center shadow-lg border-b border-teal-700/30">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <FaBook className="text-teal-400" /> Study Materials
        </h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Access notes, exam papers, and books shared by your campus peers.
        </p>
        <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by subject name..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="block w-full pl-10 pr-24 py-3 rounded-full border-none shadow-xl focus:ring-2 focus:ring-teal-400 focus:outline-none text-gray-800 dark:text-white dark:bg-slate-800 placeholder-gray-500 dark:placeholder-slate-400"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-full transition">
            Search
          </button>
        </form>
      </div>

      {/* FILTERS + UPLOAD */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <FaFilter className="text-teal-500 text-sm" />
          {/* Semester select */}
          <div className="relative">
            <select
              value={filterSem}
              onChange={e => setFilterSem(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 border border-gray-300 dark:border-gray-600 rounded-full text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
            <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          </div>
          {/* Category filter */}
          <div className="flex gap-1.5">
            <button onClick={() => setFilterCat('')} className={`px-3 py-1 rounded-full text-sm font-semibold transition ${filterCat === '' ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>All</button>
            {CATEGORIES.map(c => {
              const col = CATEGORY_COLORS[c];
              return (
                <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold border transition ${filterCat === c ? `${col.bg} ${col.text} ${col.border}` : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                >{c}</button>
              );
            })}
          </div>
          {(filterSem || filterCat || searchSubject) && (
            <button onClick={() => { setFilterSem(''); setFilterCat(''); setSearchSubject(''); setSearchInput(''); }} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
              <FaTimes size={10} /> Clear
            </button>
          )}
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setForm(BLANK_FORM); setFilePreview(null); }}
          className="flex items-center px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5 flex-shrink-0"
        >
          <FaPlus className="mr-2" /> Upload Material
        </button>
      </div>

      {/* MATERIALS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <FaBook className="text-4xl text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No materials found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Be the first to upload something!</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map(mat => {
                const col = CATEGORY_COLORS[mat.category] || CATEGORY_COLORS['Note'];
                return (
                  <div key={mat._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Category + type icon */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.bg} ${col.text} ${col.border}`}>{mat.category}</span>
                        <div className="flex items-center gap-2">
                          {mat.fileType === 'pdf'
                            ? <FaFilePdf className="text-red-500" title="PDF" />
                            : <FaImage className="text-blue-400" title="Image" />
                          }
                          {canDelete(mat) && (
                            <button onClick={() => handleDelete(mat)} className="text-gray-400 hover:text-red-500 transition p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                              <FaTrashAlt size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug mb-1">{mat.title}</h3>
                      <p className="text-sm text-teal-600 dark:text-teal-400 font-medium mb-1">{mat.subjectName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Semester {mat.semester}</p>

                      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          By <span className="font-semibold text-gray-700 dark:text-gray-300">{mat.uploadedBy?.name || 'Anonymous'}</span>
                        </span>
                        <a
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-full transition"
                        >
                          <FaDownload size={10} /> View
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => fetchMaterials(false)}
                  disabled={loadingMore}
                  className="px-8 py-2.5 border-2 border-teal-500 text-teal-600 dark:text-teal-400 font-bold rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/20 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? <><FaSpinner className="animate-spin" /> Loading...</> : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── UPLOAD MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-teal-200 dark:border-teal-700/50 flex justify-between items-center bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400">
                Upload Study Material
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FaTimes size={20} /></button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className={LABEL}>Title *</label>
                <input required type="text" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Data Structures End Sem 2023" className={INPUT} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Subject Name *</label>
                  <input required type="text" name="subjectName" value={form.subjectName} onChange={handleChange} placeholder="e.g. Data Structures" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Semester *</label>
                  <select required name="semester" value={form.semester} onChange={handleChange} className={INPUT}>
                    <option value="">Select...</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL}>Category *</label>
                <div className="flex gap-3">
                  {CATEGORIES.map(c => {
                    const col = CATEGORY_COLORS[c];
                    return (
                      <label key={c} className={`flex-1 cursor-pointer border rounded-lg p-2.5 text-center text-sm font-semibold transition ${form.category === c ? `${col.bg} ${col.text} ${col.border}` : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        <input type="radio" name="category" value={c} checked={form.category === c} onChange={handleChange} className="hidden" />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={LABEL}>File (PDF or Image) *</label>
                <div className="border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-lg p-6 text-center cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/10 relative">
                  <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {filePreview ? (
                    <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400">
                      <FaFilePdf />
                      <span className="text-sm font-medium truncate max-w-xs">{filePreview}</span>
                    </div>
                  ) : (
                    <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                      <FaUpload size={28} />
                      <span className="text-sm">Click to select PDF or image</span>
                      <span className="text-xs">Max 10 MB</span>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-bold shadow-md hover:from-teal-600 hover:to-emerald-600 transition flex items-center justify-center">
                {submitting ? <><FaSpinner className="animate-spin mr-2" /> Uploading...</> : 'Upload Material'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMaterials;
