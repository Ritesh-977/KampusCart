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
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans transition-colors">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-8">Admin Panel</h1>

                {/* TABS */}
                <div className="flex space-x-4 mb-8 border-b border-gray-200 dark:border-gray-700 pb-1 overflow-x-auto">
                    {['stats', 'users', 'items', 'reports'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 px-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            {tab === 'reports' ? (
                                <span className="flex items-center gap-2">
                                    Reports <FaFlag className={activeTab === 'reports' ? 'text-red-500' : ''} />
                                </span>
                            ) : tab}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading Dashboard...</div>
                ) : (
                    <>
                        {/* --- STATS TAB --- */}
                        {activeTab === 'stats' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mr-4"><FaUsers size={24} /></div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.usersCount}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                                    <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mr-4"><FaBoxOpen size={24} /></div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Items Listed</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.itemsCount}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                                    <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mr-4"><FaCheckCircle size={24} /></div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Items Sold</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.soldItemsCount}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- USERS TAB --- */}
                        {activeTab === 'users' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {users.map(u => (
                                                <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{u.name}</div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {u.isAdmin ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Admin</span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Student</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {u.isBanned ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                                {u.banExpiresAt ? `Suspended` : `Banned`}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {!u.isAdmin && (
                                                            <div className="flex justify-end items-center space-x-2">
                                                                {u.isBanned ? (
                                                                    <button onClick={() => handleBanUser(u._id, 'unban')} title="Unban User" className="text-green-600 bg-green-100 p-2 rounded-lg"><FaUnlock /></button>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => handleBanUser(u._id, 'temporary')} title="7 Day Ban" className="text-orange-600 bg-orange-100 p-2 rounded-lg"><FaClock /></button>
                                                                        <button onClick={() => handleBanUser(u._id, 'permanent')} title="Permanent Ban" className="text-red-600 bg-red-100 p-2 rounded-lg"><FaBan /></button>
                                                                    </>
                                                                )}
                                                                <button onClick={() => handleDeleteUser(u._id)} title="Delete User" className="text-gray-500 hover:text-red-600 p-2"><FaTrash /></button>
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
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Item</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Seller</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {items.map(item => (
                                                <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                                                                <img src={item.images[0]} className="h-full w-full object-cover" alt="" />
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">₹{item.price}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                        {item.seller?.name || "Unknown"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {item.isSold ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Sold</span>
                                                        ) : (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleDeleteItem(item._id)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition"
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
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                                {reportedItems.length === 0 ? (
                                    <div className="p-10 text-center text-gray-500">No reported items! Good job.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-red-50 dark:bg-red-900/20">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Reported Item</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Reason</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Seller</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-red-600 dark:text-red-300 uppercase tracking-wider">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {reportedItems.map(item => (
                                                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                                                                    <img src={item.images[0]} className="h-full w-full object-cover" alt="" />
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</div>
                                                                    <a href={`/item/${item._id}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">View Item</a>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200">
                                                                {item.reportReason || "No reason provided"}
                                                            </span>
                                                        </td>
                                                        {item.reportCount > 1 && (
                                                            <span className="mt-1 text-[10px] text-red-600 font-bold ml-1">
                                                                ⚠️ Reported {item.reportCount} times
                                                            </span>
                                                        )}
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                            {item.seller?.name || "Unknown"}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleDismissReport(item._id)}
                                                                    title="Dismiss Report (Keep Item)"
                                                                    className="text-gray-600 hover:text-green-600 bg-gray-100 hover:bg-green-100 px-3 py-1.5 rounded-lg transition border border-gray-200"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteItem(item._id)}
                                                                    title="Delete Item"
                                                                    className="text-red-600 hover:text-white bg-red-50 hover:bg-red-600 px-3 py-1.5 rounded-lg transition border border-red-100"
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