import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TAB_BAR_STYLE } from '../navigation/MainTabNavigator';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Image, Alert, StatusBar,
  Animated, Keyboard, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import API from '../api/axios';
import { useThemeStyles } from '../hooks/useThemeStyles';

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
  const { styles, colors } = useThemeStyles(createStyles);

  const { chat, otherUser } = route.params;
  const { currentUser } = useContext(AuthContext);
  const { socketRef, connected, onlineUsers } = useContext(SocketContext);
  const kbOffset = useRef(new Animated.Value(0)).current;

  // Hide the bottom tab bar while this screen is focused
  useFocusEffect(
    useCallback(() => {
      const tabNav = navigation.getParent();
      tabNav?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => tabNav?.setOptions({ tabBarStyle: TAB_BAR_STYLE });
    }, [navigation])
  );

  useEffect(() => {
    const setOffset = (e) => {
      Animated.timing(kbOffset, { 
        toValue: e.endCoordinates.height, 
        duration: e.duration || 150, 
        useNativeDriver: false 
      }).start();
    };

    const resetOffset = (e) => {
      Animated.timing(kbOffset, { 
        toValue: 0, 
        duration: e?.duration || 150, 
        useNativeDriver: false 
      }).start();
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, setOffset);
    const onHide = Keyboard.addListener(hideEvent, resetOffset);
    
    let onChange;
    if (Platform.OS === 'ios') {
      onChange = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
        if (e.endCoordinates.height > 0) setOffset(e);
      });
    }

    return () => { 
      onShow.remove(); 
      onHide.remove(); 
      if (onChange) onChange.remove(); 
    };
  }, []);

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

  const isOnline = useMemo(
    () => (otherUser?._id ? onlineUsers.has(String(otherUser._id)) : false),
    [onlineUsers, otherUser]
  );

  // ── state ──
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndices, setMatchIndices] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(0);

  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  const [viewingImage, setViewingImage] = useState(null);

  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const searchRef = useRef(null);

  // ── header ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      contentStyle: { backgroundColor: colors.background }, 
      cardStyle: { backgroundColor: colors.background },    
      headerStyle: {
        backgroundColor: colors.header,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        borderBottomWidth: 1,
        borderBottomColor: colors.headerDivider,
      },
      headerTintColor: colors.textMain,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingLeft: 4, paddingRight: 2 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
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
          <Ionicons name="search-outline" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      ),
    });
  }, [isOnline, isTyping, searchVisible, colors]); 

  // ── fetch messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();
  }, []);

  // ── socket room + listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected) return;

    socket.emit('join chat', chat._id);

    const handleMessage = (msg) => {
      const msgChatId = normalizeId(msg?.chat?._id) || normalizeId(msg?.chat);
      if (msgChatId && msgChatId !== chat._id) return;
      const senderId = normalizeId(msg?.sender?._id) || normalizeId(msg?.sender);
      if (myId && senderId === myId) return;
      
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        // 👇 Inverted list: new messages go at the front
        return [msg, ...prev]; 
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
      // 👇 Inverted list: reverse the data so newest is index 0
      setMessages((res.data || []).reverse());
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
    
    // 👇 Inverted list: temporary message goes at the front
    setMessages((prev) => [{
      _id: tempId,
      content: text,
      sender: { _id: myId, name: currentUser?.name },
      chat: { _id: chat._id, users: chat.users },
      createdAt: new Date().toISOString(),
      _pending: true,
    }, ...prev]);

    try {
      const res = await API.post('/message', { content: text, chatId: chat._id });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? res.data : m)));
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
      mediaTypes: ['images'],
      quality: 0.75,
    });
    if (result.canceled) return;

    const { uri } = result.assets[0];
    const filename = uri.split('/').pop();
    const ext = /\.(\w+)$/.exec(filename);
    const type = ext ? `image/${ext[1]}` : 'image/jpeg';

    const tempId = `tmp_img_${Date.now()}`;
    
    // 👇 Inverted list: temporary image goes at the front
    setMessages((prev) => [{
      _id: tempId,
      content: uri,
      isImage: true,
      sender: { _id: myId },
      chat: { _id: chat._id, users: chat.users },
      createdAt: new Date().toISOString(),
      _pending: true,
    }, ...prev]);

    try {
      const form = new FormData();
      form.append('image', { uri, name: filename, type });
      const up = await API.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imageUrl = up.data?.filePath || up.data?.url || up.data?.secure_url;
      if (!imageUrl) throw new Error('No image URL returned from upload');
      const res = await API.post('/message', { content: imageUrl, chatId: chat._id });
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...res.data, isImage: true } : m))
      );
      socketRef.current?.emit('new message', { ...res.data, isImage: true });
    } catch (err) {
      console.error('Image upload error:', err?.response?.data || err.message);
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
    // Because list is inverted, "Prev" match means going deeper into the array
    const next = (currentMatch + 1) % matchIndices.length;
    setCurrentMatch(next);
    scrollToMatch(matchIndices[next]);
  };

  const goToNextMatch = () => {
    if (!matchIndices.length) return;
    // "Next" match means coming closer to index 0
    const next = (currentMatch - 1 + matchIndices.length) % matchIndices.length;
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
    [searchQuery, styles]
  );

  // ── render message ─────────────────────────────────────────────────────────
  const otherUserId = useMemo(
    () => String(otherUser?._id || otherUser?.id || ''),
    [otherUser]
  );

  const renderMessage = useCallback(
    ({ item, index }) => {
      const mine = checkIsMe(item);
      
      // 👇 Swapped +1 and -1 because the array is inverted!
      // Index 0 is newest. So index + 1 is the OLDER message sent before this one.
      const prevSender = normalizeId(messages[index + 1]?.sender?._id) || normalizeId(messages[index + 1]?.sender);
      const nextSender = normalizeId(messages[index - 1]?.sender?._id) || normalizeId(messages[index - 1]?.sender);
      
      const thisSender = normalizeId(item.sender?._id) || normalizeId(item.sender);
      const groupedWithNext = thisSender === nextSender;
      const showTime = !groupedWithNext;
      const showAvatar = !mine && !groupedWithNext;
      const isImg = item.isImage || isImageUrl(item.content);
      const isHighlighted = searchQuery && matchIndices.includes(index);
      const isCurrentMatch = isHighlighted && matchIndices[currentMatch] === index;

      // Read receipt
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
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => !item._pending && setViewingImage(item.content)}
                style={[styles.imgBubble, mine ? styles.imgBubbleMe : styles.imgBubbleOther, isCurrentMatch && styles.imgBubbleCurrentMatch]}
              >
                <Image source={{ uri: item.content }} style={styles.chatImage} resizeMode="cover" />
                {item._pending && (
                  <View style={styles.imgOverlay}><ActivityIndicator color="#fff" /></View>
                )}
              </TouchableOpacity>
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
                    color={item._failed ? '#ef4444' : isRead ? colors.primaryAccent : colors.textTertiary}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      );
    },
    [checkIsMe, messages, searchQuery, matchIndices, currentMatch, otherUser, otherUserId, renderHighlightedText, colors, styles]
  );

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar backgroundColor={colors.header} barStyle={colors.statusBarStyle} />
      <Animated.View style={[styles.flex, { paddingBottom: kbOffset }]}>
        {searchVisible && (
          <View style={styles.searchBar}>
            <TouchableOpacity onPress={closeSearch} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={20} color={colors.textMain} />
            </TouchableOpacity>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search messages"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {matchIndices.length > 0 ? (
              <View style={styles.searchNav}>
                <Text style={styles.searchCount}>{currentMatch + 1}/{matchIndices.length}</Text>
                <TouchableOpacity onPress={goToPrevMatch} style={styles.navBtn}>
                  <Ionicons name="chevron-up" size={20} color={colors.primaryAction} />
                </TouchableOpacity>
                <TouchableOpacity onPress={goToNextMatch} style={styles.navBtn}>
                  <Ionicons name="chevron-down" size={20} color={colors.primaryAction} />
                </TouchableOpacity>
              </View>
            ) : searchQuery ? (
              <Text style={styles.noResults}>No results</Text>
            ) : null}
          </View>
        )}

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primaryAction} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            
            // 👇 THE WHATSAPP FIX: List is now inverted to anchor to the bottom naturally
            inverted
            
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

        {emojiPickerVisible && (
          <View style={styles.emojiPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.emojiCategoryBar}
              contentContainerStyle={styles.emojiCategoryBarContent}
              keyboardShouldPersistTaps="always"
            >
              {EMOJI_CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => setActiveCategoryIndex(i)}
                  style={[styles.emojiCategoryTab, activeCategoryIndex === i && styles.emojiCategoryTabActive]}
                >
                  <Text style={styles.emojiCategoryIcon}>{cat.icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FlatList
              data={EMOJI_CATEGORIES[activeCategoryIndex].emojis}
              keyExtractor={(item, index) => `${item}_${index}`}
              numColumns={8}
              renderItem={({ item: emoji }) => (
                <TouchableOpacity
                  onPress={() => setNewMessage((prev) => prev + emoji)}
                  style={styles.emojiBtn}
                >
                  <Text style={styles.emojiChar}>{emoji}</Text>
                </TouchableOpacity>
              )}
              style={styles.emojiGrid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              extraData={activeCategoryIndex}
            />
          </View>
        )}

        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
              <Ionicons name="attach" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => {
                Keyboard.dismiss();
                setEmojiPickerVisible((v) => !v);
              }}
            >
              <Ionicons name="happy-outline" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor={colors.textTertiary}
              value={newMessage}
              onChangeText={handleChangeText}
              onFocus={() => setEmojiPickerVisible(false)}
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
      </Animated.View>

      {/* Full-screen image viewer */}
      <Modal visible={!!viewingImage} transparent animationType="fade" onRequestClose={() => setViewingImage(null)}>
        <TouchableOpacity style={styles.imgViewerBg} activeOpacity={1} onPress={() => setViewingImage(null)}>
          <Image source={{ uri: viewingImage }} style={styles.imgViewerImg} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys', icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    name: 'Gestures', icon: '👋',
    emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦵','🦶','👂','🦻','👃','👀','👁️','👅','👄','💋'],
  },
  {
    name: 'People', icon: '👤',
    emojis: ['👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🤴','👸','👳','👲','🧕','🤵','👰','🤰','🤱','👼','🎅','🤶','🦸','🦹','🧙','🧝','🧛','🧟','🧞','🧜','🧚','👫','👬','👭','💏','💑','👪'],
  },
  {
    name: 'Animals', icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'],
  },
  {
    name: 'Food', icon: '🍎',
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🥕','🧄','🧅','🥔','🍠','🌰','🥜','🍞','🥐','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🌮','🌯','🥙','🧆','🍜','🍝','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🍥','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊'],
  },
  {
    name: 'Travel', icon: '🌍',
    emojis: ['🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🏘️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🎠','🎡','🎢','🎪','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🚲','🛴','🛹','🛼','🚨','🚥','🚦','🛑','🚧','⚓','⛵','🚤','🛥️','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚀','🛸'],
  },
  {
    name: 'Activities', icon: '⚽',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥅','⛳','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
  },
  {
    name: 'Objects', icon: '💡',
    emojis: ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📸','📹','🎥','📞','☎️','📺','📻','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🧯','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🔧','🪛','🔩','⚙️','🔗','🧲','🪜','⚗️','🧪','🧫','🧬','🔭','🔬','🩹','🩺','💊','💉','🩸','🧹','🧺','🧻','🚽','🚿','🛁','🧴','🧷','🧼','🪥','🧽','🛒','🚪','🪞','🪟','🛏️','🛋️','🪑','🧳','⛱️','🌂','☂️','🧵','🪡','🧶','👓','🕶️','🥽','🌡️','🪤','🪣','🗑️','🔑','🗝️','🔐','🔏','🔒','🔓','🪓','🗡️','⚔️','🛡️','🔫','🪃','🏹','🪚','🔨','⛏️','⚒️','🛠️','🗜️','💣','🪝'],
  },
  {
    name: 'Symbols', icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','☯️','☦️','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','✅','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','⚠️','🚸','♻️','🔱','⚜️','🔰','💤','🏧','♿','🈳','🆕','🆓','🆒','🆗','🆙','🆚','🆖','🆎','🆑','🅰️','🅱️','🅾️','🆘','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','▶️','⏸️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↩️','↪️','🔀','🔁','🔂','🔃','➕','➖','➗','✖️','💲','💱','™️','©️','®️','〰️','➰','➿','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔷','🔶','🔹','🔸','🔲','🔳','▪️','▫️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫'],
  },
];

// ─── Theme-Aware Style Generator ────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerAvatarWrapper: { position: 'relative', marginRight: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: theme.header,
  },
  headerName: { fontSize: 15, fontWeight: '700', color: theme.textMain, maxWidth: 180 },
  headerStatusTyping: { fontSize: 12, color: theme.secondaryAccent, fontStyle: 'italic', marginTop: 1 },
  headerStatusOnline: { fontSize: 12, color: '#22c55e', marginTop: 1 },
  headerStatusOffline: { fontSize: 11, color: theme.textTertiary, marginTop: 1 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.header, paddingHorizontal: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.headerDivider,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.textMain, marginHorizontal: 8 },
  searchNav: { flexDirection: 'row', alignItems: 'center' },
  searchCount: { fontSize: 13, color: theme.textSub, marginRight: 4 },
  navBtn: { padding: 4 },
  noResults: { fontSize: 13, color: theme.textTertiary, marginRight: 8 },

  list: { paddingHorizontal: 10, paddingVertical: 12 },

  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  rowSpaced: { marginBottom: 6 },

  avatarSlot: { width: 30, marginRight: 4, alignSelf: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.cardAccent },

  bubbleCol: { maxWidth: '75%', position: 'relative' },
  bubbleColLeft: { alignItems: 'flex-start' },
  bubbleColRight: { alignItems: 'flex-end' },

  matchCurrent: { backgroundColor: '#fbbf24', color: '#1a1a1a', borderRadius: 3 },
  matchOther: { backgroundColor: 'rgba(251, 191, 36, 0.35)', borderRadius: 3 },
  bubbleCurrentMatch: { borderWidth: 2, borderColor: '#fbbf24' },
  imgBubbleCurrentMatch: { borderWidth: 2, borderColor: '#fbbf24', borderRadius: 14 },

  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginBottom: 1 },
  bubbleMe: { backgroundColor: theme.primaryAction, borderTopRightRadius: 18, borderBottomRightRadius: 6 },
  bubbleOther: {
    backgroundColor: theme.card, borderTopLeftRadius: 18, borderBottomLeftRadius: 6,
    borderWidth: 1, borderColor: theme.cardAccent,
  },
  tailTopRight: { borderTopRightRadius: 4 },
  tailTopLeft: { borderTopLeftRadius: 4 },

  bubbleText: { fontSize: 15, lineHeight: 21 },
  textMe: { color: theme.textOnPrimary || '#ffffff' }, 
  textOther: { color: theme.textBody },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 },
  metaRight: { justifyContent: 'flex-end', paddingRight: 4 },
  metaLeft: { justifyContent: 'flex-start', paddingLeft: 4 },
  timeText: { fontSize: 11, color: theme.textTertiary },

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
    backgroundColor: theme.card, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: theme.cardAccent,
  },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.textTertiary },
  d1: { opacity: 0.35 },
  d2: { opacity: 0.65 },
  d3: { opacity: 1 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.headerDivider,
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.inputBg, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    marginRight: 8, minHeight: 36, borderWidth: 1, borderColor: theme.inputBorder,
  },
  attachBtn: { padding: 6, alignSelf: 'flex-end' },
  input: {
    flex: 1, fontSize: 15, color: theme.textMain,
    maxHeight: 120, paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 0 : 6,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primaryAction,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: theme.primaryAction, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
  },
  sendOff: { backgroundColor: theme.cardAccent },

  emptyBox: { alignItems: 'center', paddingTop: 60, transform: [{ scaleY: -1 }] }, // Inverted empty box fix
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12, backgroundColor: theme.cardAccent },
  emptyName: { fontSize: 17, fontWeight: '700', color: theme.textMain, marginBottom: 4 },
  emptyHint: { fontSize: 14, color: theme.textSub },

  emojiPanel: {
    backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.headerDivider,
    height: 280,
  },
  emojiCategoryBar: {
    borderBottomWidth: 1, borderBottomColor: theme.headerDivider, maxHeight: 44,
  },
  emojiCategoryBarContent: { paddingHorizontal: 6, paddingVertical: 6, alignItems: 'center' },
  emojiCategoryTab: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginHorizontal: 2,
  },
  emojiCategoryTabActive: { backgroundColor: theme.primaryAction + '35' },
  emojiCategoryIcon: { fontSize: 20 },
  emojiGrid: { flex: 1, paddingHorizontal: 4 },
  emojiBtn: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  emojiChar: { fontSize: 24 },

  imgViewerBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  imgViewerImg: { width: '100%', height: '80%' },
});