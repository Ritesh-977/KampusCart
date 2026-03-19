import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Alert, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { getToken } from '../utils/secureStorage';

const SOCKET_URL = 'https://api.kampuscart.site';
const FALLBACK_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
const CLOUDINARY_PATTERN = /^https?:\/\//;

const ChatScreen = ({ route, navigation }) => {
  const { chat, otherUser } = route.params;
  const { currentUser } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalise sender ID to string for reliable comparison
  const myId = String(currentUser?._id || '');
  const isMe = useCallback((msg) => {
    const senderId = String(msg.sender?._id || msg.sender || '');
    return !!myId && myId === senderId;
  }, [myId]);

  // ── Header ──────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerStyle: { backgroundColor: '#ffffff', elevation: 0, shadowOpacity: 0 },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
          <Image
            source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
            style={{ width: 36, height: 36, borderRadius: 18, marginLeft: 8 }}
          />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <View style={{ marginLeft: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937' }} numberOfLines={1}>
            {otherUser?.name || 'Chat'}
          </Text>
          {isTyping ? (
            <Text style={{ fontSize: 12, color: '#4f46e5', fontStyle: 'italic' }}>typing...</Text>
          ) : isOnline ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981', marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: '#10b981', fontWeight: '600' }}>Online</Text>
            </View>
          ) : lastSeen ? (
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>last seen {formatLastSeen(lastSeen)}</Text>
          ) : null}
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={toggleSearch} style={{ marginRight: 14 }}>
          <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color="#374151" />
        </TouchableOpacity>
      ),
    });
  }, [otherUser, isOnline, isTyping, lastSeen, searchVisible]);

  // ── Socket setup ────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
    setupSocket();
    return () => {
      socketRef.current?.emit('leave_chat', chat._id);
      socketRef.current?.disconnect();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const setupSocket = async () => {
    const token = await getToken();
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      socket.emit('setup', currentUser);
    });

    socket.on('connected', () => {
      socket.emit('join_chat', chat._id);
      // Ask server about other user's online status
      socket.emit('check_online', otherUser?._id);
    });

    // New incoming message
    socket.on('message_received', (newMsg) => {
      const senderId = String(newMsg.sender?._id || newMsg.sender || '');
      // Only add if it's for this chat and not from me (already added optimistically)
      if (senderId !== myId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        API.put('/message/read', { chatId: chat._id }).catch(() => {});
      }
    });

    // Online status events
    socket.on('user_online', (userId) => {
      if (String(userId) === String(otherUser?._id)) {
        setIsOnline(true);
        setLastSeen(null);
      }
    });
    socket.on('user_offline', ({ userId, lastSeen: ls }) => {
      if (String(userId) === String(otherUser?._id)) {
        setIsOnline(false);
        setLastSeen(ls || new Date().toISOString());
      }
    });
    socket.on('online_status', ({ userId, online, lastSeen: ls }) => {
      if (String(userId) === String(otherUser?._id)) {
        setIsOnline(online);
        if (!online && ls) setLastSeen(ls);
      }
    });

    socket.on('typing', (chatId) => {
      if (chatId === chat._id) setIsTyping(true);
    });
    socket.on('stop_typing', (chatId) => {
      if (chatId === chat._id) setIsTyping(false);
    });

    socket.on('connect_error', (err) => console.log('Socket error:', err.message));

    socketRef.current = socket;
  };

  // ── Fetch messages ───────────────────────────────────────────────────
  const fetchMessages = async () => {
    try {
      const response = await API.get(`/message/${chat._id}`);
      setMessages(response.data);
      await API.put('/message/read', { chatId: chat._id });
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Send text message ────────────────────────────────────────────────
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');
    socketRef.current?.emit('stop_typing', chat._id);

    // Optimistic message
    const optimistic = {
      _id: `temp_${Date.now()}`,
      content: text,
      sender: { _id: myId, name: currentUser?.name },
      chat: chat._id,
      createdAt: new Date().toISOString(),
      sending: true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const response = await API.post('/message', { content: text, chatId: chat._id });
      // Replace optimistic with real message
      setMessages(prev =>
        prev.map(m => m._id === optimistic._id ? response.data : m)
      );
      socketRef.current?.emit('new_message', response.data);
    } catch {
      // Mark optimistic as failed
      setMessages(prev =>
        prev.map(m => m._id === optimistic._id ? { ...m, failed: true, sending: false } : m)
      );
      Alert.alert('Send Failed', 'Tap the message to retry.');
    }
  };

  // ── Send image ───────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow access to photos to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const optimistic = {
      _id: `temp_img_${Date.now()}`,
      content: uri,           // local URI shown while uploading
      isImage: true,
      sender: { _id: myId },
      chat: chat._id,
      createdAt: new Date().toISOString(),
      sending: true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const formData = new FormData();
      formData.append('image', { uri, name: filename, type });
      const uploadRes = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = uploadRes.data?.url || uploadRes.data?.secure_url;

      const msgRes = await API.post('/message', {
        content: imageUrl,
        chatId: chat._id,
      });

      setMessages(prev =>
        prev.map(m => m._id === optimistic._id ? { ...msgRes.data, isImage: true } : m)
      );
      socketRef.current?.emit('new_message', { ...msgRes.data, isImage: true });
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      Alert.alert('Upload Failed', 'Could not send image.');
    }
  };

  // ── Typing ───────────────────────────────────────────────────────────
  const handleTyping = (text) => {
    setNewMessage(text);
    if (!socketRef.current) return;
    socketRef.current.emit('typing', chat._id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', chat._id);
    }, 2000);
  };

  // ── Search ───────────────────────────────────────────────────────────
  const toggleSearch = () => {
    setSearchVisible(v => {
      if (v) setSearchQuery('');
      return !v;
    });
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const displayMessages = searchQuery
    ? messages.filter(m =>
        typeof m.content === 'string' &&
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

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

  const isImageContent = (content) =>
    typeof content === 'string' && CLOUDINARY_PATTERN.test(content) &&
    /\.(jpg|jpeg|png|gif|webp)/i.test(content);

  // ── Render message ───────────────────────────────────────────────────
  const renderMessage = ({ item, index }) => {
    const mine = isMe(item);
    const prevMsg = displayMessages[index - 1];
    const nextMsg = displayMessages[index + 1];
    const sameSenderPrev = prevMsg && String(prevMsg.sender?._id || prevMsg.sender) === String(item.sender?._id || item.sender);
    const sameSenderNext = nextMsg && String(nextMsg.sender?._id || nextMsg.sender) === String(item.sender?._id || item.sender);
    const showAvatar = !mine && !sameSenderNext;
    const showTime = !sameSenderNext;
    const isImg = item.isImage || isImageContent(item.content);

    return (
      <View style={[styles.messageRow, mine ? styles.rowMe : styles.rowOther]}>
        {/* Avatar placeholder for alignment */}
        {!mine && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <Image source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }} style={styles.msgAvatar} />
            ) : null}
          </View>
        )}

        <View style={[styles.bubbleWrapper, mine ? styles.bubbleWrapperMe : styles.bubbleWrapperOther]}>
          {isImg ? (
            <View style={[styles.imageBubble, mine ? styles.imageBubbleMe : styles.imageBubbleOther]}>
              <Image source={{ uri: item.content }} style={styles.chatImage} resizeMode="cover" />
              {item.sending && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleOther,
              !sameSenderPrev && (mine ? styles.bubbleTopMe : styles.bubbleTopOther),
              !sameSenderNext && (mine ? styles.bubbleBottomMe : styles.bubbleBottomOther),
            ]}>
              <Text style={[styles.bubbleText, mine ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                {item.content}
              </Text>
              {item.sending && !item.failed && (
                <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.6)" style={{ alignSelf: 'flex-end', marginTop: 2 }} />
              )}
              {item.failed && (
                <Ionicons name="alert-circle" size={10} color="#fca5a5" style={{ alignSelf: 'flex-end', marginTop: 2 }} />
              )}
            </View>
          )}

          {showTime && (
            <Text style={[styles.msgTime, mine ? styles.msgTimeMe : styles.msgTimeOther]}>
              {formatTime(item.createdAt)}
              {mine && !item.sending && !item.failed && (
                <Text> ✓</Text>
              )}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Search bar */}
        {searchVisible && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Messages list */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => !searchQuery && flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => !searchQuery && flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                {searchQuery ? (
                  <Text style={styles.emptyText}>No messages match "{searchQuery}"</Text>
                ) : (
                  <>
                    <Image source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }} style={styles.emptyAvatar} />
                    <Text style={styles.emptyName}>{otherUser?.name}</Text>
                    <Text style={styles.emptyText}>Say hello! 👋</Text>
                  </>
                )}
              </View>
            }
          />
        )}

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingRow}>
            <Image source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }} style={styles.typingAvatar} />
            <View style={styles.typingBubble}>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
            <Ionicons name="attach" size={22} color="#6b7280" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Message..."
            placeholderTextColor="#9ca3af"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },

  // Messages
  list: { paddingHorizontal: 12, paddingVertical: 10 },

  messageRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginBottom: 2,
  },
  rowMe: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },

  avatarSlot: { width: 30, marginRight: 6, alignSelf: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb' },

  bubbleWrapper: { maxWidth: '75%' },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperOther: { alignItems: 'flex-start' },

  bubble: {
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 18, marginBottom: 1,
  },
  bubbleMe: { backgroundColor: '#4f46e5' },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  // Tail shaping
  bubbleTopMe: { borderTopRightRadius: 4 },
  bubbleBottomMe: { borderBottomRightRadius: 4 },
  bubbleTopOther: { borderTopLeftRadius: 4 },
  bubbleBottomOther: { borderBottomLeftRadius: 4 },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: '#ffffff' },
  bubbleTextOther: { color: '#1f2937' },

  // Image messages
  imageBubble: { borderRadius: 14, overflow: 'hidden', marginBottom: 1 },
  imageBubbleMe: { borderBottomRightRadius: 4 },
  imageBubbleOther: { borderBottomLeftRadius: 4 },
  chatImage: { width: 200, height: 200 },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },

  msgTime: { fontSize: 10, color: '#9ca3af', marginTop: 2, marginBottom: 4, paddingHorizontal: 4 },
  msgTimeMe: { textAlign: 'right', color: '#9ca3af' },
  msgTimeOther: { textAlign: 'left' },

  // Typing indicator
  typingRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingLeft: 12, paddingBottom: 6,
  },
  typingAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: 6 },
  typingBubble: {
    backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#9ca3af',
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  attachBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 6,
  },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: '#f3f4f6', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 15, color: '#1f2937',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sendBtnOff: { backgroundColor: '#a5b4fc' },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12, backgroundColor: '#e5e7eb' },
  emptyName: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});

export default ChatScreen;
