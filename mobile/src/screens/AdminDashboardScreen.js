import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
  Platform, StatusBar, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/axios';

const TABS = ['Stats', 'Users', 'Items', 'Reports'];

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={[styles.statIconBox, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboardScreen = () => {
  const [activeTab, setActiveTab] = useState('Stats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);

  // Ban modal
  const [banModal, setBanModal] = useState(false);
  const [banTarget, setBanTarget] = useState(null);

  const fetchAll = async () => {
    try {
      const [sRes, uRes, iRes, rRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/items'),
        API.get('/admin/reports'),
      ]);
      setStats(sRes.data);
      setUsers((uRes.data || []).filter(u => u.isVerified));
      setItems(iRes.data);
      setReports(rRes.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDeleteUser = (userId, userName) => {
    Alert.alert('Delete User', `Permanently delete "${userName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await API.delete(`/admin/users/${userId}`);
            setUsers(prev => prev.filter(u => u._id !== userId));
          } catch { Alert.alert('Error', 'Could not delete user.'); }
        }
      }
    ]);
  };

  const handleBan = async (type) => {
    if (!banTarget) return;
    try {
      await API.put(`/admin/users/${banTarget._id}/ban`, { banType: type });
      setUsers(prev => prev.map(u =>
        u._id === banTarget._id
          ? { ...u, isBanned: type !== 'unban' }
          : u
      ));
      setBanModal(false);
      setBanTarget(null);
      Alert.alert('Done', type === 'unban' ? 'User unbanned.' : 'User banned.');
    } catch { Alert.alert('Error', 'Could not update ban status.'); }
  };

  const handleDeleteItem = (itemId, itemTitle) => {
    Alert.alert('Delete Item', `Remove listing "${itemTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await API.delete(`/admin/items/${itemId}`);
            setItems(prev => prev.filter(i => i._id !== itemId));
            setReports(prev => prev.filter(i => i._id !== itemId));
          } catch { Alert.alert('Error', 'Could not delete item.'); }
        }
      }
    ]);
  };

  const handleDismissReport = async (itemId) => {
    try {
      await API.put(`/admin/items/${itemId}/dismiss-report`);
      setReports(prev => prev.filter(i => i._id !== itemId));
      Alert.alert('Done', 'Report dismissed.');
    } catch { Alert.alert('Error', 'Could not dismiss report.'); }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderStats = () => (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" colors={['#4f46e5']} progressBackgroundColor="#1e293b" />}
    >
      <Text style={styles.sectionHeading}>Platform Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard icon="people-outline" label="Users" value={stats?.usersCount} color="#818cf8" />
        <StatCard icon="pricetag-outline" label="Listings" value={stats?.itemsCount} color="#34d399" />
        <StatCard icon="checkmark-circle-outline" label="Sold" value={stats?.soldItemsCount} color="#fbbf24" />
        <StatCard icon="flag-outline" label="Reports" value={reports.length} color="#f87171" />
      </View>

      <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Quick Actions</Text>
      {[
        { label: 'Manage Users', tab: 'Users', icon: 'people', color: '#818cf8' },
        { label: 'Manage Listings', tab: 'Items', icon: 'grid', color: '#34d399' },
        { label: 'Review Reports', tab: 'Reports', icon: 'flag', color: '#f87171' },
      ].map(a => (
        <TouchableOpacity key={a.tab} style={styles.quickAction} onPress={() => setActiveTab(a.tab)}>
          <View style={[styles.qaIconBox, { backgroundColor: a.color + '22' }]}>
            <Ionicons name={a.icon} size={20} color={a.color} />
          </View>
          <Text style={styles.qaLabel}>{a.label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#475569" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderUsers = () => (
    <FlatList
      data={users}
      keyExtractor={u => u._id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" colors={['#4f46e5']} progressBackgroundColor="#1e293b" />}
      ListHeaderComponent={<Text style={styles.sectionHeading}>{users.length} Registered Users</Text>}
      renderItem={({ item: u }) => (
        <View style={styles.listCard}>
          <View style={styles.listCardLeft}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{u.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{u.name}</Text>
                {u.isAdmin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                )}
                {u.isBanned && (
                  <View style={styles.bannedBadge}>
                    <Text style={styles.bannedBadgeText}>Banned</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSub} numberOfLines={1}>{u.email}</Text>
              <Text style={styles.cardMeta}>{u.college}</Text>
            </View>
          </View>
          {!u.isAdmin && (
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: 'rgba(251,191,36,0.15)' }]}
                onPress={() => { setBanTarget(u); setBanModal(true); }}
              >
                <Ionicons name="ban-outline" size={17} color="#fbbf24" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: 'rgba(239,68,68,0.15)', marginLeft: 6 }]}
                onPress={() => handleDeleteUser(u._id, u.name)}
              >
                <Ionicons name="trash-outline" size={17} color="#f87171" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={<EmptyState icon="people-outline" text="No users found" />}
    />
  );

  const renderItems = () => (
    <FlatList
      data={items}
      keyExtractor={i => i._id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" colors={['#4f46e5']} progressBackgroundColor="#1e293b" />}
      ListHeaderComponent={<Text style={styles.sectionHeading}>{items.length} Total Listings</Text>}
      renderItem={({ item }) => (
        <View style={styles.listCard}>
          <View style={styles.listCardLeft}>
            <View style={[styles.userAvatar, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
              <Ionicons name="pricetag-outline" size={18} color="#34d399" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.cardSub}>₹{Number(item.price).toLocaleString('en-IN')} · {item.category}</Text>
              <Text style={styles.cardMeta}>by {item.seller?.name || 'Unknown'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]}
            onPress={() => handleDeleteItem(item._id, item.title)}
          >
            <Ionicons name="trash-outline" size={17} color="#f87171" />
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={<EmptyState icon="pricetag-outline" text="No listings found" />}
    />
  );

  const renderReports = () => (
    <FlatList
      data={reports}
      keyExtractor={i => i._id}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" colors={['#4f46e5']} progressBackgroundColor="#1e293b" />}
      ListHeaderComponent={<Text style={styles.sectionHeading}>{reports.length} Reported Items</Text>}
      renderItem={({ item }) => (
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <View style={styles.reportCountBadge}>
              <Ionicons name="flag" size={12} color="#f87171" />
              <Text style={styles.reportCountText}>{item.reportCount || 1} report{(item.reportCount || 1) > 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.cardMeta}>by {item.seller?.name || 'Unknown'}</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {item.reportReason ? (
            <Text style={styles.reportReason}>"{item.reportReason}"</Text>
          ) : null}
          <View style={styles.reportActions}>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => handleDismissReport(item._id)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#34d399" />
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteReportBtn}
              onPress={() => handleDeleteItem(item._id, item.title)}
            >
              <Ionicons name="trash-outline" size={16} color="#f87171" />
              <Text style={styles.deleteReportBtnText}>Delete Listing</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={<EmptyState icon="flag-outline" text="No reported items" />}
    />
  );

  const tabContent = () => {
    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
    switch (activeTab) {
      case 'Stats': return renderStats();
      case 'Users': return renderUsers();
      case 'Items': return renderItems();
      case 'Reports': return renderReports();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>KampusCart Control Panel</Text>
        </View>
        <View style={styles.adminBadgeLarge}>
          <Ionicons name="shield-checkmark" size={16} color="#818cf8" />
          <Text style={styles.adminBadgeLargeText}>Admin</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {tab === 'Reports' && reports.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{reports.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tabContent()}

      {/* Ban Modal */}
      <Modal visible={banModal} transparent animationType="slide" onRequestClose={() => setBanModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ban Options</Text>
            <Text style={styles.modalSub}>{banTarget?.name} · {banTarget?.email}</Text>
            <View style={styles.modalDivider} />

            {[
              { label: 'Temporary Ban (7 days)', value: 'temp', icon: 'time-outline', color: '#fbbf24' },
              { label: 'Permanent Ban', value: 'permanent', icon: 'ban-outline', color: '#f87171' },
              { label: 'Unban User', value: 'unban', icon: 'checkmark-circle-outline', color: '#34d399' },
            ].map(opt => (
              <TouchableOpacity key={opt.value} style={styles.banOption} onPress={() => handleBan(opt.value)}>
                <View style={[styles.qaIconBox, { backgroundColor: opt.color + '22' }]}>
                  <Ionicons name={opt.icon} size={20} color={opt.color} />
                </View>
                <Text style={styles.banOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setBanModal(false); setBanTarget(null); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const EmptyState = ({ icon, text }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={48} color="#334155" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 14,
    paddingBottom: 14, backgroundColor: '#0f172a',
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  headerSub: { fontSize: 13, color: '#475569', marginTop: 2 },
  adminBadgeLarge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(79,70,229,0.2)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(79,70,229,0.35)',
  },
  adminBadgeLargeText: { color: '#818cf8', fontSize: 13, fontWeight: '700', marginLeft: 5 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#0f172a',
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#4f46e5' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#818cf8' },
  tabBadge: {
    backgroundColor: '#ef4444', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4,
  },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  // Content
  tabContent: { padding: 16, paddingBottom: 40 },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47.5%', backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    borderTopColor: '#334155', borderRightColor: '#334155', borderBottomColor: '#334155',
  },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#f1f5f9', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  // Quick actions
  quickAction: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  qaIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  qaLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#f1f5f9' },

  // List cards
  listCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  listCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  userAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(79,70,229,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  userInitial: { fontSize: 18, fontWeight: '800', color: '#818cf8' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginRight: 6, flexShrink: 1 },
  cardSub: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  cardMeta: { fontSize: 11, color: '#475569' },
  adminBadge: { backgroundColor: 'rgba(79,70,229,0.2)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { fontSize: 10, color: '#818cf8', fontWeight: '700' },
  bannedBadge: { backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  bannedBadgeText: { fontSize: 10, color: '#f87171', fontWeight: '700' },
  actionBtns: { flexDirection: 'row' },
  iconBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Report cards
  reportCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#334155', marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reportCountBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  reportCountText: { fontSize: 11, color: '#f87171', fontWeight: '700', marginLeft: 4 },
  reportReason: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 4, marginBottom: 10 },
  reportActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dismissBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(52,211,153,0.12)', paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  dismissBtnText: { color: '#34d399', fontSize: 13, fontWeight: '600', marginLeft: 5 },
  deleteReportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)', paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  deleteReportBtnText: { color: '#f87171', fontSize: 13, fontWeight: '600', marginLeft: 5 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#475569', marginTop: 12 },

  // Ban modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderWidth: 1, borderColor: '#334155',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  modalDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  banOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  banOptionText: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', marginLeft: 12 },
  cancelBtn: {
    marginTop: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  cancelBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});

export default AdminDashboardScreen;
