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
      setChats(data.chats ?? data);
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
    return <span>{parts.map((part, i) => part.toLowerCase() === highlight.toLowerCase() ? (<span key={i} className="bg-orange-300 text-gray-900 font-bold px-0.5 rounded shadow-sm">{part}</span>) : (part))}</span>;
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

  if (!user) return <div className="p-10 text-center text-red-500">Please Log In to Chat</div>;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 dark:bg-slate-900 font-sans overflow-hidden fixed inset-0">
      <div className="flex-none z-50 relative">
         <Navbar />
      </div>

      <div className="flex-1 w-full max-w-[95rem] mx-auto p-0 sm:p-4 lg:p-6 overflow-hidden relative flex flex-col">
        <div className="bg-white dark:bg-slate-800 sm:rounded-2xl shadow-xl overflow-hidden flex-1 flex border border-slate-200 dark:border-slate-700 relative">
          
          {/* --- IMAGE PREVIEW MODAL --- */}
          {imagePreview && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-2xl max-w-md w-full flex flex-col items-center transition-colors">
                    <div className="w-full flex justify-between items-center mb-2 px-2">
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">Send Image?</h3>
                        <button onClick={cancelPreview} className="text-slate-500 hover:text-red-500"><FaTimes /></button>
                    </div>
                    <img src={imagePreview} alt="Preview" className="max-h-[60vh] rounded border border-slate-200 dark:border-slate-700 object-contain" />
                    <div className="flex gap-3 mt-4 w-full">
                        <button onClick={cancelPreview} className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition" disabled={isUploading}>Cancel</button>
                        <button onClick={sendImage} className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:from-cyan-600 hover:to-teal-600 transition flex justify-center items-center gap-2" disabled={isUploading}>
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center text-center overflow-hidden"
                  style={{animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both'}}>

                    {/* Red header strip */}
                    <div className="w-full bg-gradient-to-br from-red-500 to-rose-600 pt-8 pb-10 flex flex-col items-center px-6">
                        <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 shadow-lg ring-4 ring-white/30"
                          style={{animation: 'trashWiggle 0.5s 0.25s ease-in-out both'}}>
                            <FaTrashAlt className="text-2xl text-white" />
                        </div>
                        <h3 className="font-bold text-xl text-white">Delete {chatsToDelete.length} Chat{chatsToDelete.length !== 1 ? 's' : ''}?</h3>
                    </div>

                    {/* Body */}
                    <div className="px-6 pt-5 pb-6 w-full -mt-4 bg-white dark:bg-slate-800 rounded-t-2xl">
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                            All messages in {chatsToDelete.length === 1 ? 'this conversation' : 'these conversations'} will be permanently removed.
                        </p>
                        <p className="text-xs font-semibold text-red-500 dark:text-red-400 mb-6">This action cannot be undone.</p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 hover:shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold hover:from-red-600 hover:to-rose-700 shadow-md hover:shadow-red-300 dark:hover:shadow-red-900 transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
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
          <div className={`${isMobileChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-full`}>
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 h-16 shrink-0 relative">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Chats</h2>
              
              <button 
                onClick={() => setShowDropdown(!showDropdown)} 
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition relative"
              >
                <FaEllipsisV />
              </button>

              {showDropdown && (
                <div className="absolute top-14 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl py-1.5 w-52 z-50 animate-fade-in origin-top-right"
                  style={{animation: 'dropdownPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both'}}>
                    <button
                        onClick={() => {
                            setIsDeleteMode(true);
                            setShowDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg mx-auto group"
                    >
                        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-800/40 transition-colors">
                            <FaTrashAlt className="text-xs text-red-500 dark:text-red-400" />
                        </span>
                        Delete Chats
                    </button>
                </div>
              )}
            </div>

            <div className="p-4 shrink-0">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaSearch className="text-slate-400" /></span>
                <input 
                    type="text" 
                    placeholder="Search chats..." 
                    value={sidebarSearch} 
                    onChange={(e) => setSidebarSearch(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-full border-none focus:ring-2 focus:ring-cyan-500 text-sm transition outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400" 
                />
              </div>
            </div>

            {isDeleteMode && (
              <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-b border-red-200 dark:border-red-800/40 flex justify-between items-center shrink-0 shadow-sm"
                style={{animation: 'slideDown 0.22s ease-out both'}}>
                  <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold shadow-sm transition-all duration-300"
                        style={{transform: chatsToDelete.length > 0 ? 'scale(1.1)' : 'scale(1)'}}>
                          {chatsToDelete.length}
                      </span>
                      <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                          {chatsToDelete.length === 1 ? 'chat selected' : 'chats selected'}
                      </span>
                  </div>
                  <div className="flex gap-2">
                      <button
                          onClick={cancelDeleteMode}
                          className="text-xs px-3.5 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all duration-200"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={() => setShowConfirmDelete(true)}
                          disabled={chatsToDelete.length === 0}
                          className={`text-xs px-3.5 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-all duration-200 ${
                            chatsToDelete.length > 0
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-red-300 dark:hover:shadow-red-900 hover:-translate-y-0.5 active:translate-y-0'
                              : 'bg-red-200 dark:bg-red-900/30 text-red-300 dark:text-red-600 cursor-not-allowed'
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
                    className={`flex items-center p-4 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 
                      ${isUnread ? 'bg-white dark:bg-slate-700 border-l-4 border-green-500' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'} 
                      ${isActive && !isDeleteMode ? 'bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-cyan-600' : ''}
                      ${chatsToDelete.includes(getUserId(chat)) ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                  >
                    {isDeleteMode && (
                        <div className="mr-3 flex-shrink-0">
                            <input 
                                type="checkbox"
                                checked={chatsToDelete.includes(getUserId(chat))}
                                readOnly
                                className="h-5 w-5 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer pointer-events-none"
                            />
                        </div>
                    )}

                    <div className="relative flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                        {partner.profilePic || partner.pic ? <img src={partner.profilePic || partner.pic} className="h-full w-full object-cover" alt="" /> : partner.name.charAt(0)}
                      </div>
                      {onlineUsers.includes(getUserId(partner)) && (
                        <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800"></span>
                      )}
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className={`text-sm truncate ${isUnread ? 'font-extrabold text-black dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'} ${isActive && !isDeleteMode ? 'text-cyan-900 dark:text-cyan-400' : ''}`}>
                            {partner.name}
                        </h3>
                        <span className={`text-xs ${isUnread ? 'font-bold text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {latestMsg ? new Date(latestMsg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'} ${isActive && !isDeleteMode ? 'text-cyan-700 dark:text-cyan-300' : ''}`}>
                          {isLatestMsgImage ? <span className="flex items-center gap-1 italic text-slate-400"><FaImage /> Photo</span> : latestMsg.content}
                      </p>
                    </div>
                  </div>
                )})}
            </div>
          </div>

          {/* --- MAIN CHAT WINDOW --- */}
          <div className={`${!isMobileChatOpen ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#f0f2f5] dark:bg-slate-900 relative h-full`}>
            {selectedChat ? (
              <>
                <div className="flex-none p-3 sm:p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20 h-16 transition-colors">
                  <div className="flex items-center">
                    <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden mr-3 text-gray-500 dark:text-gray-400 hover:text-indigo-600"><FaArrowLeft className="text-xl" /></button>
                    <div 
                        className="flex items-center cursor-pointer hover:opacity-80 transition"
                        onClick={() => handleViewProfile(getUserId(getSender(user, selectedChat.users)))}
                    >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold mr-3 overflow-hidden">
                            {getSender(user, selectedChat.users).pic ? <img src={getSender(user, selectedChat.users).pic} className="h-full w-full object-cover" alt="" /> : getSender(user, selectedChat.users).name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600">{getSender(user, selectedChat.users).name}</h3>
                            <p className="text-xs font-medium flex items-center">
                                {onlineUsers.includes(getUserId(getSender(user, selectedChat.users))) ? <span className="text-green-500 flex items-center gap-1"><FaCircle className="text-[8px]" /> Online</span> : <span className="text-slate-400 dark:text-slate-500">Offline</span>}
                            </p>
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400">
                    {showInChatSearch ? (
                        <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full px-3 py-1.5 shadow-sm animate-fade-in transition-all">
                            <input autoFocus type="text" placeholder="Find..." className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none appearance-none text-sm text-slate-700 dark:text-white w-28 sm:w-40 placeholder-slate-400" value={inChatSearch} onChange={(e) => setInChatSearch(e.target.value)} />
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-600 pl-2 ml-2">
                                <span className="mr-2">{searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}</span>
                                <button onClick={handlePrevMatch} className="hover:bg-slate-100 dark:hover:bg-slate-600 p-1 rounded text-slate-600 dark:text-slate-300"><FaChevronUp /></button>
                                <button onClick={handleNextMatch} className="hover:bg-slate-100 dark:hover:bg-slate-600 p-1 rounded text-slate-600 dark:text-slate-300"><FaChevronDown /></button>
                            </div>
                            <button onClick={() => {setShowInChatSearch(false); setInChatSearch("")}} className="text-slate-400 hover:text-red-500 ml-2 pl-2"><FaTimes /></button>
                        </div>
                    ) : (
                        <button onClick={() => setShowInChatSearch(true)} className="hover:bg-cyan-50 dark:hover:bg-cyan-900/30 p-2.5 rounded-full transition text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400"><FaSearch /></button>
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
                            ${isImg ? 'p-0 bg-transparent shadow-none border-none' : `px-4 py-2 shadow-sm border border-gray-100 dark:border-gray-700 ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'}`} 
                            ${isCurrentMatch ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-all">{renderMessageText(msg.content, inChatSearch, isCurrentMatch)}</p>
                            <div className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${isImg ? 'text-gray-500 pr-1' : (isMe ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-400')}`}>
                                <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Just now"}</span>
                                {isMe && (<span className="ml-1"><FaCheckDouble className="text-[10px] text-blue-300" /></span>)}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                  {isTyping && (
                    <div className="ml-4 mb-2 animate-pulse">
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Typing...</span>
                    </div>
                  )}
                  <div ref={bottomRef} />
                  </div>
                </div>

                <div className="flex-none p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 transition-colors">
                  {showEmojiPicker && (
                      <div className="absolute bottom-20 left-4 z-30 shadow-2xl">
                          <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} />
                      </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-400 hover:text-yellow-500 transition"><FaSmile className="text-xl" /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"><FaPaperclip className="text-lg" /></button>
                    
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={handleTyping} 
                        placeholder="Type a message..." 
                        className="flex-1 bg-slate-100 dark:bg-slate-700 border-0 rounded-full px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-600 transition text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400" 
                    />
                    
                    <button type="submit" disabled={!newMessage.trim()} className={`p-3 rounded-full shadow-lg transition transform hover:scale-105 ${newMessage.trim() ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                      <FaPaperPlane />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-slate-900 text-center p-8 transition-colors">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-md mb-6 animate-bounce-slow">
                    <div className="text-cyan-200 dark:text-cyan-900 text-6xl"><FaImage className="mx-auto" /></div>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">CampusMart Chat</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">Select a chat to start messaging.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;