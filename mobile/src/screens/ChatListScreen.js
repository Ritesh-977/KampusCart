import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Image, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import API from '../api/axios';

const FALLBACK_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

const sortByLatest = (arr) =>
  [...arr].sort((a, b) => {
    const aTime = new Date(a.latestMessage?.createdAt || a.updatedAt || a.createdAt);
    const bTime = new Date(b.latestMessage?.createdAt || b.updatedAt || b.createdAt);
    return bTime - aTime;
  });

const ChatListScreen = ({ navigation, route }) => {
  const { currentUser, isGuest, logout } = useContext(AuthContext);
  const { socketRef, onlineUsers, connected } = useContext(SocketContext);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const myId = String(currentUser?._id || currentUser?.id || '');

  // Navigate straight to ChatRoom when arriving from ItemDetailsScreen
  useEffect(() => {
    const pending = route.params?.pendingChat;
    if (pending) {
      navigation.setParams({ pendingChat: null });
      navigation.navigate('ChatRoom', pending);
    }
  }, [route.params?.pendingChat]);

  const fetchChats = async () => {
    try {
      const response = await API.get('/chat');
      setChats(sortByLatest(response.data || []));
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on screen focus (handles coming back from ChatScreen with read status updated)
  useFocusEffect(
    useCallback(() => {
      if (!isGuest) fetchChats();
      else setLoading(false);
    }, [isGuest])
  );

  // Real-time: update chat list when a new message arrives
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected) return;

    const handleNewMessage = (msg) => {
      const incomingChatId = String(msg.chat?._id || msg.chat || '');
      if (!incomingChatId) return;
      setChats((prev) => {
        const idx = prev.findIndex((c) => String(c._id) === incomingChatId);
        if (idx === -1) {
          // Chat not in list yet — refetch to get full chat object
          fetchChats();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], latestMessage: msg };
        return sortByLatest(updated);
      });
    };

    socket.on('message received', handleNewMessage);
    return () => socket.off('message received', handleNewMessage);
  }, [connected]);

  if (isGuest) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons name="chatbubbles-outline" size={70} color="#334155" />
        <Text style={styles.guestTitle}>Login to Chat</Text>
        <Text style={styles.guestSubtitle}>
          Sign in to message sellers and buy items from your campus.
        </Text>
        <TouchableOpacity style={styles.guestBtn} onPress={logout}>
          <Text style={styles.guestBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getOtherUser = (chat) => {
    if (!chat.users || !currentUser) return null;
    return chat.users.find((u) => String(u._id || u.id) !== myId) || chat.users[0];
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderChatItem = ({ item }) => {
    const otherUser = getOtherUser(item);
    const avatarUri = otherUser?.profilePic || FALLBACK_AVATAR;
    const lastMsg = item.latestMessage;

    const isUnread = lastMsg
      && String(lastMsg.sender?._id || lastMsg.sender?.id) !== myId
      && !(lastMsg.readBy || []).some((id) => String(id) === myId);

    const otherUserId = String(otherUser?._id || otherUser?.id || '');
    const isUserOnline = otherUserId ? onlineUsers.has(otherUserId) : false;

    const isMine = lastMsg && String(lastMsg.sender?._id || lastMsg.sender?.id) === myId;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isUnread && styles.chatItemUnread]}
        onPress={() => navigation.navigate('ChatRoom', { chat: item, otherUser })}
        activeOpacity={0.7}
      >
        {/* Unread accent bar */}
        {isUnread && <View style={styles.unreadBar} />}

        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {isUserOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, isUnread && styles.chatNameUnread]} numberOfLines={1}>
              {otherUser?.name || 'KampusCart User'}
            </Text>
            <Text style={[styles.chatTime, isUnread && styles.chatTimeUnread]}>
              {formatTime(lastMsg?.createdAt)}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            {!isUnread && isMine && (
              <Ionicons name="checkmark-done-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.lastMessage, isUnread && styles.lastMessageUnread]} numberOfLines={1}>
              {lastMsg
                ? (isMine ? 'You: ' : '') + lastMsg.content
                : 'Start a conversation...'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <View style={styles.unreadDot} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Ionicons name="chatbubbles" size={24} color="#4f46e5" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          contentContainerStyle={chats.length === 0 ? styles.emptyContent : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={70} color="#334155" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Browse items and tap "Chat with Seller" to start a conversation.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 14,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#334155',
    backgroundColor: '#0f172a',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  chatItemUnread: {
    backgroundColor: '#131f2e',
  },
  unreadBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: '#6366f1', borderRadius: 2,
  },

  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#273549' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#0f172a',
  },

  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },

  chatName: { fontSize: 16, fontWeight: '500', color: '#94a3b8', flex: 1, marginRight: 8 },
  chatNameUnread: { color: '#f1f5f9', fontWeight: '700' },

  chatTime: { fontSize: 12, color: '#475569' },
  chatTimeUnread: { color: '#6366f1', fontWeight: '600' },

  chatBottomRow: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#475569', flex: 1 },
  lastMessageUnread: { color: '#94a3b8', fontWeight: '600' },

  unreadBadge: { marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#6366f1',
  },

  emptyContent: { flex: 1 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, paddingTop: 80,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },

  guestContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 24, backgroundColor: '#0f172a',
  },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginTop: 16, marginBottom: 8 },
  guestSubtitle: { textAlign: 'center', color: '#94a3b8', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  guestBtn: {
    backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 12, width: '100%', alignItems: 'center',
  },
  guestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default ChatListScreen;
