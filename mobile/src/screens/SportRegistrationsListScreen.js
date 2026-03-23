import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, FlatList, Alert, ActivityIndicator, Modal,
  Image, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import API from '../api/axios';

const STATUS_META = {
  pending:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)',  icon: 'time-outline',            label: 'Pending'  },
  approved: { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)',  icon: 'checkmark-circle-outline', label: 'Approved' },
  rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',   icon: 'close-circle-outline',     label: 'Rejected' },
};

const SportRegistrationsListScreen = ({ navigation, route }) => {
  const { sportId, sportTitle } = route.params;

  const [regs,       setRegs]       = useState([]);
  const [sportInfo,  setSportInfo]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating,   setUpdating]   = useState(null); // regId being updated

  // Proof viewer modal
  const [viewProof, setViewProof] = useState(null); // { url, type }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchRegs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get(`/sports/${sportId}/registrations`);
      setRegs(res.data?.data || []);
      setSportInfo(res.data?.sport || null);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Could not load registrations.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sportId]);

  useFocusEffect(useCallback(() => { fetchRegs(); }, [fetchRegs]));

  const onRefresh = () => { setRefreshing(true); fetchRegs(true); };

  // ── Export to CSV ────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!regs.length) {
      Alert.alert('No Data', 'There are no registrations to export yet.');
      return;
    }
    try {
      setExporting(true);

      // Build CSV content
      const headers = ['Team Name', 'Captain Name', 'Captain Contact', 'Course', 'Year', 'Status', 'Registered On'];
      const rows = regs.map(r => [
        r.teamName,
        r.captainName,
        r.captainContact,
        r.course,
        r.year,
        r.status.charAt(0).toUpperCase() + r.status.slice(1),
        new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Write to cache
      const safeName = sportTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      const fileName = `${safeName}_registrations.csv`;
      const fileUri  = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      // Open native share / save sheet
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Save ${sportTitle} Registrations`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Saved', `File saved to cache:\n${fileName}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', e?.message || 'Could not export. Try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Status update ────────────────────────────────────────────────────────────
  const updateStatus = async (regId, status) => {
    setUpdating(regId);
    try {
      const res = await API.patch(`/sports/${sportId}/registrations/${regId}`, { status });
      setRegs(prev =>
        prev.map(r => r._id === regId ? { ...r, status: res.data.data.status } : r)
      );
    } catch {
      Alert.alert('Error', 'Could not update status. Try again.');
    } finally {
      setUpdating(null);
    }
  };

  const confirmStatus = (reg, newStatus) => {
    const action = newStatus === 'approved' ? 'approve' : 'reject';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Registration`,
      `${action === 'approve' ? 'Approve' : 'Reject'} "${reg.teamName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: action.charAt(0).toUpperCase() + action.slice(1), onPress: () => updateStatus(reg._id, newStatus) },
      ]
    );
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = {
    total:    regs.length,
    approved: regs.filter(r => r.status === 'approved').length,
    pending:  regs.filter(r => r.status === 'pending').length,
    rejected: regs.filter(r => r.status === 'rejected').length,
  };

  // ── Render registration card ─────────────────────────────────────────────────
  const renderReg = ({ item }) => {
    const meta      = STATUS_META[item.status] || STATUS_META.pending;
    const isUpdating = updating === item._id;

    return (
      <View style={s.card}>
        {/* Top row: team name + status badge */}
        <View style={s.cardTop}>
          <View style={s.teamNameRow}>
            <Ionicons name="trophy-outline" size={16} color="#818cf8" />
            <Text style={s.teamName}>{item.teamName}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={s.detailsGrid}>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>Captain</Text>
            <Text style={s.detailValue}>{item.captainName}</Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>Contact</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.captainContact}`)}>
              <Text style={[s.detailValue, s.link]}>{item.captainContact}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>Course</Text>
            <Text style={s.detailValue}>{item.course}</Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>Year</Text>
            <Text style={s.detailValue}>{item.year}</Text>
          </View>
        </View>

        {/* Payment proof */}
        {!!item.paymentProofUrl && (
          <TouchableOpacity
            style={s.proofRow}
            onPress={() => setViewProof({ url: item.paymentProofUrl, type: item.paymentProofType })}
          >
            <Ionicons
              name={item.paymentProofType === 'pdf' ? 'document-outline' : 'image-outline'}
              size={14}
              color="#818cf8"
            />
            <Text style={s.proofTxt}>View Payment Proof</Text>
            <Ionicons name="chevron-forward" size={12} color="#475569" />
          </TouchableOpacity>
        )}

        {/* WhatsApp quick contact */}
        <TouchableOpacity
          style={s.waRow}
          onPress={() => Linking.openURL(`https://wa.me/${item.captainContact.replace(/\D/g, '')}`)}
        >
          <Ionicons name="logo-whatsapp" size={14} color="#25d366" />
          <Text style={[s.proofTxt, { color: '#25d366' }]}>WhatsApp Captain</Text>
        </TouchableOpacity>

        {/* Approve / Reject actions for pending */}
        {item.status === 'pending' && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, s.approveBtn, isUpdating && s.btnOff]}
              onPress={() => confirmStatus(item, 'approved')}
              disabled={isUpdating}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                    <Text style={s.actionTxt}>Approve</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.rejectBtn, isUpdating && s.btnOff]}
              onPress={() => confirmStatus(item, 'rejected')}
              disabled={isUpdating}
            >
              <Ionicons name="close-circle-outline" size={15} color="#fff" />
              <Text style={s.actionTxt}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Re-open rejected/approved to pending */}
        {item.status !== 'pending' && (
          <TouchableOpacity
            style={[s.resetBtn, isUpdating && s.btnOff]}
            onPress={() => updateStatus(item._id, 'pending')}
            disabled={isUpdating}
          >
            <Text style={s.resetTxt}>Reset to Pending</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{sportTitle}</Text>
          <Text style={s.headerSub}>Registrations</Text>
        </View>
        <TouchableOpacity
          style={[s.exportBtn, exporting && { opacity: 0.5 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="download-outline" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      ) : (
        <>
          {/* Stats bar */}
          <View style={s.statsBar}>
            {[
              { label: 'Total',    value: stats.total,    color: '#f1f5f9' },
              { label: 'Approved', value: stats.approved, color: '#34d399' },
              { label: 'Pending',  value: stats.pending,  color: '#fbbf24' },
              { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
            ].map(stat => (
              <View key={stat.label} style={s.statItem}>
                <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <FlatList
            data={regs}
            keyExtractor={item => item._id}
            renderItem={renderReg}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" colors={['#818cf8']} />
            }
            contentContainerStyle={[s.list, !regs.length && s.listEmpty]}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Ionicons name="people-outline" size={48} color="#334155" />
                <Text style={s.emptyTitle}>No registrations yet</Text>
                <Text style={s.emptySub}>Share the sport event so students can register.</Text>
              </View>
            }
          />
        </>
      )}

      {/* Payment proof modal */}
      <Modal visible={!!viewProof} transparent animationType="fade">
        <View style={s.proofModal}>
          <TouchableOpacity style={s.proofClose} onPress={() => setViewProof(null)}>
            <Ionicons name="close-circle" size={32} color="#f1f5f9" />
          </TouchableOpacity>
          {viewProof?.type === 'image' ? (
            <Image source={{ uri: viewProof.url }} style={s.proofImage} resizeMode="contain" />
          ) : (
            <View style={s.proofPdfBox}>
              <Ionicons name="document-outline" size={64} color="#818cf8" />
              <Text style={s.proofPdfTxt}>PDF Payment Proof</Text>
              <TouchableOpacity
                style={s.openPdfBtn}
                onPress={() => { Linking.openURL(viewProof.url); setViewProof(null); }}
              >
                <Text style={s.openPdfTxt}>Open PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SportRegistrationsListScreen;

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  iconBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  exportBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#15803d', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: '#f1f5f9' },
  headerSub:    { fontSize: 11, color: '#64748b', marginTop: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Stats bar
  statsBar:  { flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  statItem:  { flex: 1, alignItems: 'center' },
  statNum:   { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },

  list:      { padding: 16, gap: 12 },
  listEmpty: { flexGrow: 1 },

  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },

  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  teamName:    { fontSize: 15, fontWeight: '700', color: '#f1f5f9', flex: 1 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem:  { width: '47%' },
  detailLabel: { fontSize: 10, color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 13, color: '#f1f5f9', fontWeight: '600', marginTop: 2 },
  link:        { color: '#818cf8' },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#334155' },
  waRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  proofTxt: { fontSize: 13, color: '#818cf8', fontWeight: '600', flex: 1 },

  actionRow:  { flexDirection: 'row', gap: 10, paddingTop: 4 },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: '#15803d' },
  rejectBtn:  { backgroundColor: '#b91c1c' },
  actionTxt:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnOff:     { opacity: 0.5 },
  resetBtn:   { alignItems: 'center', paddingVertical: 6 },
  resetTxt:   { fontSize: 12, color: '#64748b' },

  emptyBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#f1f5f9' },
  emptySub:   { fontSize: 13, color: '#64748b', textAlign: 'center', paddingHorizontal: 32 },

  // Proof modal
  proofModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  proofClose: { position: 'absolute', top: 52, right: 20 },
  proofImage: { width: '90%', height: '70%' },
  proofPdfBox: { alignItems: 'center', gap: 16 },
  proofPdfTxt: { color: '#f1f5f9', fontSize: 16, fontWeight: '600' },
  openPdfBtn:  { backgroundColor: '#818cf8', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  openPdfTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});
