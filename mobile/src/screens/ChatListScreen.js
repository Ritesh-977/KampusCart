import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Image, Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import API from '../api/axios';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const myId = String(currentUser?._id || currentUser?.id || '');

  const memoStyles = useMemo(() => ({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 14,
      paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.inputBorder,
      backgroundColor: theme.background,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: theme.textMain },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    chatItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.card,
      backgroundColor: theme.background,
      position: 'relative',
    },
    chatItemUnread: {
      backgroundColor: theme.card,
    },
    unreadBar: {
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: 3, backgroundColor: theme.primaryAccent, borderRadius: 2,
    },
    avatarWrapper: { position: 'relative', marginRight: 14 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.inputBg },
    onlineDot: {
      position: 'absolute', bottom: 1, right: 1,
      width: 13, height: 13, borderRadius: 7,
      backgroundColor: '#22c55e', borderWidth: 2, borderColor: theme.background,
    },
    chatInfo: { flex: 1 },
    chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: '500', color: theme.textBody, flex: 1, marginRight: 8 },
    chatNameUnread: { color: theme.textMain, fontWeight: '700' },
    chatTime: { fontSize: 12, color: theme.textTertiary },
    chatTimeUnread: { color: theme.primaryAccent, fontWeight: '600' },
    chatBottomRow: { flexDirection: 'row', alignItems: 'center' },
    lastMessage: { fontSize: 14, color: theme.textTertiary, flex: 1 },
    lastMessageUnread: { color: theme.textBody, fontWeight: '600' },
    unreadBadge: { marginLeft: 8, justifyContent: 'center', alignItems: 'center' },
    unreadDot: {
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: theme.primaryAccent,
    },
    emptyContent: { flex: 1 },
    emptyContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 32, paddingTop: 80,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.textMain, marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: theme.textBody, textAlign: 'center', lineHeight: 22 },
    guestContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      padding: 24, backgroundColor: theme.background,
    },
    guestTitle: { fontSize: 22, fontWeight: '800', color: theme.textMain, marginTop: 16, marginBottom: 8 },
    guestSubtitle: { textAlign: 'center', color: theme.textSub, fontSize: 15, lineHeight: 22, marginBottom: 24 },
    guestBtn: {
      backgroundColor: theme.primaryAction, paddingVertical: 14, paddingHorizontal: 40,
      borderRadius: 12, width: '100%', alignItems: 'center',
    },
    guestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.inputBg, borderRadius: 12,
      borderWidth: 1, borderColor: theme.inputBorder,
      marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: theme.textMain, marginLeft: 8 },
  }), [theme]);

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
      <View style={memoStyles.guestContainer}>
        <Ionicons name="chatbubbles-outline" size={70} color={theme.cardAccent} />
        <Text style={memoStyles.guestTitle}>Login to Chat</Text>
        <Text style={memoStyles.guestSubtitle}>
          Sign in to message sellers and buy items from your campus.
        </Text>
        <TouchableOpacity style={memoStyles.guestBtn} onPress={logout}>
          <Text style={memoStyles.guestBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getOtherUser = (chat) => {
    if (!chat.users || !currentUser) return null;
    return chat.users.find((u) => String(u._id || u.id) !== myId) || chat.users[0];
  };

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(chat => {
      const other = getOtherUser(chat);
      return (other?.name || '').toLowerCase().includes(q);
    });
  }, [chats, searchQuery]);

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
        style={[memoStyles.chatItem, isUnread && memoStyles.chatItemUnread]}
        onPress={() => navigation.navigate('ChatRoom', { chat: item, otherUser })}
        activeOpacity={0.7}
      >
        {/* Unread accent bar */}
        {isUnread && <View style={memoStyles.unreadBar} />}

        <View style={memoStyles.avatarWrapper}>
          <Image source={{ uri: avatarUri }} style={memoStyles.avatar} />
          {isUserOnline && <View style={memoStyles.onlineDot} />}
        </View>

        <View style={memoStyles.chatInfo}>
          <View style={memoStyles.chatTopRow}>
            <Text style={[memoStyles.chatName, isUnread && memoStyles.chatNameUnread]} numberOfLines={1}>
              {otherUser?.name || 'KampusCart User'}
            </Text>
            <Text style={[memoStyles.chatTime, isUnread && memoStyles.chatTimeUnread]}>
              {formatTime(lastMsg?.createdAt)}
            </Text>
          </View>
          <View style={memoStyles.chatBottomRow}>
            {!isUnread && isMine && (
              <Ionicons name="checkmark-done-outline" size={14} color={theme.textTertiary} style={{ marginRight: 4 }} />
            )}
            <Text style={[memoStyles.lastMessage, isUnread && memoStyles.lastMessageUnread]} numberOfLines={1}>
              {lastMsg
                ? (isMine ? 'You: ' : '') + (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(lastMsg.content) ? '📷 Photo' : lastMsg.content)
                : 'Start a conversation...'}
            </Text>
            {isUnread && (
              <View style={memoStyles.unreadBadge}>
                <View style={memoStyles.unreadDot} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={memoStyles.container}>
      <View style={memoStyles.header}>
        <Text style={memoStyles.headerTitle}>Messages</Text>
        <Ionicons name="chatbubbles" size={24} color={theme.primaryAccent} />
      </View>

      <View style={memoStyles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.textTertiary} />
        <TextInput
          style={memoStyles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={memoStyles.center}>
          <ActivityIndicator size="large" color={theme.primaryAccent} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item._id}
          renderItem={renderChatItem}
          contentContainerStyle={filteredChats.length === 0 ? memoStyles.emptyContent : null}
          ListEmptyComponent={
            <View style={memoStyles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={70} color={theme.cardAccent} />
              <Text style={memoStyles.emptyTitle}>
                {searchQuery.trim() ? 'No results found' : 'No messages yet'}
              </Text>
              <Text style={memoStyles.emptySubtitle}>
                {searchQuery.trim()
                  ? `No conversations match "${searchQuery.trim()}"`
                  : 'Browse items and tap "Chat with Seller" to start a conversation.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ChatListScreen;
