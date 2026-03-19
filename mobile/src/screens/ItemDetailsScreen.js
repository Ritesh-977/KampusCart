import React, { useState } from 'react';
import { 
  View, Text, Image, StyleSheet, ScrollView, 
  TouchableOpacity, SafeAreaView, Alert, Linking, ActivityIndicator, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';

// 🚀 Grab the screen width so our images fit perfectly
const { width } = Dimensions.get('window');

const ItemDetailsScreen = ({ route, navigation }) => {
  const { item, activeCollege, isOwner } = route.params;

  const [isSold, setIsSold] = useState(item.isSold || false);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // 🚀 Track which image the user is currently looking at
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isLocalCampus = item.college === activeCollege;

  // --- WHATSAPP LOGIC ---
  const handleWhatsAppClick = async () => {
    if (!isLocalCampus) {
      Alert.alert("Window Shopping", `You can only buy items from your home campus. This item is at ${item.college}.`);
      return;
    }

    if (!item.contactNumber) {
      Alert.alert("No Contact Info", "The seller didn't provide a phone number.");
      return;
    }

    let phone = item.contactNumber.replace(/\D/g, ''); 
    if (phone.length === 10) phone = '91' + phone; 

    const message = `Hi! I saw your ad for "${item.title}" (₹${item.price}) on KampusCart. Is it still available?`;
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert("WhatsApp Missing", "Please install WhatsApp to contact this seller.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not open WhatsApp.");
    }
  };

  // --- DELETE LOGIC ---
  const handleDelete = () => {
    Alert.alert("Delete Listing", "Are you sure you want to permanently delete this item?", [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoadingAction(true);
              await API.delete(`/items/${item._id}`);
              Alert.alert("Deleted", "Your listing has been removed.");
              navigation.navigate('Profile'); 
            } catch (error) {
              Alert.alert("Error", "Failed to delete item.");
            } finally {
              setLoadingAction(false);
            }
          }
        }
      ]
    );
  };

  // --- TOGGLE SOLD LOGIC ---
  const handleToggleSold = async () => {
    try {
      setLoadingAction(true);
      const response = await API.patch(`/items/${item._id}/status`);
      setIsSold(response.data.isSold); 
    } catch (error) {
      Alert.alert("Error", "Failed to update item status.");
    } finally {
      setLoadingAction(false);
    }
  };

  // 🚀 Handles updating the dots when the user swipes
  const onScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentImageIndex(Math.round(index));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* 🚀 IMAGE CAROUSEL SECTION */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll} // Triggers when the swipe animation stops
          >
            {item.images && item.images.length > 0 ? (
              item.images.map((img, index) => (
                <Image 
                  key={index} 
                  source={{ uri: img.url || img }} // Handle both object and string formats
                  style={styles.image} 
                />
              ))
            ) : (
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1588508065123-287b28e0141c?w=400&q=80' }} 
                style={styles.image} 
              />
            )}
          </ScrollView>

          {/* 🚀 PAGINATION DOTS (Only show if there is more than 1 image) */}
          {item.images && item.images.length > 1 && (
            <View style={styles.paginationContainer}>
              {item.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentImageIndex === index ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>
          )}

          {/* Dynamic SOLD Badge overlay */}
          {isSold && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldBadgeText}>SOLD OUT</Text>
            </View>
          )}
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isSold && { textDecorationLine: 'line-through', color: '#9ca3af' }]}>
              {item.title}
            </Text>
            <Text style={styles.price}>₹{item.price}</Text>
          </View>

          <Text style={styles.category}>{item.category || 'General'}</Text>
          
          <View style={styles.locationCard}>
            <Text style={styles.locationText}>📍 Posted at {item.college}</Text>
            <Text style={styles.timeText}>Listed on {new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {item.description || "No description provided by the seller."}
          </Text>
        </View>
      </ScrollView>

      {/* --- DYNAMIC BOTTOM BAR --- */}
      <View style={styles.bottomBar}>
        {isOwner ? (
          <View style={styles.ownerControls}>
             <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete} disabled={loadingAction}>
               <Ionicons name="trash-outline" size={20} color="#ffffff" />
               <Text style={styles.btnText}>Delete</Text>
             </TouchableOpacity>

             <TouchableOpacity style={[styles.actionBtn, isSold ? styles.availableBtn : styles.soldBtn]} onPress={handleToggleSold} disabled={loadingAction}>
               {loadingAction ? (
                 <ActivityIndicator color="#fff" />
               ) : (
                 <>
                   <Ionicons name={isSold ? "refresh-outline" : "checkmark-circle-outline"} size={20} color="#ffffff" />
                   <Text style={styles.btnText}>{isSold ? "Mark Available" : "Mark Sold"}</Text>
                 </>
               )}
             </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.contactButton, (!isLocalCampus || isSold) && styles.contactButtonDisabled]} 
            onPress={handleWhatsAppClick}
            disabled={!isLocalCampus || isSold} 
          >
            <Ionicons name="logo-whatsapp" size={24} color="#ffffff" style={{ marginRight: 10 }} />
            <Text style={styles.contactButtonText}>
              {isSold ? "Item Sold" : isLocalCampus ? "Chat on WhatsApp" : "Locked (View Only)"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1 },
  
  // 🚀 Carousel Styles
  carouselContainer: { width: width, height: 350, backgroundColor: '#f3f4f6' },
  image: { width: width, height: 350, resizeMode: 'cover' },
  paginationContainer: {
    position: 'absolute',
    bottom: 15,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  activeDot: { backgroundColor: '#ffffff', width: 10, height: 10 },
  inactiveDot: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },

  soldBadge: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(239, 68, 68, 0.9)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  soldBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  detailsContainer: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', flex: 1, marginRight: 10 },
  price: { fontSize: 28, fontWeight: '900', color: '#4f46e5' },
  category: { fontSize: 14, color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 20 },
  locationCard: { backgroundColor: '#f3f4f6', padding: 15, borderRadius: 10, marginBottom: 25 },
  locationText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 5 },
  timeText: { fontSize: 14, color: '#6b7280' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  description: { fontSize: 16, color: '#4b5563', lineHeight: 24, marginBottom: 30 },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  contactButton: { flexDirection: 'row', backgroundColor: '#25D366', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactButtonDisabled: { backgroundColor: '#9ca3af' }, 
  contactButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },

  ownerControls: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, flexDirection: 'row', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 5 },
  deleteBtn: { backgroundColor: '#ef4444' }, 
  soldBtn: { backgroundColor: '#4f46e5' }, 
  availableBtn: { backgroundColor: '#10b981' }, 
  btnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});

export default ItemDetailsScreen;