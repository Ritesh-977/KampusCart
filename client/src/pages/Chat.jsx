import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import EmojiPicker from 'emoji-picker-react';
import io from 'socket.io-client';
import API from '../api/axios';
import { useLocation, useNavigate } from 'react-router-dom'; 
import {
  FaSearch, FaPaperPlane, FaEllipsisV, FaSmile, FaPaperclip,
  FaArrowLeft, FaCheckDouble, FaCircle, FaTimes, FaChevronUp, FaChevronDown, FaImage, FaTrashAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const ENDPOINT = import.meta.env.VITE_SERVER_URL;

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // UI States
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [inChatSearch, setInChatSearch] = useState("");
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [searchMatches, setSearchMatches] = useState([]); 
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  // --- PREVIEW STATES ---
  const [imagePreview, setImagePreview] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // --- DELETE UI STATES ---
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [chatsToDelete, setChatsToDelete] = useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Refs
  const socket = useRef(null);
  const selectedChatRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});

  const getUserId = (u) => {
    if (!u) return null;
    return u._id || u.id || u.userId;
  };

  const user = JSON.parse(localStorage.getItem("user")) || JSON.parse(localStorage.getItem("userInfo"));
  const loggedInUserId = getUserId(user);

  const getSender = (loggedUser, users) => {
    if (!users || users.length < 2) return { name: "Unknown User", pic: "", profilePic: "" };
    const myId = getUserId(loggedUser);
    const user0Id = getUserId(users[0]);
    return String(user0Id) === String(myId) ? users[1] : users[0];
  };

  useEffect(() => {
    if (!loggedInUserId) return;

    socket.current = io(ENDPOINT);
    const setupSocket = () => socket.current.emit("setup", { _id: loggedInUserId });

    socket.current.on("connect", () => {
        setupSocket(); 
        setSocketConnected(true);
    });

    socket.current.on("online_users", (users) => setOnlineUsers(users));
    socket.current.on("typing", () => setIsTyping(true));
    socket.current.on("stop typing", () => setIsTyping(false));

    socket.current.on("message received", (newMessageRecieved) => {
        const incomingChatId = getUserId(newMessageRecieved.chat) || newMessageRecieved.chat;
        const activeChatId = selectedChatRef.current ? getUserId(selectedChatRef.current) : null;

        if (activeChatId && String(activeChatId) === String(incomingChatId)) {
            setMessages(prev => [...prev, newMessageRecieved]);
            try { API.put("/message/read", { chatId: incomingChatId }); } catch(e){}
        }
        fetchChats();
    });

    const timer = setTimeout(() => { if (socket.current.connected) setupSocket(); }, 1000);
    return () => { clearTimeout(timer); if(socket.current) socket.current.disconnect(); };
  }, [loggedInUserId]);

  useEffect(() => { fetchChats(); }, []);

  useEffect(() => {
    if (location.state && location.state.chat) {
        const chatData = location.state.chat;
        setChats(prev => {
            const exists = prev.find(c => getUserId(c) === getUserId(chatData));
            return exists ? prev : [chatData, ...prev];
        });
        handleSelectChat(chatData);
        window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchChats = async () => {
    try {
      const { data } = await API.get("/chat");
      setChats(data);
    } catch (error) { console.error("Error fetching chats:", error); }
  };

  const handleSelectChat = async (chat) => {
      setSelectedChat(chat);
      selectedChatRef.current = chat;
      setIsMobileChatOpen(true); 
      
      const chatId = getUserId(chat);

      setChats(prevChats => prevChats.map(c => {
          if (String(getUserId(c)) === String(chatId) && c.latestMessage) {
             const currentReadBy = c.latestMessage.readBy || [];
             if (!currentReadBy.some(id => String(id) === String(loggedInUserId))) {
                 return {
                     ...c,
                     latestMessage: {
                         ...c.latestMessage,
                         readBy: [...currentReadBy, loggedInUserId]
                     }
                 };
             }
          }
          return c;
      }));

      try {
          const { data } = await API.get(`/message/${chatId}`);
          setMessages(data);
          socket.current?.emit("join chat", chatId);
      } catch (error) { console.error("Error fetching messages:", error); }

      try {
          await API.put("/message/read", { chatId });
          window.dispatchEvent(new Event("chatRead")); 
      } catch (error) { console.warn("Background read mark failed"); }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const chatId = getUserId(selectedChat);
    socket.current.emit("stop typing", chatId);
    
    const tempMsg = {
        _id: Date.now(),
        content: newMessage,
        sender: { _id: loggedInUserId },
        chat: selectedChat,
        createdAt: new Date().toISOString()
    };
    
    const msgToSend = newMessage;
    setNewMessage("");
    setShowEmojiPicker(false);

    try {
        setMessages(prev => [...prev, tempMsg]);
        const { data } = await API.post("/message", { content: msgToSend, chatId: chatId });
        socket.current.emit("new message", data);
        fetchChats(); 
    } catch (error) { console.error("Error sending message:", error); }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socketConnected || !selectedChat) return;
    const chatId = getUserId(selectedChat);
    socket.current.emit("typing", chatId);
    const timer = setTimeout(() => socket.current.emit("stop typing", chatId), 3000);
    return () => clearTimeout(timer);
  };

  const initialScrollDone = useRef(false);

  // Reset flag whenever the user switches to a different chat
  useEffect(() => {
    initialScrollDone.current = false;
  }, [selectedChat]);

  // Fires synchronously BEFORE the browser paints — user never sees the top
  useLayoutEffect(() => {
    if (!initialScrollDone.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      initialScrollDone.current = true;
    }
  }, [messages]);

  // Smooth scroll for new messages after the initial load
  useEffect(() => {
    if (initialScrollDone.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const onEmojiClick = (emojiObject) => setNewMessage(prev => prev + emojiObject.emoji);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5000000) { 
        toast.error("File is too large (Max 5MB)");
        return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setFileToUpload(file);
    e.target.value = null; 
  };

  const cancelPreview = () => {
    setImagePreview(null);
    setFileToUpload(null);
  };

  const sendImage = async () => {
    if (!fileToUpload) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', fileToUpload); 

    try {
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
        const { data } = await API.post('/upload', formData, config);
        const imagePath = data.filePath || data.url || data; 

        setImagePreview(null);
        setFileToUpload(null);
        setIsUploading(false);

        const chatId = getUserId(selectedChat);
        const tempMsg = {
            _id: Date.now(),
            content: imagePath,
            sender: { _id: loggedInUserId },
            chat: selectedChat,
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, tempMsg]);
        const { data: msgData } = await API.post("/message", {
            content: imagePath,
            chatId: chatId,
        });
        
        socket.current.emit("new message", msgData);
        fetchChats();

    } catch (error) {
        console.error("File upload error:", error);
        toast.error("Failed to upload image.");
        setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!inChatSearch.trim()) { setSearchMatches([]); return; }
    const matches = messages.map((msg, index) => (msg.content || "").toLowerCase().includes(inChatSearch.toLowerCase()) ? index : -1).filter(index => index !== -1);
    setSearchMatches(matches); setCurrentMatchIndex(matches.length > 0 ? matches.length - 1 : 0);
  }, [inChatSearch, messages]);

  const handleNextMatch = () => { if (searchMatches.length === 0) return; const nextIndex = (currentMatchIndex + 1) % searchMatches.length; setCurrentMatchIndex(nextIndex); scrollToMessage(searchMatches[nextIndex]); };
  const handlePrevMatch = () => { if (searchMatches.length === 0) return; const prevIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length; setCurrentMatchIndex(prevIndex); scrollToMessage(searchMatches[prevIndex]); };
  
  const scrollToMessage = (index) => { 
      const msgId = messages[index]._id; 
      if(messageRefs.current[msgId] && messagesContainerRef.current) {
         const container = messagesContainerRef.current;
         const element = messageRefs.current[msgId];
         container.scrollTop = element.offsetTop - container.offsetTop - (container.clientHeight / 2);
      }
  };

  const checkIsImage = (text) => {
    if(!text) return false;
    return (/\.(jpg|jpeg|png|gif|webp)$/i).test(text) || text.includes("/uploads/") || text.includes("cloudinary");
  };

  const renderMessageText = (text, highlight, isActive) => {
    if (!text) return "";
    const isImage = checkIsImage(text);
    if (isImage) {
        const fullUrl = text.startsWith("http") ? text : `${ENDPOINT}${text}`;
        return (
            <div className="mt-0">
                <img 
                    src={fullUrl} 
                    alt="sent image" 
                    className="max-w-[200px] sm:max-w-[300px] rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(fullUrl, '_blank')}
                    onError={(e) => { e.target.style.display = 'none'; }} 
                />
            </div>
        );
    }
    if (!highlight.trim() || !isActive) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return <span>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? (<span key={i} className="bg-warning text-foreground font-bold px-0.5 rounded shadow-sm">{part}</span>) : (part))}</span>;
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/view/${userId}`);
  };

  // --- DELETE LOGIC ---
  const toggleChatSelection = (chatId) => {
      setChatsToDelete(prev => 
          prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
      );
  };

  const cancelDeleteMode = () => {
      setIsDeleteMode(false);
      setChatsToDelete([]);
      setShowDropdown(false);
      setShowConfirmDelete(false); // Ensure modal closes if cancelled
  };

  const handleDeleteSelected = async () => {
      if (chatsToDelete.length === 0) return;

      try {
          await API.post("/chat/delete-multiple", { chatIds: chatsToDelete });

          setChats(prev => prev.filter(c => !chatsToDelete.includes(getUserId(c))));

          if (selectedChat && chatsToDelete.includes(getUserId(selectedChat))) {
              setSelectedChat(null);
              selectedChatRef.current = null;
              setIsMobileChatOpen(false);
          }

          toast.success("Chats deleted successfully!");
          cancelDeleteMode(); // This already handles resetting states and closing UI
      } catch (error) {
          console.error("Error deleting chats:", error);
          toast.error("Failed to delete chats.");
          setShowConfirmDelete(false); // Close modal on error
      }
  };

  if (!user) return <div className="p-10 text-center text-danger">Please Log In to Chat</div>;

  return (
    <div className="h-[100dvh] flex flex-col bg-surface-muted font-sans overflow-hidden fixed inset-0">
      <div className="flex-none z-50 relative">
         <Navbar />
      </div>

      <div className="flex-1 w-full max-w-[95rem] mx-auto p-0 sm:p-4 lg:p-6 overflow-hidden relative flex flex-col">
        <div className="bg-surface sm:rounded-2xl shadow-xl overflow-hidden flex-1 flex border border-border relative">
          
          {/* --- IMAGE PREVIEW MODAL --- */}
          {imagePreview && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-surface p-2 rounded-lg shadow-2xl max-w-md w-full flex flex-col items-center transition-colors">
                    <div className="w-full flex justify-between items-center mb-2 px-2">
                        <h3 className="font-bold text-foreground">Send Image?</h3>
                        <button onClick={cancelPreview} className="text-muted hover:text-danger"><FaTimes /></button>
                    </div>
                    <img src={imagePreview} alt="Preview" className="max-h-[60vh] rounded border border-border object-contain" />
                    <div className="flex gap-3 mt-4 w-full">
                        <button onClick={cancelPreview} className="flex-1 py-2 rounded-lg border border-border-strong text-foreground font-semibold hover:bg-surface-2 dark:hover:bg-surface-muted transition" disabled={isUploading}>Cancel</button>
                        <button onClick={sendImage} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-accent to-primary text-white font-semibold hover:from-accent hover:to-primary transition flex justify-center items-center gap-2" disabled={isUploading}>
                            {isUploading ? "Sending..." : <><FaPaperPlane /> Send</>}
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* --- DELETE CONFIRMATION MODAL --- */}
          {showConfirmDelete && (
            <div className="absolute inset-0 z-[60] bg-black/60 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
              style={{animation: 'fadeInBackdrop 0.2s ease-out both'}}>
                <div className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center text-center overflow-hidden"
                  style={{animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both'}}>

                    {/* Red header strip */}
                    <div className="w-full bg-gradient-to-br from-danger to-danger pt-8 pb-10 flex flex-col items-center px-6">
                        <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 shadow-lg ring-4 ring-white/30"
                          style={{animation: 'trashWiggle 0.5s 0.25s ease-in-out both'}}>
                            <FaTrashAlt className="text-2xl text-white" />
                        </div>
                        <h3 className="font-bold text-xl text-white">Delete {chatsToDelete.length} Chat{chatsToDelete.length !== 1 ? 's' : ''}?</h3>
                    </div>

                    {/* Body */}
                    <div className="px-6 pt-5 pb-6 w-full -mt-4 bg-surface rounded-t-2xl">
                        <p className="text-muted text-sm mb-1">
                            All messages in {chatsToDelete.length === 1 ? 'this conversation' : 'these conversations'} will be permanently removed.
                        </p>
                        <p className="text-xs font-semibold text-danger mb-6">This action cannot be undone.</p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold hover:bg-surface-2 dark:hover:bg-surface-muted transition-all duration-200 hover:shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-danger to-danger text-white font-semibold hover:from-danger hover:to-danger shadow-md hover:shadow-danger dark:hover:shadow-danger transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <FaTrashAlt className="text-xs" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* --- SIDEBAR --- */}
          <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 flex-col border-r border-border bg-surface h-full`}>
            
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-2 h-16 shrink-0 relative">
              <h2 className="text-xl font-bold text-foreground">Chats</h2>
              
              <button 
                onClick={() => setShowDropdown(!showDropdown)} 
                className="p-2 rounded-full hover:bg-surface-muted dark:hover:bg-surface-muted text-muted transition relative"
              >
                <FaEllipsisV />
              </button>

              {showDropdown && (
                <div className="absolute top-14 right-4 bg-surface border border-border shadow-2xl rounded-xl py-1.5 w-52 z-50 animate-fade-in origin-top-right"
                  style={{animation: 'dropdownPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both'}}>
                    <button
                        onClick={() => {
                            setIsDeleteMode(true);
                            setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger-muted dark:hover:bg-danger/20 transition-colors rounded-lg mx-auto group"
                    >
                        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-danger-muted group-hover:bg-danger dark:group-hover:bg-danger/40 transition-colors">
                            <FaTrashAlt className="text-xs text-danger" />
                        </span>
                        Delete Chats
                    </button>
                </div>
              )}
            </div>

            <div className="p-4 shrink-0">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-subtle" /></span>
                <input 
                    type="text" 
                    placeholder="Search chats..." 
                    value={sidebarSearch} 
                    onChange={(e) => setSidebarSearch(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-surface-muted rounded-full border-none focus:ring-2 focus:ring-accent text-sm transition outline-none text-foreground placeholder-subtle" 
                />
              </div>
            </div>

            {isDeleteMode && (
              <div className="px-4 py-3 bg-gradient-to-r from-danger-muted to-danger-muted   border-b border-danger flex justify-between items-center shrink-0 shadow-sm"
                style={{animation: 'slideDown 0.22s ease-out both'}}>
                  <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-danger text-white text-xs font-bold shadow-sm transition-all duration-300"
                        style={{transform: chatsToDelete.length > 0 ? 'scale(1.1)' : 'scale(1)'}}>
                          {chatsToDelete.length}
                      </span>
                      <span className="text-sm font-semibold text-danger">
                          {chatsToDelete.length === 1 ? 'chat selected' : 'chats selected'}
                      </span>
                  </div>
                  <div className="flex gap-2">
                      <button
                          onClick={cancelDeleteMode}
                          className="text-xs px-3.5 py-1.5 rounded-full border border-border-strong text-muted font-medium hover:bg-surface dark:hover:bg-surface-muted hover:shadow-sm transition-all duration-200"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={() => setShowConfirmDelete(true)}
                          disabled={chatsToDelete.length === 0}
                          className={`text-xs px-3.5 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-all duration-200 ${
                            chatsToDelete.length > 0
                              ? 'bg-danger hover:bg-danger text-white shadow-md hover:shadow-danger dark:hover:shadow-danger hover:-translate-y-0.5 active:translate-y-0'
                              : 'bg-danger text-danger cursor-not-allowed'
                          }`}
                      >
                          <FaTrashAlt className="text-[10px]" />
                          Delete
                      </button>
                  </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {chats
                .filter(c => {
                  const p = getSender(user, c.users);
                  return p.name.toLowerCase().includes(sidebarSearch.toLowerCase());
                })
                .sort((a, b) => {
                    const dateA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
                    const dateB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
                    return dateB - dateA;
                })
                .map((chat) => {
                  const partner = getSender(user, chat.users);
                  const isActive = selectedChat && getUserId(selectedChat) === getUserId(chat);
                  const latestMsg = chat.latestMessage;
                  if (!latestMsg) return null; 
                  const isSenderMe = String(getUserId(latestMsg.sender)) === String(loggedInUserId);
                  const readBy = latestMsg?.readBy || [];
                  const hasRead = readBy.some(id => String(id) === String(loggedInUserId));
                  const isUnread = !isSenderMe && !hasRead;
                  const isLatestMsgImage = checkIsImage(latestMsg?.content);

                  return (
                  <div 
                    key={getUserId(chat)}
                    onClick={() => isDeleteMode ? toggleChatSelection(getUserId(chat)) : handleSelectChat(chat)}
                    className={`flex items-center p-4 cursor-pointer transition-colors border-b border-border 
                      ${isUnread ? 'bg-surface border-l-4 border-success' : 'bg-surface-2 hover:bg-surface-muted dark:hover:bg-surface-muted'} 
                      ${isActive && !isDeleteMode ? 'bg-accent-muted border-l-4 border-accent' : ''}
                      ${chatsToDelete.includes(getUserId(chat)) ? 'bg-danger-muted' : ''}`}
                  >
                    {isDeleteMode && (
                        <div className="mr-3 flex-shrink-0">
                            <input 
                                type="checkbox"
                                checked={chatsToDelete.includes(getUserId(chat))}
                                readOnly
                                className="h-5 w-5 rounded border-border-strong text-danger focus:ring-danger cursor-pointer pointer-events-none"
                            />
                        </div>
                    )}

                    <div className="relative flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                        {partner.profilePic || partner.pic ? <img src={partner.profilePic || partner.pic} className="h-full w-full object-cover" alt="" /> : partner.name.charAt(0)}
                      </div>
                      {onlineUsers.includes(getUserId(partner)) && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-success ring-2 ring-surface"></span>
                      )}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className={`text-sm truncate ${isUnread ? 'font-extrabold text-foreground' : 'font-medium text-foreground'} ${isActive && !isDeleteMode ? 'text-accent' : ''}`}>
                            {partner.name}
                        </h3>
                        <span className={`text-xs ${isUnread ? 'font-bold text-success' : 'text-subtle'}`}>
                            {latestMsg ? new Date(latestMsg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'text-muted'} ${isActive && !isDeleteMode ? 'text-accent' : ''}`}>
                          {isLatestMsgImage ? <span className="flex items-center gap-1 italic text-subtle"><FaImage /> Photo</span> : latestMsg.content}
                      </p>
                    </div>
                  </div>
                )})}
            </div>
          </div>

          {/* --- MAIN CHAT WINDOW --- */}
          <div className={`${!isMobileChatOpen ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-chat relative h-full`}>
            {selectedChat ? (
              <>
                <div className="flex-none p-3 sm:p-4 bg-surface border-b border-border flex justify-between items-center shadow-sm z-20 h-16 transition-colors">
                  <div className="flex items-center">
                    <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden mr-3 text-muted hover:text-primary"><FaArrowLeft className="text-xl" /></button>
                    <div 
                        className="flex items-center cursor-pointer hover:opacity-80 transition"
                        onClick={() => handleViewProfile(getUserId(getSender(user, selectedChat.users)))}
                    >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center text-white font-bold mr-3 overflow-hidden">
                            {getSender(user, selectedChat.users).pic ? <img src={getSender(user, selectedChat.users).pic} className="h-full w-full object-cover" alt="" /> : getSender(user, selectedChat.users).name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground group-hover:text-accent">{getSender(user, selectedChat.users).name}</h3>
                            <p className="text-xs font-medium flex items-center">
                                {onlineUsers.includes(getUserId(getSender(user, selectedChat.users))) ? <span className="text-success flex items-center gap-1"><FaCircle className="text-[8px]" /> Online</span> : <span className="text-subtle">Offline</span>}
                            </p>
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-accent">
                    {showInChatSearch ? (
                        <div className="flex items-center bg-surface border border-border-strong rounded-full px-3 py-1.5 shadow-sm animate-fade-in transition-all">
                            <input autoFocus type="text" placeholder="Find..." className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none appearance-none text-sm text-foreground w-28 sm:w-40 placeholder-subtle" value={inChatSearch} onChange={(e) => setInChatSearch(e.target.value)} />
                            <div className="flex items-center text-xs text-muted border-l border-border-strong pl-2 ml-2">
                                <span className="mr-2">{searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}</span>
                                <button onClick={handlePrevMatch} className="hover:bg-surface-muted dark:hover:bg-surface-muted p-1 rounded text-muted"><FaChevronUp /></button>
                                <button onClick={handleNextMatch} className="hover:bg-surface-muted dark:hover:bg-surface-muted p-1 rounded text-muted"><FaChevronDown /></button>
                            </div>
                            <button onClick={() => {setShowInChatSearch(false); setInChatSearch("")}} className="text-subtle hover:text-danger ml-2 pl-2"><FaTimes /></button>
                        </div>
                    ) : (
                        <button onClick={() => setShowInChatSearch(true)} className="hover:bg-accent-muted dark:hover:bg-accent/30 p-2.5 rounded-full transition text-muted hover:text-accent"><FaSearch /></button>
                    )}
                  </div>
                </div>

                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 bg-chat-pattern custom-scrollbar sm:pb-4"
                >
                  <div className="flex flex-col justify-end min-h-full space-y-4">
                  {messages.map((msg, index) => {
                    const isMe = String(getUserId(msg.sender)) === String(loggedInUserId);
                    const isCurrentMatch = searchMatches.length > 0 && searchMatches[currentMatchIndex] === index;
                    const isImg = checkIsImage(msg.content);
                    
                    return (
                        <div key={index} ref={(el) => (messageRefs.current[msg._id] = el)} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] sm:max-w-[60%] rounded-2xl relative group transition-all duration-300 
                            ${isImg ? 'p-0 bg-transparent shadow-none border-none' : `px-4 py-2 shadow-sm border border-border ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-surface text-foreground rounded-bl-none'}`} 
                            ${isCurrentMatch ? 'ring-2 ring-warning ring-offset-2' : ''}`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-all">{renderMessageText(msg.content, inChatSearch, isCurrentMatch)}</p>
                            <div className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${isImg ? 'text-muted pr-1' : (isMe ? 'text-primary' : 'text-subtle')}`}>
                                <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Just now"}</span>
                                {isMe && (<span className="ml-1"><FaCheckDouble className="text-[10px] text-info" /></span>)}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                  {isTyping && (
                    <div className="ml-4 mb-2 animate-pulse">
                        <span className="text-sm font-bold text-primary">Typing...</span>
                    </div>
                  )}
                  <div ref={bottomRef} />
                  </div>
                </div>

                <div className="flex-none p-3 sm:p-4 bg-surface border-t border-border z-30 transition-colors">
                  {showEmojiPicker && (
                      <div className="absolute bottom-20 left-4 z-30 shadow-2xl">
                          <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} />
                      </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-subtle hover:text-warning transition"><FaSmile className="text-xl" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-subtle hover:text-primary dark:hover:text-primary transition"><FaPaperclip className="text-lg" /></button>
                    
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={handleTyping} 
                        placeholder="Type a message..." 
                        className="flex-1 bg-surface-muted border-0 rounded-full px-4 py-3 focus:ring-2 focus:ring-accent focus:bg-surface dark:focus:bg-surface-muted transition text-sm sm:text-base text-foreground placeholder-subtle" 
                    />
                    
                    <button type="submit" disabled={!newMessage.trim()} className={`p-3 rounded-full shadow-lg transition transform hover:scale-105 ${newMessage.trim() ? 'bg-gradient-to-r from-accent to-primary text-white hover:from-accent hover:to-primary' : 'bg-surface-muted text-subtle cursor-not-allowed'}`}>
                      <FaPaperPlane />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-chat text-center p-8 transition-colors">
                <div className="bg-surface p-6 rounded-full shadow-md mb-6 animate-bounce-slow">
                    <div className="text-accent text-6xl"><FaImage className="mx-auto" /></div>
                </div>
                <h2 className="text-2xl font-bold text-foreground">CampusMart Chat</h2>
                <p className="text-muted mt-2 max-w-md">Select a chat to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;