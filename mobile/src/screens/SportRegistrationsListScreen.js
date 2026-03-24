import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, FlatList, Alert, ActivityIndicator, Modal,
  Image, Linking, RefreshControl, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import API from '../api/axios';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Update path as needed

// A dynamic builder function since it needs theme colors (but keeps the semantic red/green/yellow for statuses)
const getStatusMeta = (status) => {
  const meta = {
    pending:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)',  icon: 'time-outline',            label: 'Pending'  },
    approved: { color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)',  icon: 'checkmark-circle-outline', label: 'Approved' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',   icon: 'close-circle-outline',     label: 'Rejected' },
  };
  return meta[status] || meta.pending;
};

const SportRegistrationsListScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

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
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });

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
    const meta      = getStatusMeta(item.status);
    const isUpdating = updating === item._id;

    return (
      <View style={styles.card}>
        {/* Top row: team name + status badge */}
        <View style={styles.cardTop}>
          <View style={styles.teamNameRow}>
            <Ionicons name="trophy-outline" size={16} color={colors.primaryAccent} />
            <Text style={styles.teamName}>{item.teamName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.statusTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Captain</Text>
            <Text style={styles.detailValue}>{item.captainName}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contact</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.captainContact}`)}>
              <Text style={[styles.detailValue, styles.link]}>{item.captainContact}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Course</Text>
            <Text style={styles.detailValue}>{item.course}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Year</Text>
            <Text style={styles.detailValue}>{item.year}</Text>
          </View>
        </View>

        {/* Payment proof */}
        {!!item.paymentProofUrl && (
          <TouchableOpacity
            style={styles.proofRow}
            onPress={() => setViewProof({ url: item.paymentProofUrl, type: item.paymentProofType })}
          >
            <Ionicons
              name={item.paymentProofType === 'pdf' ? 'document-outline' : 'image-outline'}
              size={14}
              color={colors.primaryAccent}
            />
            <Text style={styles.proofTxt}>View Payment Proof</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* WhatsApp quick contact */}
        <TouchableOpacity
          style={styles.waRow}
          onPress={() => Linking.openURL(`https://wa.me/${item.captainContact.replace(/\D/g, '')}`)}
        >
          <Ionicons name="logo-whatsapp" size={14} color="#25d366" />
          <Text style={[styles.proofTxt, { color: '#25d366' }]}>WhatsApp Captain</Text>
        </TouchableOpacity>

        {/* Approve / Reject actions for pending */}
        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn, isUpdating && styles.btnOff]}
              onPress={() => confirmStatus(item, 'approved')}
              disabled={isUpdating}
            >
              {isUpdating
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#ffffff" />
                    <Text style={styles.actionTxt}>Approve</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, isUpdating && styles.btnOff]}
              onPress={() => confirmStatus(item, 'rejected')}
              disabled={isUpdating}
            >
              <Ionicons name="close-circle-outline" size={15} color="#ffffff" />
              <Text style={styles.actionTxt}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Re-open rejected/approved to pending */}
        {item.status !== 'pending' && (
          <TouchableOpacity
            style={[styles.resetBtn, isUpdating && styles.btnOff]}
            onPress={() => updateStatus(item._id, 'pending')}
            disabled={isUpdating}
          >
            <Text style={styles.resetTxt}>Reset to Pending</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{sportTitle}</Text>
          <Text style={styles.headerSub}>Registrations</Text>
        </View>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Ionicons name="download-outline" size={18} color="#ffffff" />
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryAction} />
        </View>
      ) : (
        <>
          {/* Stats bar */}
          <View style={styles.statsBar}>
            {[
              { label: 'Total',    value: stats.total,    color: colors.textMain },
              { label: 'Approved', value: stats.approved, color: '#34d399' },
              { label: 'Pending',  value: stats.pending,  color: '#fbbf24' },
              { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
            ].map(stat => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={[styles.statNum, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <FlatList
            data={regs}
            keyExtractor={item => item._id}
            renderItem={renderReg}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryAction} colors={[colors.primaryAction]} />
            }
            contentContainerStyle={[styles.list, !regs.length && styles.listEmpty]}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No registrations yet</Text>
                <Text style={styles.emptySub}>Share the sport event so students can register.</Text>
              </View>
            }
          />
        </>
      )}

      {/* Payment proof modal */}
      <Modal visible={!!viewProof} transparent animationType="fade">
        <View style={styles.proofModal}>
          <TouchableOpacity style={styles.proofClose} onPress={() => setViewProof(null)}>
            <Ionicons name="close-circle" size={32} color="#ffffff" />
          </TouchableOpacity>
          {viewProof?.type === 'image' ? (
            <Image source={{ uri: viewProof.url }} style={styles.proofImage} resizeMode="contain" />
          ) : (
            <View style={styles.proofPdfBox}>
              <Ionicons name="document-outline" size={64} color={colors.primaryAccent} />
              <Text style={styles.proofPdfTxt}>PDF Payment Proof</Text>
              <TouchableOpacity
                style={styles.openPdfBtn}
                onPress={() => { Linking.openURL(viewProof.url); setViewProof(null); }}
              >
                <Text style={styles.openPdfTxt}>Open PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SportRegistrationsListScreen;

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: theme.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10, 
    marginTop: Platform.OS === 'ios' ? 20 : 0, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.headerDivider,
    backgroundColor: theme.header,
  },
  iconBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  exportBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#15803d', justifyContent: 'center', alignItems: 'center' }, // Semantic Green
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: theme.textMain },
  headerSub:    { fontSize: 11, color: theme.textSub, marginTop: 1 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Stats bar
  statsBar:  { flexDirection: 'row', backgroundColor: theme.card, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.cardAccent },
  statItem:  { flex: 1, alignItems: 'center' },
  statNum:   { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: theme.textSub, marginTop: 2 },

  list:      { padding: 16, gap: 12 },
  listEmpty: { flexGrow: 1 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.cardAccent,
    gap: 10,
  },

  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  teamName:    { fontSize: 15, fontWeight: '700', color: theme.textMain, flex: 1 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem:  { width: '47%' },
  detailLabel: { fontSize: 10, color: theme.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 13, color: theme.textMain, fontWeight: '600', marginTop: 2 },
  link:        { color: theme.primaryAccent },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.cardAccent },
  waRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  proofTxt: { fontSize: 13, color: theme.primaryAccent, fontWeight: '600', flex: 1 },

  actionRow:  { flexDirection: 'row', gap: 10, paddingTop: 4 },
  actionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  approveBtn: { backgroundColor: '#15803d' }, // Semantic dark green
  rejectBtn:  { backgroundColor: '#b91c1c' }, // Semantic dark red
  actionTxt:  { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  btnOff:     { opacity: 0.5 },
  resetBtn:   { alignItems: 'center', paddingVertical: 6 },
  resetTxt:   { fontSize: 12, color: theme.textSub },

  emptyBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.textMain },
  emptySub:   { fontSize: 13, color: theme.textSub, textAlign: 'center', paddingHorizontal: 32 },

  // Proof modal
  proofModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }, // Kept pure black overlay
  proofClose: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  proofImage: { width: '90%', height: '70%' },
  proofPdfBox: { alignItems: 'center', gap: 16 },
  proofPdfTxt: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  openPdfBtn:  { backgroundColor: theme.primaryAction, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20 },
  openPdfTxt:  { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});