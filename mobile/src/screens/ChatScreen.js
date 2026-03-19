import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';
import { getToken } from '../utils/secureStorage';

const SOCKET_URL = 'https://api.kampuscart.site';
const FALLBACK_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

const ChatScreen = ({ route, navigation }) => {
  const { chat, otherUser } = route.params;
  const { currentUser, userToken } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Set nav header with other user's name
  useEffect(() => {
    navigation.setOptions({
      title: otherUser?.name || 'Chat',
      headerRight: () => (
        <Image
          source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
          style={{ width: 34, height: 34, borderRadius: 17, marginRight: 8 }}
        />
      ),
    });
  }, [otherUser]);

  // Setup socket & fetch messages
  useEffect(() => {
    fetchMessages();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_chat', chat._id);
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const setupSocket = async () => {
    const token = await getToken();
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('setup', currentUser);
    });

    socket.on('connected', () => {
      socket.emit('join_chat', chat._id);
    });

    socket.on('message_received', (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
      // Mark as read
      API.put('/message/read', { chatId: chat._id }).catch(() => {});
    });

    socket.on('typing', () => setIsTyping(true));
    socket.on('stop_typing', () => setIsTyping(false));

    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', (err) => console.log('Socket error:', err.message));

    socketRef.current = socket;
  };

  const fetchMessages = async () => {
    try {
      const response = await API.get(`/message/${chat._id}`);
      setMessages(response.data);
      // Mark as read
      await API.put('/message/read', { chatId: chat._id });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    if (socketRef.current) {
      socketRef.current.emit('stop_typing', chat._id);
    }

    try {
      setSending(true);
      const response = await API.post('/message', {
        content: messageText,
        chatId: chat._id,
      });

      setMessages(prev => [...prev, response.data]);

      // Notify other users via socket
      if (socketRef.current) {
        socketRef.current.emit('new_message', response.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not send message. Check your connection.');
      setNewMessage(messageText); // Restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);

    if (!socketRef.current) return;

    socketRef.current.emit('typing', chat._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', chat._id);
    }, 2000);
  };

  const formatMessageTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender?._id === currentUser?._id || item.sender === currentUser?._id;
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.sender?._id !== item.sender?._id);
    const showTime = index === messages.length - 1 ||
      messages[index + 1]?.sender?._id !== item.sender?._id;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={styles.avatarSpace}>
            {showAvatar && (
              <Image
                source={{ uri: otherUser?.profilePic || FALLBACK_AVATAR }}
                style={styles.messageAvatar}
              />
            )}
          </View>
        )}

        <View style={{ maxWidth: '75%' }}>
          <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {item.content}
            </Text>
          </View>
          {showTime && (
            <Text style={[styles.messageTime, isMe ? { textAlign: 'right' } : { textAlign: 'left' }]}>
              {formatMessageTime(item.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || Math.random().toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesText}>
                  Say hello to {otherUser?.name?.split(' ')[0] || 'them'}! 👋
                </Text>
              </View>
            }
          />
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>●●●</Text>
            </View>
            <Text style={styles.typingText}>{otherUser?.name?.split(' ')[0]} is typing...</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8 },

  messageRow: {
    flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end',
  },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },

  avatarSpace: { width: 32, marginRight: 6 },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb' },

  messageBubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, marginBottom: 2,
  },
  bubbleMe: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMe: { color: '#ffffff' },
  messageTextOther: { color: '#1f2937' },
  messageTime: { fontSize: 11, color: '#9ca3af', marginHorizontal: 4, marginBottom: 6 },

  typingContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6,
  },
  typingBubble: {
    backgroundColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, marginRight: 8,
  },
  typingDots: { fontSize: 10, color: '#9ca3af', letterSpacing: 2 },
  typingText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: '#f3f4f6', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#1f2937', marginRight: 10,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: '#a5b4fc' },

  emptyMessages: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingTop: 80,
  },
  emptyMessagesText: { fontSize: 16, color: '#9ca3af' },
});

export default ChatScreen;
