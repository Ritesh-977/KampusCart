// src/App.jsx
import { Routes, Route, useLocation } from "react-router-dom"; 
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ScrollToTop from "./components/ScrollToTop";
import Footer from "./components/Footer";

// Pages
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import ItemDetails from "./pages/ItemDetails";
import MyListings from "./pages/MyListings";
import EditItem from "./pages/EditItem";
import SellItem from "./pages/SellItem";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Wishlist from "./pages/Wishlist";
import Chat from "./pages/Chat";
import LostAndFound from "./pages/LostandFound";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import PublicProfile from "./pages/PublicProfile";
import AdminDashboard from "./pages/AdminDashboard"; // <--- 1. Import Admin Page
import NotFound from "./pages/NotFound";

function App() {
  const location = useLocation();

  // Define paths where the footer should be hidden
  const hideFooter = location.pathname === '/chats'; 

  return (
    // Layout wrapper
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      
      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />

      {/* Scroll behavior controller */}
      <ScrollToTop />

      {/* Main content */}
      <div className="flex-grow">
        <Routes>
          {/* === PUBLIC PAGES === */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/passwordreset/:resetToken" element={<ResetPassword />} />
          <Route path="/profile/view/:userId" element={<PublicProfile />} />

          {/* Support Pages */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />

          {/* === PROTECTED PAGES === */}
          
          {/* 2. Add Admin Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sell"
            element={
              <ProtectedRoute>
                <SellItem />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-listings"
            element={
              <ProtectedRoute>
                <MyListings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-item/:id"
            element={
              <ProtectedRoute>
                <EditItem />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <NotFound />
            }
          />

          <Route 
            path="/lost-and-found" 
            element={
              <ProtectedRoute>
                <LostAndFound />
              </ProtectedRoute>
            } 
          />

          <Route
           path="/item/:id"
            element={<ProtectedRoute>
              <ItemDetails />
            </ProtectedRoute>}
           />



        </Routes>

          

      </div>

      {/* Conditionally Render Footer */}
      {!hideFooter && <Footer />}
    </div>
  );
}

export default App;