import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import {
    FaUsers, FaBoxOpen, FaTrash, FaCheckCircle,
    FaBan, FaClock, FaUnlock, FaFlag, FaTimes // Added FaFlag, FaTimes
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ usersCount: 0, itemsCount: 0, soldItemsCount: 0 });
    const [users, setUsers] = useState([]);
    const [items, setItems] = useState([]);

    // 1. New State for Reports
    const [reportedItems, setReportedItems] = useState([]);
    const [activeTab, setActiveTab] = useState('stats');
    const [loading, setLoading] = useState(true);
    const [userSearch, setUserSearch] = useState('');

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || !user.isAdmin) {
            toast.error("Access Denied: Admins Only");
            navigate('/');
            return;
        }
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'stats') {
                const { data } = await API.get('/admin/stats');
                setStats(data);
            } else if (activeTab === 'users') {
                const { data } = await API.get('/admin/users');
                const verifiedUsersOnly = data.filter(u => u.isVerified);
                setUsers(verifiedUsersOnly);
            } else if (activeTab === 'items') {
                const { data } = await API.get('/admin/items');
                setItems(data);
            } else if (activeTab === 'reports') {
                // 2. Fetch Reported Items
                const { data } = await API.get('/admin/reports');
                setReportedItems(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch admin data");
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Delete this user permanently?")) return;
        try {
            await API.delete(`/admin/users/${id}`);
            toast.success("User deleted");
            setUsers(users.filter(u => u._id !== id));
        } catch (error) { toast.error(error.response?.data?.message || "Delete failed"); }
    };

    const handleBanUser = async (id, type) => {
        const confirmMsg = type === 'unban'
            ? "Unban this user?"
            : type === 'permanent'
                ? "Permanently ban this user?"
                : "Ban this user for 7 days?";

        if (!window.confirm(confirmMsg)) return;

        try {
            await API.put(`/admin/users/${id}/ban`, { banType: type });
            toast.success(`User ${type === 'unban' ? 'unbanned' : 'banned'}`);
            const { data } = await API.get('/admin/users');
            setUsers(data);
        } catch (error) { toast.error("Action failed"); }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Remove this item listing?")) return;
        try {
            await API.delete(`/admin/items/${id}`);
            toast.success("Item removed");
            setItems(items.filter(i => i._id !== id));
            setReportedItems(reportedItems.filter(i => i._id !== id)); // Also remove from reports list
        } catch (error) { toast.error("Delete failed"); }
    };

    // 3. Dismiss Report Action (Keep item, clear flag)
    const handleDismissReport = async (id) => {
        try {
            await API.put(`/admin/items/${id}/dismiss-report`);
            toast.success("Report dismissed");
            setReportedItems(reportedItems.filter(i => i._id !== id));
        } catch (error) {
            toast.error("Failed to dismiss report");
        }
    };

    return (
        <div className="min-h-screen bg-surface-muted font-sans transition-colors">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-black text-foreground mb-8">Admin Panel</h1>

                {/* TABS */}
                <div className="flex space-x-4 mb-8 border-b border-border pb-1 overflow-x-auto">
                    {['stats', 'users', 'items', 'reports'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted hover:text-foreground'
                                }`}
                        >
                            {tab === 'reports' ? (
                                <span className="flex items-center gap-2">
                                    Reports <FaFlag className={activeTab === 'reports' ? 'text-danger' : ''} />
                                </span>
                            ) : tab}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-muted">Loading Dashboard...</div>
                ) : (
                    <>
                        {/* --- STATS TAB --- */}
                        {activeTab === 'stats' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex items-center">
                                    <div className="p-4 bg-info-muted text-info rounded-full mr-4"><FaUsers size={24} /></div>
                                    <div>
                                        <p className="text-sm text-muted">Total Users</p>
                                        <p className="text-2xl font-bold text-foreground">{stats.usersCount}</p>
                                    </div>
                                </div>
                                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex items-center">
                                    <div className="p-4 bg-tertiary-muted text-tertiary rounded-full mr-4"><FaBoxOpen size={24} /></div>
                                    <div>
                                        <p className="text-sm text-muted">Total Items Listed</p>
                                        <p className="text-2xl font-bold text-foreground">{stats.itemsCount}</p>
                                    </div>
                                </div>
                                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border flex items-center">
                                    <div className="p-4 bg-success-muted text-success rounded-full mr-4"><FaCheckCircle size={24} /></div>
                                    <div>
                                        <p className="text-sm text-muted">Items Sold</p>
                                        <p className="text-2xl font-bold text-foreground">{stats.soldItemsCount}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- USERS TAB --- */}
                        {activeTab === 'users' && (
                            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden border border-border">
                                <div className="p-4 border-b border-border">
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        className="w-full sm:w-80 px-4 py-2 text-sm rounded-lg border border-border-strong bg-surface-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-surface-2">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-muted uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-surface divide-y divide-border">
                                            {users.filter(u =>
                                                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                u.email.toLowerCase().includes(userSearch.toLowerCase())
                                            ).map(u => (
                                                <tr key={u._id} className="hover:bg-surface-2 dark:hover:bg-surface-muted transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div
                                                            className="flex items-center cursor-pointer group"
                                                            onClick={() => navigate(`/profile/view/${u._id}`)}
                                                        >
                                                            <div className="flex-shrink-0 h-10 w-10 bg-primary-muted rounded-full flex items-center justify-center text-primary font-bold">
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-foreground group-hover:text-primary dark:group-hover:text-primary transition">{u.name}</div>
                                                                <div className="text-sm text-muted">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {u.isAdmin ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-muted text-primary">Admin</span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-surface-muted text-subtle">Student</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {u.isBanned ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-muted text-danger">
                                                                {u.banExpiresAt ? `Suspended` : `Banned`}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-muted text-success">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {!u.isAdmin && (
                                                            <div className="flex justify-end items-center space-x-2">
                                                                {u.isBanned ? (
                                                                    <button onClick={() => handleBanUser(u._id, 'unban')} title="Unban User" className="text-success bg-success-muted p-2 rounded-lg"><FaUnlock /></button>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => handleBanUser(u._id, 'temporary')} title="7 Day Ban" className="text-warning bg-warning-muted p-2 rounded-lg"><FaClock /></button>
                                                                        <button onClick={() => handleBanUser(u._id, 'permanent')} title="Permanent Ban" className="text-danger bg-danger-muted p-2 rounded-lg"><FaBan /></button>
                                                                    </>
                                                                )}
                                                                <button onClick={() => handleDeleteUser(u._id)} title="Delete User" className="text-muted hover:text-danger p-2"><FaTrash /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- ITEMS TAB --- */}
                        {activeTab === 'items' && (
                            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden border border-border">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-border">
                                        <thead className="bg-surface-2">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Item</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Seller</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-muted uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-surface divide-y divide-border">
                                            {items.map(item => (
                                                <tr key={item._id} className="hover:bg-surface-2 dark:hover:bg-surface-muted transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                                                                <img src={item.images[0]?.url || item.images[0]} className="h-full w-full object-cover" alt="" />
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-foreground">{item.title}</div>
                                                                <div className="text-sm text-muted">₹{item.price}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                        {item.seller?.name || "Unknown"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.isSold ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-muted text-danger">Sold</span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-muted text-success">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleDeleteItem(item._id)}
                                                            className="text-danger hover:text-danger bg-danger-muted px-3 py-1.5 rounded-lg border border-danger hover:bg-danger-muted transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- 4. NEW REPORTS TAB --- */}
                        {activeTab === 'reports' && (
                            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden border border-border">
                                {reportedItems.length === 0 ? (
                                    <div className="p-10 text-center text-muted">No reported items! Good job.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-border">
                                            <thead className="bg-danger-muted">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-danger uppercase tracking-wider">Reported Item</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-danger uppercase tracking-wider">Reason</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-danger uppercase tracking-wider">Seller</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-danger uppercase tracking-wider">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-surface divide-y divide-border">
                                                {reportedItems.map(item => (
                                                    <tr key={item._id} className="hover:bg-surface-2 dark:hover:bg-surface-muted transition">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                                                                    <img src={item.images[0]?.url || item.images[0]} className="h-full w-full object-cover" alt="" />
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-bold text-foreground">{item.title}</div>
                                                                    <a href={`/item/${item._id}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View Item</a>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-danger-muted text-danger border border-danger">
                                                                {item.reportReason || "No reason provided"}
                                                            </span>
                                                        </td>
                                                        {item.reportCount > 1 && (
                                                            <span className="mt-1 text-[10px] text-danger font-bold ml-1">
                                                                ⚠️ Reported {item.reportCount} times
                                                            </span>
                                                        )}
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                            {item.seller?.name || "Unknown"}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleDismissReport(item._id)}
                                                                    title="Dismiss Report (Keep Item)"
                                                                    className="text-muted hover:text-success bg-surface-muted hover:bg-success-muted px-3 py-1.5 rounded-lg transition border border-border"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteItem(item._id)}
                                                                    title="Delete Item"
                                                                    className="text-danger hover:text-white bg-danger-muted hover:bg-danger px-3 py-1.5 rounded-lg transition border border-danger"
                                                                >
                                                                    Delete Item
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard; //h