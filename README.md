# 🛒 KampusCart

![MERN Stack](https://img.shields.io/badge/MERN-Stack-000000?style=for-the-badge&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

**KampusCart** is a hyper-local, community-focused marketplace designed specifically for university campuses (MNNIT Allahabad). It bridges the gap between students who need items and those who have items to sell, featuring real-time chat, secure authentication, and a modern dark-mode enabled UI.

---

## ✨ Key Features

### 🛍️ Marketplace
* **Buy & Sell:** Users can list items with multiple images, descriptions, pricing, and specific categories (Books, Electronics, Cycles, etc.).
* **Search & Filter:** Live search functionality to find items instantly with history tracking.
* **Item Management:** Sellers can edit listings, mark items as "Sold", or delete them permanently.
* **Wishlist:** Users can save items to their personal wishlist for quick access later.

### 💬 Real-Time Communication
* **Socket.io Chat:** Instant messaging between buyers and sellers without refreshing.
* **Rich Media:** Support for sending images directly in the chat window.
* **Live Status:** Visual indicators to see when users are online.
* **Notifications:** Unread message counters and real-time toast notifications.

### 🔐 Security & Auth
* **Campus Verification:** Email verification restricted to college domains (e.g., `@mnnit.ac.in`) via OTP.
* **Secure Auth:** JWT-based authentication with Login, Signup, and secure Forgot Password flows.

### 🎨 UI/UX
* **Dark Mode:** Fully integrated dark mode toggle that persists across sessions.
* **Responsive Design:** Mobile-first approach using Tailwind CSS for a seamless experience on phones and desktops.
* **Image Cropping:** Built-in tool to crop profile and cover photos before uploading.
* **Interactive UI:** Smooth transitions, skeletons loaders, and optimistic UI updates.

---

## 🛠️ Tech Stack

**Frontend:**
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **State/Routing:** React Router DOM, React Hooks, Context API
* **Real-time:** Socket.io-client
* **Utilities:** Axios, React Toastify, React Easy Crop, Emoji Picker React, Lucide React

**Backend:**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose)
* **Real-time:** Socket.io
* **Authentication:** JWT (JSON Web Tokens) & Nodemailer (for OTPs)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
* Node.js (v14+)
* MongoDB (Local or Atlas URL)

### 1. Clone the Repository
```bash
git clone https://github.com/Ritesh-977/KampusCart.git
cd KampusCart
```
### 2. Backend Setup
Navigate to the server directory:
```Bash
cd server
npm install
npm run dev
```
Create a .env file in the server directory and add the following:
1. PORT=5000
2. MONGO_URI=your_mongodb_connection_string
3. JWT_SECRET=your_secret_key_here
4. EMAIL_USER=your_email_for_otp@gmail.com
5. EMAIL_PASS=your_email_app_password
6. CLOUDINARY_CLOUD_NAME=your_cloudinary_name
7. CLOUDINARY_API_KEY=your_cloudinary_api_key
8. CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
### 3. Frontend Setup
Open a new terminal and navigate to the client directory:

```Bash
cd client
npm install
npm run dev
```


   
