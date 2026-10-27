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
  'Exam Paper': { bg: 'bg-danger-muted', text: 'text-danger', border: 'border-danger' },
  'Note':       { bg: 'bg-primary-muted',  text: 'text-primary',  border: 'border-primary' },
  'Book':       { bg: 'bg-info-muted',  text: 'text-info',  border: 'border-info' },
};

const BLANK_FORM = { subjectName: '', semester: '', category: 'Note', file: null };

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
    if (!window.confirm(`Delete "${mat.subjectName}"?`)) return;
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

  const INPUT = "w-full px-3 py-2 border border-border-strong rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-surface text-foreground text-sm";
  const LABEL = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="min-h-screen bg-surface font-sans transition-colors duration-300">
      <SEOHead {...SEO.studyMaterials(selectedCollege)} />
      <Navbar />

      {/* HERO */}
      <div className="bg-gradient-to-br from-surface-inverse via-surface-inverse to-surface-inverse    py-10 px-4 sm:px-6 lg:px-8 text-center shadow-lg border-b border-primary/30">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 flex items-center justify-center gap-3">
          <FaBook className="text-primary" /> Study Materials
        </h1>
        <p className="text-inverse-muted text-lg max-w-2xl mx-auto">
          Access notes, exam papers, and books shared by your campus peers.
        </p>
        <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-subtle" />
          </div>
          <input
            type="text"
            placeholder="Search by subject name..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="block w-full pl-10 pr-24 py-3 rounded-full border-none shadow-xl focus:ring-2 focus:ring-primary focus:outline-none text-foreground bg-surface placeholder-subtle"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary hover:bg-primary text-white text-sm font-bold rounded-full transition">
            Search
          </button>
        </form>
      </div>

      {/* FILTERS + UPLOAD */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <FaFilter className="text-primary text-sm" />
          {/* Semester select */}
          <div className="relative">
            <select
              value={filterSem}
              onChange={e => setFilterSem(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 border border-border-strong rounded-full text-sm bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
            <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle text-xs pointer-events-none" />
          </div>
          {/* Category filter */}
          <div className="flex gap-1.5">
            <button onClick={() => setFilterCat('')} className={`px-3 py-1 rounded-full text-sm font-semibold transition ${filterCat === '' ? 'bg-primary text-white' : 'bg-surface-muted text-muted'}`}>All</button>
            {CATEGORIES.map(c => {
              const col = CATEGORY_COLORS[c];
              return (
                <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold border transition ${filterCat === c ? `${col.bg} ${col.text} ${col.border}` : 'bg-surface-muted text-muted'}`}
                >{c}</button>
              );
            })}
          </div>
          {(filterSem || filterCat || searchSubject) && (
            <button onClick={() => { setFilterSem(''); setFilterCat(''); setSearchSubject(''); setSearchInput(''); }} className="text-xs text-danger hover:text-danger font-semibold flex items-center gap-1">
              <FaTimes size={10} /> Clear
            </button>
          )}
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setForm(BLANK_FORM); setFilePreview(null); }}
          className="flex items-center px-6 py-2.5 bg-gradient-to-r from-primary to-success hover:from-primary hover:to-success text-white rounded-full font-bold shadow-md transition transform hover:-translate-y-0.5 flex-shrink-0"
        >
          <FaPlus className="mr-2" /> Upload Material
        </button>
      </div>

      {/* MATERIALS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-12 text-muted">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-4 rounded-full bg-surface-muted mb-4">
              <FaBook className="text-4xl text-subtle" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No materials found</h3>
            <p className="text-muted mt-1">Be the first to upload something!</p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map(mat => {
                const col = CATEGORY_COLORS[mat.category] || CATEGORY_COLORS['Note'];
                return (
                  <div key={mat._id} className="bg-surface rounded-xl shadow-md hover:shadow-lg transition border border-border overflow-hidden flex flex-col">
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Category + type icon */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.bg} ${col.text} ${col.border}`}>{mat.category}</span>
                        <div className="flex items-center gap-2">
                          {mat.fileType === 'pdf'
                            ? <FaFilePdf className="text-danger" title="PDF" />
                            : <FaImage className="text-info" title="Image" />
                          }
                          {canDelete(mat) && (
                            <button onClick={() => handleDelete(mat)} className="text-subtle hover:text-danger transition p-1 rounded hover:bg-danger-muted dark:hover:bg-danger/20" title="Delete">
                              <FaTrashAlt size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-foreground leading-snug mb-1">{mat.subjectName}</h3>
                      <p className="text-xs text-muted mb-4">Semester {mat.semester}</p>

                      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted">
                          By <span className="font-semibold text-foreground">{mat.uploadedBy?.name || 'Anonymous'}</span>
                        </span>
                        <a
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary text-white text-xs font-bold rounded-full transition"
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
                  className="px-8 py-2.5 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary-muted dark:hover:bg-primary/20 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
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
          <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-primary flex justify-between items-center bg-gradient-to-r from-primary-muted to-success-muted  ">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-success  ">
                Upload Study Material
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-subtle hover:text-muted dark:hover:text-subtle"><FaTimes size={20} /></button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
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
                      <label key={c} className={`flex-1 cursor-pointer border rounded-lg p-2.5 text-center text-sm font-semibold transition ${form.category === c ? `${col.bg} ${col.text} ${col.border}` : 'border-border text-muted hover:bg-surface-2 dark:hover:bg-surface-muted'}`}>
                        <input type="radio" name="category" value={c} checked={form.category === c} onChange={handleChange} className="hidden" />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={LABEL}>File (PDF or Image) *</label>
                <div className="border-2 border-dashed border-primary rounded-lg p-6 text-center cursor-pointer hover:bg-primary-muted dark:hover:bg-primary/10 relative">
                  <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {filePreview ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FaFilePdf />
                      <span className="text-sm font-medium truncate max-w-xs">{filePreview}</span>
                    </div>
                  ) : (
                    <div className="text-subtle flex flex-col items-center gap-2">
                      <FaUpload size={28} />
                      <span className="text-sm">Click to select PDF or image</span>
                      <span className="text-xs">Max 10 MB</span>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-primary to-success text-white rounded-lg font-bold shadow-md hover:from-primary hover:to-success transition flex items-center justify-center">
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