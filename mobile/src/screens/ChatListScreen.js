import React, { useState, useContext, useCallback } from 'react';
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

const ChatListScreen = ({ navigation }) => {
  const { currentUser, isGuest, logout } = useContext(AuthContext);
  const { onlineUsers, connected } = useContext(SocketContext);
  // Log so we can see the state in the console
  React.useEffect(() => {
    console.log('[ChatList] connected:', connected, '| onlineUsers:', [...onlineUsers]);
  }, [connected, onlineUsers]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    try {
      const response = await API.get('/chat');
      const sorted = (response.data || []).sort((a, b) => {
        const aTime = new Date(a.latestMessage?.createdAt || a.updatedAt || a.createdAt);
        const bTime = new Date(b.latestMessage?.createdAt || b.updatedAt || b.createdAt);
        return bTime - aTime;
      });
      setChats(sorted);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!isGuest) fetchChats();
      else setLoading(false);
    }, [isGuest])
  );

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

  // Get the other user in a 1-on-1 chat
  const getOtherUser = (chat) => {
    if (!chat.users || !currentUser) return null;
    return chat.users.find(u => u._id !== currentUser._id) || chat.users[0];
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  };

  const renderChatItem = ({ item }) => {
    const otherUser = getOtherUser(item);
    const avatarUri = otherUser?.profilePic || FALLBACK_AVATAR;
    const lastMsg = item.latestMessage;
    const myId = String(currentUser?._id || currentUser?.id || '');
    const isUnread = lastMsg
      && String(lastMsg.sender?._id) !== myId
      && !(lastMsg.readBy || []).some(id => String(id) === myId);

    const otherUserId = otherUser?._id || otherUser?.id;
    const isUserOnline = otherUserId ? onlineUsers.has(String(otherUserId)) : false;
    console.log('[ChatList] item check → otherUserId:', otherUserId, '| onlineUsers:', [...onlineUsers], '| isOnline:', isUserOnline);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('ChatRoom', { chat: item, otherUser })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          {isUserOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatName, isUnread && styles.chatNameBold]} numberOfLines={1}>
              {otherUser?.name || 'KampusCart User'}
            </Text>
            <Text style={styles.chatTime}>{formatTime(lastMsg?.createdAt)}</Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text style={[styles.lastMessage, isUnread && styles.lastMessageBold]} numberOfLines={1}>
              {lastMsg
                ? (String(lastMsg.sender?._id || lastMsg.sender?.id) === String(currentUser?._id || currentUser?.id) ? 'You: ' : '') + lastMsg.content
                : 'Start a conversation...'}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
  },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#273549' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#0f172a',
  },
  onlineText: { color: '#22c55e', fontSize: 13, fontWeight: '500' },
  chatInfo: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '500', color: '#f1f5f9', flex: 1, marginRight: 8 },
  chatNameBold: { fontWeight: '700' },
  chatTime: { fontSize: 12, color: '#64748b' },
  chatBottomRow: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#64748b', flex: 1 },
  lastMessageBold: { color: '#94a3b8', fontWeight: '600' },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#818cf8', marginLeft: 8,
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
