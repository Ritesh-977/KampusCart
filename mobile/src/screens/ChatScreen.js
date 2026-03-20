import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Alert, StatusBar, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // <-- Added useSafeAreaInsets
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { getToken } from '../utils/secureStorage';

const SOCKET_URL = 'https://api.kampuscart.site';
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

const formatLastSeen = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ─── component ──────────────────────────────────────────────────────────────
export default function ChatScreen({ route, navigation }) {
  const { chat, otherUser } = route.params;
  const { currentUser } = useContext(AuthContext);

  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets(); // <-- Get safe area insets

  // Compute my ID once; try every possible key the backend might use
  const myId = useMemo(
    () =>
      normalizeId(currentUser?._id) ||
      normalizeId(currentUser?.id) ||
      '',
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

  // ── state ──
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndices, setMatchIndices] = useState([]); // indices in `messages`
  const [currentMatch, setCurrentMatch] = useState(0);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ── keyboard listener (Android edge-to-edge) ───────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // refs
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const searchRef = useRef(null);

  // ── header ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: { backgroundColor: '#0f172a' },
      headerTintColor: '#fff',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <Image
            source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
            style={styles.headerAvatar}
          />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <TouchableOpacity activeOpacity={0.8}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser?.name || 'Chat'}
          </Text>
          {isTyping ? (
            <Text style={styles.headerStatusTyping}>typing…</Text>
          ) : isOnline ? (
            <Text style={styles.headerStatusOnline}>online</Text>
          ) : lastSeen ? (
            <Text style={styles.headerStatusOffline}>last seen {formatLastSeen(lastSeen)}</Text>
          ) : null}
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={openSearch}
          style={{ marginRight: 12 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [otherUser, isOnline, isTyping, lastSeen, searchVisible]);

  // ── socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
    initSocket();
    return () => {
      socketRef.current?.emit('leave_chat', chat._id);
      socketRef.current?.disconnect();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const initSocket = async () => {
    const token = await getToken();
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: true,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      socket.emit('setup', currentUser);
    });

    socket.on('connected', () => {
      socket.emit('join_chat', chat._id);
      socket.emit('check_online', otherUser?._id);
    });

    socket.on('message_received', (msg) => {
      const senderId = normalizeId(msg?.sender?._id) || normalizeId(msg?.sender);
      if (senderId === myId) return; // already added optimistically
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      API.put('/message/read', { chatId: chat._id }).catch(() => {});
    });

    socket.on('typing', (chatId) => {
      if (chatId === chat._id) setIsTyping(true);
    });
    socket.on('stop_typing', (chatId) => {
      if (chatId === chat._id) setIsTyping(false);
    });

    socket.on('user_online', (userId) => {
      if (normalizeId(userId) === normalizeId(otherUser?._id)) {
        setIsOnline(true);
        setLastSeen(null);
      }
    });
    socket.on('user_offline', ({ userId, lastSeen: ls }) => {
      if (normalizeId(userId) === normalizeId(otherUser?._id)) {
        setIsOnline(false);
        if (ls) setLastSeen(ls);
      }
    });
    socket.on('online_status', ({ userId, online, lastSeen: ls }) => {
      if (normalizeId(userId) === normalizeId(otherUser?._id)) {
        setIsOnline(online);
        if (!online && ls) setLastSeen(ls);
      }
    });

    socket.on('connect_error', (e) => console.warn('socket error:', e.message));
    socketRef.current = socket;
  };

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
    socketRef.current?.emit('stop_typing', chat._id);

    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      _id: tempId,
      content: text,
      sender: { _id: myId, name: currentUser?.name },
      chat: chat._id,
      createdAt: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await API.post('/message', { content: text, chatId: chat._id });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data : m)));
      socketRef.current?.emit('new_message', res.data);
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
    setMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        content: uri,
        isImage: true,
        sender: { _id: myId },
        chat: chat._id,
        createdAt: new Date().toISOString(),
        _pending: true,
      },
    ]);

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
      socketRef.current?.emit('new_message', { ...res.data, isImage: true });
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
      socketRef.current?.emit('stop_typing', chat._id);
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
    if (!q.trim()) {
      setMatchIndices([]);
      setCurrentMatch(0);
      return;
    }
    const lower = q.toLowerCase();
    const indices = messages.reduce((acc, msg, i) => {
      if (typeof msg.content === 'string' && msg.content.toLowerCase().includes(lower)) {
        acc.push(i);
      }
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

  // ── render message ─────────────────────────────────────────────────────────
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

      // Search highlight
      const isHighlighted = searchQuery && matchIndices.includes(index);
      const isCurrentMatch = isHighlighted && matchIndices[currentMatch] === index;

      return (
        <View
          style={[
            styles.row,
            mine ? styles.rowRight : styles.rowLeft,
            !groupedWithNext && styles.rowSpaced,
          ]}
        >
          {/* Avatar slot (left side only) */}
          {!mine && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <Image
                  source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
                  style={styles.msgAvatar}
                />
              )}
            </View>
          )}

          <View style={[styles.bubbleCol, mine ? styles.bubbleColRight : styles.bubbleColLeft]}>
            {/* Highlight wrapper */}
            {isCurrentMatch && <View style={styles.currentMatchHighlight} />}
            {isHighlighted && !isCurrentMatch && <View style={styles.matchHighlight} />}

            {isImg ? (
              <View style={[styles.imgBubble, mine ? styles.imgBubbleMe : styles.imgBubbleOther]}>
                <Image source={{ uri: item.content }} style={styles.chatImage} resizeMode="cover" />
                {item._pending && (
                  <View style={styles.imgOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMe : styles.bubbleOther,
                  // tail shaping
                  mine
                    ? prevSender !== thisSender
                      ? styles.tailTopRight
                      : null
                    : prevSender !== thisSender
                    ? styles.tailTopLeft
                    : null,
                ]}
              >
                <Text style={[styles.bubbleText, mine ? styles.textMe : styles.textOther]}>
                  {item.content}
                </Text>
              </View>
            )}

            {/* Time + status */}
            {showTime && (
              <View style={[styles.metaRow, mine ? styles.metaRight : styles.metaLeft]}>
                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                {mine && (
                  <Ionicons
                    name={item._pending ? 'time-outline' : item._failed ? 'alert-circle-outline' : 'checkmark-done-outline'}
                    size={13}
                    color={item._failed ? '#ef4444' : '#9ca3af'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      );
    },
    [checkIsMe, messages, searchQuery, matchIndices, currentMatch, otherUser]
  );

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" />
      
      <KeyboardAvoidingView
        style={[styles.flex, Platform.OS === 'android' && { marginBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* ── Search bar ─────────────────────────────────────────────── */}
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
                <Text style={styles.searchCount}>
                  {currentMatch + 1}/{matchIndices.length}
                </Text>
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

        {/* ── Messages ───────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              !searchVisible && flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              !searchVisible && flatListRef.current?.scrollToEnd({ animated: false })
            }
            onScrollToIndexFailed={(info) => {
              // Fallback if index is not yet measured
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
              }, 300);
            }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Image
                  source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
                  style={styles.emptyAvatar}
                />
                <Text style={styles.emptyName}>{otherUser?.name}</Text>
                <Text style={styles.emptyHint}>Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {/* ── Typing indicator ───────────────────────────────────────── */}
        {isTyping && (
          <View style={styles.typingRow}>
            <Image
              source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
              style={styles.typingAvatar}
            />
            <View style={styles.typingBubble}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.d1]} />
                <View style={[styles.dot, styles.d2]} />
                <View style={[styles.dot, styles.d3]} />
              </View>
            </View>
          </View>
        )}

        {/* ── Input bar ──────────────────────────────────────────────── */}
        {/* We add dynamic paddingBottom so it sits above the Android swipe gesture bar */}
        <View style={[styles.inputRow, { paddingBottom: Platform.OS === 'android' ? (keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 6)) : Math.max(insets.bottom, 6) }]}>
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

  // Header
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerStatusTyping: { fontSize: 12, color: '#a7f3d0', fontStyle: 'italic' },
  headerStatusOnline: { fontSize: 12, color: '#a7f3d0' },
  headerStatusOffline: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  // Search bar
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

  // List
  list: { paddingHorizontal: 10, paddingVertical: 12 },

  // Message row
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  rowSpaced: { marginBottom: 6 },

  avatarSlot: { width: 30, marginRight: 4, alignSelf: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ddd' },

  bubbleCol: { maxWidth: '75%', position: 'relative' },
  bubbleColLeft: { alignItems: 'flex-start' },
  bubbleColRight: { alignItems: 'flex-end' },

  // Search highlights (absolutely behind bubble)
  currentMatchHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 214, 0, 0.45)',
    borderRadius: 14,
    zIndex: -1,
  },
  matchHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 214, 0, 0.2)',
    borderRadius: 14,
    zIndex: -1,
  },

  // Text bubble
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 1,
  },
  bubbleMe: {
    backgroundColor: '#4338ca',
    borderTopRightRadius: 18,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  // Pointed tail at the top of a new sender group
  tailTopRight: { borderTopRightRadius: 4 },
  tailTopLeft: { borderTopLeftRadius: 4 },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  textMe: { color: '#ffffff' },
  textOther: { color: '#f1f5f9' },

  // Time + tick
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 },
  metaRight: { justifyContent: 'flex-end', paddingRight: 4 },
  metaLeft: { justifyContent: 'flex-start', paddingLeft: 4 },
  timeText: { fontSize: 11, color: '#64748b' },

  // Image bubble
  imgBubble: { borderRadius: 14, overflow: 'hidden', marginBottom: 1 },
  imgBubbleMe: { borderBottomRightRadius: 4 },
  imgBubbleOther: { borderBottomLeftRadius: 4 },
  chatImage: { width: 210, height: 210 },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Typing
  typingRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingLeft: 12, paddingBottom: 8,
  },
  typingAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: 6 },
  typingBubble: {
    backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#334155',
  },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#64748b' },
  d1: { opacity: 0.35 },
  d2: { opacity: 0.65 },
  d3: { opacity: 1 },

  // Input bar
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingTop: 6, // Changed top padding slightly
    backgroundColor: '#0f172a',
    borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#1e293b', borderRadius: 24,
    paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginRight: 8, minHeight: 44,
    borderWidth: 1, borderColor: '#334155',
  },
  attachBtn: { padding: 6, alignSelf: 'flex-end' },
  input: {
    flex: 1, fontSize: 15, color: '#f1f5f9',
    maxHeight: 120, paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 0 : 6,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4f46e5',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
  },
  sendOff: { backgroundColor: '#334155' },

  // Empty state
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12, backgroundColor: '#273549' },
  emptyName: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  emptyHint: { fontSize: 14, color: '#64748b' },
});