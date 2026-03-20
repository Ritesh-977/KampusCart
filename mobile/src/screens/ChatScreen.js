import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Image, Alert, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import API from '../api/axios';

const FALLBACK_AVATAR =
  'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

// ─── helpers ────────────────────────────────────────────────────────────────
const normalizeId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

const isImageUrl = (str) =>
  typeof str === 'string' &&
  /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(str);

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── component ──────────────────────────────────────────────────────────────
export default function ChatScreen({ route, navigation }) {
  const { chat, otherUser } = route.params;
  const { currentUser } = useContext(AuthContext);
  const { socketRef, connected, onlineUsers } = useContext(SocketContext);


  const myId = useMemo(
    () => String(currentUser?._id || currentUser?.id || ''),
    [currentUser]
  );

  const checkIsMe = useCallback(
    (msg) => {
      if (!myId) return false;
      const sid = normalizeId(msg?.sender?._id) || normalizeId(msg?.sender?.id) || normalizeId(msg?.sender);
      return sid === myId;
    },
    [myId]
  );

  // Derive online status directly from the shared context — updates in real time
  const isOnline = useMemo(
    () => (otherUser?._id ? onlineUsers.has(String(otherUser._id)) : false),
    [onlineUsers, otherUser]
  );

  // ── state ──
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndices, setMatchIndices] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);

  // refs
  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const searchRef = useRef(null);

  // ── header ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: {
        backgroundColor: '#1e293b',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        borderBottomWidth: 1,
        borderBottomColor: '#2d3f5f',
      },
      headerTintColor: '#fff',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingLeft: 4, paddingRight: 2 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <TouchableOpacity
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={styles.headerAvatarWrapper}>
            <Image
              source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
              style={styles.headerAvatar}
            />
            {isOnline && <View style={styles.headerOnlineDot} />}
          </View>
          <View style={{ justifyContent: 'center' }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser?.name || 'Chat'}
            </Text>
            {isTyping ? (
              <Text style={styles.headerStatusTyping}>typing…</Text>
            ) : isOnline ? (
              <Text style={styles.headerStatusOnline}>Online</Text>
            ) : (
              <Text style={styles.headerStatusOffline}>Offline</Text>
            )}
          </View>
        </TouchableOpacity>
      ),
      headerTitleAlign: 'left',
      headerRight: () => (
        <TouchableOpacity
          onPress={openSearch}
          style={{ marginRight: 14, padding: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="search-outline" size={22} color="#94a3b8" />
        </TouchableOpacity>
      ),
    });
  }, [isOnline, isTyping, searchVisible]);

  // ── fetch messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
  }, []);

  // ── socket room + listeners ─────────────────────────────────────────────────
  // Re-runs whenever the socket connects (or reconnects)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected) return;

    console.log('[ChatScreen] Socket connected, joining room:', chat._id);
    socket.emit('join chat', chat._id);

    const handleMessage = (msg) => {
      console.log('[ChatScreen] message received:', msg?._id);
      // Only handle messages for this chat
      const msgChatId = normalizeId(msg?.chat?._id) || normalizeId(msg?.chat);
      if (msgChatId && msgChatId !== chat._id) return;
      const senderId = normalizeId(msg?.sender?._id) || normalizeId(msg?.sender);
      if (myId && senderId === myId) return;
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      API.put('/message/read', { chatId: chat._id }).catch(() => {});
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on('message received', handleMessage);
    socket.on('typing', handleTyping);
    socket.on('stop typing', handleStopTyping);

    return () => {
      socket.off('message received', handleMessage);
      socket.off('typing', handleTyping);
      socket.off('stop typing', handleStopTyping);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [connected, myId]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchMessages = async () => {
    try {
      const res = await API.get(`/message/${chat._id}`);
      setMessages(res.data || []);
      API.put('/message/read', { chatId: chat._id }).catch(() => {});
    } catch (e) {
      console.error('fetch messages:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── send text ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');
    socketRef.current?.emit('stop typing', chat._id);

    const tempId = `tmp_${Date.now()}`;
    setMessages((prev) => [...prev, {
      _id: tempId,
      content: text,
      sender: { _id: myId, name: currentUser?.name },
      chat: { _id: chat._id, users: chat.users },
      createdAt: new Date().toISOString(),
      _pending: true,
    }]);

    try {
      const res = await API.post('/message', { content: text, chatId: chat._id });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data : m)));
      console.log('[ChatScreen] Emitting new message');
      socketRef.current?.emit('new message', res.data);
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, _failed: true, _pending: false } : m))
      );
    }
  };

  // ── send image ─────────────────────────────────────────────────────────────
  const handleAttach = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Needed', 'Allow photo access to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
    });
    if (result.canceled) return;

    const { uri } = result.assets[0];
    const filename = uri.split('/').pop();
    const ext = /\.(\w+)$/.exec(filename);
    const type = ext ? `image/${ext[1]}` : 'image/jpeg';

    const tempId = `tmp_img_${Date.now()}`;
    setMessages((prev) => [...prev, {
      _id: tempId,
      content: uri,
      isImage: true,
      sender: { _id: myId },
      chat: { _id: chat._id, users: chat.users },
      createdAt: new Date().toISOString(),
      _pending: true,
    }]);

    try {
      const form = new FormData();
      form.append('image', { uri, name: filename, type });
      const up = await API.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = up.data?.url || up.data?.secure_url || up.data;
      const res = await API.post('/message', { content: imageUrl, chatId: chat._id });
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...res.data, isImage: true } : m))
      );
      socketRef.current?.emit('new message', { ...res.data, isImage: true });
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      Alert.alert('Failed', 'Could not send image.');
    }
  };

  // ── typing ─────────────────────────────────────────────────────────────────
  const handleChangeText = (text) => {
    setNewMessage(text);
    if (!socketRef.current) return;
    socketRef.current.emit('typing', chat._id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('stop typing', chat._id);
    }, 2000);
  };

  // ── search ─────────────────────────────────────────────────────────────────
  const openSearch = () => {
    setSearchVisible(true);
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  const closeSearch = () => {
    setSearchVisible(false);
    setSearchQuery('');
    setMatchIndices([]);
    setCurrentMatch(0);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setMatchIndices([]); setCurrentMatch(0); return; }
    const lower = q.toLowerCase();
    const indices = messages.reduce((acc, msg, i) => {
      if (typeof msg.content === 'string' && msg.content.toLowerCase().includes(lower)) acc.push(i);
      return acc;
    }, []);
    setMatchIndices(indices);
    setCurrentMatch(0);
    if (indices.length > 0) scrollToMatch(indices[0]);
  };

  const scrollToMatch = (msgIndex) => {
    flatListRef.current?.scrollToIndex({ index: msgIndex, animated: true, viewPosition: 0.5 });
  };

  const goToPrevMatch = () => {
    if (!matchIndices.length) return;
    const next = (currentMatch - 1 + matchIndices.length) % matchIndices.length;
    setCurrentMatch(next);
    scrollToMatch(matchIndices[next]);
  };

  const goToNextMatch = () => {
    if (!matchIndices.length) return;
    const next = (currentMatch + 1) % matchIndices.length;
    setCurrentMatch(next);
    scrollToMatch(matchIndices[next]);
  };

  // ── render highlighted text ────────────────────────────────────────────────
  const renderHighlightedText = useCallback(
    (text, mine, isCurrentMatchItem) => {
      const baseStyle = [styles.bubbleText, mine ? styles.textMe : styles.textOther];
      if (!searchQuery || !text) return <Text style={baseStyle}>{text}</Text>;
      const lower = text.toLowerCase();
      const lowerQuery = searchQuery.toLowerCase();
      const segments = [];
      let pos = 0;
      while (pos < text.length) {
        const idx = lower.indexOf(lowerQuery, pos);
        if (idx === -1) { segments.push({ t: text.slice(pos), h: false }); break; }
        if (idx > pos) segments.push({ t: text.slice(pos, idx), h: false });
        segments.push({ t: text.slice(idx, idx + searchQuery.length), h: true });
        pos = idx + searchQuery.length;
      }
      return (
        <Text style={baseStyle}>
          {segments.map((seg, i) =>
            seg.h
              ? <Text key={i} style={isCurrentMatchItem ? styles.matchCurrent : styles.matchOther}>{seg.t}</Text>
              : seg.t
          )}
        </Text>
      );
    },
    [searchQuery]
  );

  // ── render message ─────────────────────────────────────────────────────────
  const otherUserId = useMemo(
    () => String(otherUser?._id || otherUser?.id || ''),
    [otherUser]
  );

  const renderMessage = useCallback(
    ({ item, index }) => {
      const mine = checkIsMe(item);
      const prevSender = normalizeId(messages[index - 1]?.sender?._id) || normalizeId(messages[index - 1]?.sender);
      const nextSender = normalizeId(messages[index + 1]?.sender?._id) || normalizeId(messages[index + 1]?.sender);
      const thisSender = normalizeId(item.sender?._id) || normalizeId(item.sender);
      const groupedWithNext = thisSender === nextSender;
      const showTime = !groupedWithNext;
      const showAvatar = !mine && !groupedWithNext;
      const isImg = item.isImage || isImageUrl(item.content);
      const isHighlighted = searchQuery && matchIndices.includes(index);
      const isCurrentMatch = isHighlighted && matchIndices[currentMatch] === index;

      // Read receipt: true if the other user's ID is in readBy
      const isRead = mine && !item._pending && !item._failed && otherUserId
        && (item.readBy || []).some((id) => String(id) === otherUserId);

      return (
        <View style={[styles.row, mine ? styles.rowRight : styles.rowLeft, !groupedWithNext && styles.rowSpaced]}>
          {!mine && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <Image source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }} style={styles.msgAvatar} />
              )}
            </View>
          )}
          <View style={[styles.bubbleCol, mine ? styles.bubbleColRight : styles.bubbleColLeft]}>
            {isImg ? (
              <View style={[styles.imgBubble, mine ? styles.imgBubbleMe : styles.imgBubbleOther, isCurrentMatch && styles.imgBubbleCurrentMatch]}>
                <Image source={{ uri: item.content }} style={styles.chatImage} resizeMode="cover" />
                {item._pending && (
                  <View style={styles.imgOverlay}><ActivityIndicator color="#fff" /></View>
                )}
              </View>
            ) : (
              <View style={[
                styles.bubble,
                mine ? styles.bubbleMe : styles.bubbleOther,
                mine ? (prevSender !== thisSender ? styles.tailTopRight : null) : (prevSender !== thisSender ? styles.tailTopLeft : null),
                isCurrentMatch && styles.bubbleCurrentMatch,
              ]}>
                {renderHighlightedText(item.content, mine, isCurrentMatch)}
              </View>
            )}
            {showTime && (
              <View style={[styles.metaRow, mine ? styles.metaRight : styles.metaLeft]}>
                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                {mine && (
                  <Ionicons
                    name={item._pending ? 'time-outline' : item._failed ? 'alert-circle-outline' : 'checkmark-done-outline'}
                    size={13}
                    color={item._failed ? '#ef4444' : isRead ? '#818cf8' : '#475569'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      );
    },
    [checkIsMe, messages, searchQuery, matchIndices, currentMatch, otherUser, otherUserId, renderHighlightedText]
  );

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar backgroundColor="#1e293b" barStyle="light-content" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        {searchVisible && (
          <View style={styles.searchBar}>
            <TouchableOpacity onPress={closeSearch} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={20} color="#f1f5f9" />
            </TouchableOpacity>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search messages"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {matchIndices.length > 0 ? (
              <View style={styles.searchNav}>
                <Text style={styles.searchCount}>{currentMatch + 1}/{matchIndices.length}</Text>
                <TouchableOpacity onPress={goToPrevMatch} style={styles.navBtn}>
                  <Ionicons name="chevron-up" size={20} color="#4f46e5" />
                </TouchableOpacity>
                <TouchableOpacity onPress={goToNextMatch} style={styles.navBtn}>
                  <Ionicons name="chevron-down" size={20} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            ) : searchQuery ? (
              <Text style={styles.noResults}>No results</Text>
            ) : null}
          </View>
        )}

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => !searchVisible && flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => !searchVisible && flatListRef.current?.scrollToEnd({ animated: false })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }), 300);
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Image source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }} style={styles.emptyAvatar} />
                <Text style={styles.emptyName}>{otherUser?.name}</Text>
                <Text style={styles.emptyHint}>Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {isTyping && (
          <View style={styles.typingRow}>
            <Image source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }} style={styles.typingAvatar} />
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.d1]} />
                <View style={[styles.dot, styles.d2]} />
                <View style={[styles.dot, styles.d3]} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
              <Ionicons name="attach" size={22} color="#94a3b8" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#9ca3af"
              value={newMessage}
              onChangeText={handleChangeText}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !newMessage.trim() && styles.sendOff]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerAvatarWrapper: { position: 'relative', marginRight: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#1e293b',
  },
  headerName: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', maxWidth: 180 },
  headerStatusTyping: { fontSize: 12, color: '#6ee7b7', fontStyle: 'italic', marginTop: 1 },
  headerStatusOnline: { fontSize: 12, color: '#22c55e', marginTop: 1 },
  headerStatusOffline: { fontSize: 11, color: '#475569', marginTop: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', paddingHorizontal: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#f1f5f9', marginHorizontal: 8 },
  searchNav: { flexDirection: 'row', alignItems: 'center' },
  searchCount: { fontSize: 13, color: '#94a3b8', marginRight: 4 },
  navBtn: { padding: 4 },
  noResults: { fontSize: 13, color: '#64748b', marginRight: 8 },

  list: { paddingHorizontal: 10, paddingVertical: 12 },

  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  rowSpaced: { marginBottom: 6 },

  avatarSlot: { width: 30, marginRight: 4, alignSelf: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ddd' },

  bubbleCol: { maxWidth: '75%', position: 'relative' },
  bubbleColLeft: { alignItems: 'flex-start' },
  bubbleColRight: { alignItems: 'flex-end' },

  matchCurrent: { backgroundColor: '#fbbf24', color: '#0f172a', borderRadius: 3 },
  matchOther: { backgroundColor: 'rgba(251, 191, 36, 0.35)', borderRadius: 3 },
  bubbleCurrentMatch: { borderWidth: 2, borderColor: '#fbbf24' },
  imgBubbleCurrentMatch: { borderWidth: 2, borderColor: '#fbbf24', borderRadius: 14 },

  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginBottom: 1 },
  bubbleMe: { backgroundColor: '#4338ca', borderTopRightRadius: 18, borderBottomRightRadius: 6 },
  bubbleOther: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 18, borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: '#334155',
  },
  tailTopRight: { borderTopRightRadius: 4 },
  tailTopLeft: { borderTopLeftRadius: 4 },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  textMe: { color: '#ffffff' },
  textOther: { color: '#f1f5f9' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 },
  metaRight: { justifyContent: 'flex-end', paddingRight: 4 },
  metaLeft: { justifyContent: 'flex-start', paddingLeft: 4 },
  timeText: { fontSize: 11, color: '#64748b' },

  imgBubble: { borderRadius: 14, overflow: 'hidden', marginBottom: 1 },
  imgBubbleMe: { borderBottomRightRadius: 4 },
  imgBubbleOther: { borderBottomLeftRadius: 4 },
  chatImage: { width: 210, height: 210 },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', paddingLeft: 12, paddingBottom: 8 },
  typingAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: 6 },
  typingBubble: {
    backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#334155',
  },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#64748b' },
  d1: { opacity: 0.35 },
  d2: { opacity: 0.65 },
  d3: { opacity: 1 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#1e293b', borderRadius: 24,
    paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginRight: 8, minHeight: 44, borderWidth: 1, borderColor: '#334155',
  },
  attachBtn: { padding: 6, alignSelf: 'flex-end' },
  input: {
    flex: 1, fontSize: 15, color: '#f1f5f9',
    maxHeight: 120, paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 0 : 6,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
  },
  sendOff: { backgroundColor: '#334155' },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12, backgroundColor: '#273549' },
  emptyName: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  emptyHint: { fontSize: 14, color: '#64748b' },
});
