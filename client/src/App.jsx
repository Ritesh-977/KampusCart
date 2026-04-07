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
import CollegeProtectedRoute from "./components/CollegeProtectedRoute";
import CollegeSelection from "./pages/CollegeSelection";
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
import AdminDashboard from "./pages/AdminDashboard";
import BrowseItems from "./pages/BrowseItems";
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
          {/* === COLLEGE SELECTION (exempt from college guard) === */}
          <Route path="/select-college" element={<CollegeSelection />} />

          {/* === PUBLIC PAGES (exempt from college check) === */}
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/passwordreset/:resetToken" element={<ResetPassword />} />

          {/* Support Pages */}
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />

          {/* === COLLEGE-GATED PAGES === */}
          <Route
            path="/"
            element={
              <CollegeProtectedRoute>
                <Home />
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/profile/view/:userId"
            element={
              <CollegeProtectedRoute>
                <PublicProfile />
              </CollegeProtectedRoute>
            }
          />

          {/* Admin Route */}
          <Route
            path="/admin"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/sell"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <SellItem />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/my-listings"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <MyListings />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/edit-item/:id"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <EditItem />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/wishlist"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/chats"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          <Route 
            path="/lost-and-found" 
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <LostAndFound />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            } 
          />

          <Route
            path="/browse"
            element={
              <CollegeProtectedRoute>
                <BrowseItems />
              </CollegeProtectedRoute>
            }
          />

          <Route
            path="/item/:id"
            element={
              <CollegeProtectedRoute>
                <ProtectedRoute>
                  <ItemDetails />
                </ProtectedRoute>
              </CollegeProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {/* Conditionally Render Footer */}
      {!hideFooter && <Footer />}
    </div>
  );
}

export default App;