import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  RefreshControl, SafeAreaView, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import ItemCard from '../components/ItemCard';
import { colleges } from '../utils/colleges'; 
import { AuthContext } from '../context/AuthContext'; 

const CATEGORIES = ['All', 'Cycles', 'Electronics', 'Books & Notes', 'Hostel Essentials', 'Other'];

const HomeScreen = ({ navigation }) => {
  const { currentUser, isGuest, logout } = useContext(AuthContext); 

  // Safely get the initial campus
  const getInitialCampus = () => {
    if (isGuest || !currentUser || !currentUser.college) return colleges[0];
    const userCol = currentUser.college.toLowerCase();
    const match = colleges.find(c => {
      const cName = c.name.toLowerCase();
      const cShort = (c.shortName || "").toLowerCase();
      return cName === userCol || cName.includes(userCol) || userCol.includes(cName) || (cShort && userCol.includes(cShort));
    });
    return match || colleges[0];
  };

  const [activeCampus, setActiveCampus] = useState(getInitialCampus); 
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);

  // 🚀 THE FIX: Watch the currentUser and update the campus the second it loads
  useEffect(() => {
    if (!isGuest && currentUser && currentUser.college) {
      const userCol = currentUser.college.toLowerCase();
      const match = colleges.find(c => {
        const cName = c.name.toLowerCase();
        const cShort = (c.shortName || "").toLowerCase();
        return cName === userCol || cName.includes(userCol) || userCol.includes(cName) || (cShort && userCol.includes(cShort));
      });
      
      if (match && match.name !== activeCampus.name) {
        setActiveCampus(match);
      }
    }
  }, [currentUser, isGuest]); // This triggers when currentUser finishes loading

  const fetchItems = async () => {
    try {
      let url = `/items?college=${activeCampus.name}`;
      
      if (searchQuery) url += `&search=${searchQuery}`;
      if (activeCategory !== 'All') url += `&category=${activeCategory}`;

      const response = await API.get(url); 
      setItems(response.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchItems();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeCategory, activeCampus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const renderCollegeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.collegeItem}
      onPress={() => {
        setActiveCampus(item);
        setModalVisible(false);
      }}
    >
      <Text style={styles.collegeItemText}>{item.emoji} {item.name}</Text>
    </TouchableOpacity>
  );

  const userCampusName = currentUser?.college || '';
  const isWindowShopping = !isGuest && currentUser && activeCampus.name.toLowerCase() !== userCampusName.toLowerCase();

  return (
    <SafeAreaView style={styles.container}>
            
      <View style={styles.header}>
        <View style={styles.campusRow}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.headerTitle}>{activeCampus.emoji} {activeCampus.shortName || activeCampus.name}</Text>
            <Ionicons name="chevron-down" size={18} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.lostFoundBtn}
            onPress={() => navigation.navigate('LostFound')}
          >
            <Ionicons name="search" size={16} color="#f59e0b" />
            <Text style={styles.lostFoundBtnText}>Lost & Found</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeCampus.shortName || 'Campus'}...`}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.chip, activeCategory === cat && styles.activeChip]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.activeChipText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {isWindowShopping && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            👀 You are viewing <Text style={{fontWeight: 'bold', color: '#f59e0b'}}>{activeCampus.name}</Text>. Your home campus is <Text style={{fontWeight: 'bold', color: '#f59e0b'}}>{userCampusName}</Text>. You can browse, but cannot contact sellers here.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} />}
          renderItem={({ item }) => (
            <ItemCard 
              item={item} 
              onPress={() => {
                if (isGuest) {
                  Alert.alert(
                    "Login Required", 
                    "Please log in or create an account to view item details and contact the seller.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Log In / Sign Up", onPress: logout, style: "default" } 
                    ]
                  );
                } else {
                  const isOwner = !isGuest && currentUser &&
                    (item.seller === currentUser._id || item.seller?._id === currentUser._id);
                  navigation.navigate('ItemDetails', {
                    item,
                    activeCollege: activeCampus.name,
                    isOwner: !!isOwner,
                  });
                }
              }} 
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || activeCategory !== 'All' 
                  ? "No items match your search. Try clearing filters!" 
                  : `No items found at ${activeCampus.name} yet! 🚲`}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Window Shopping</Text>
            <Text style={{textAlign: 'center', color: '#6b7280', marginBottom: 15}}>Select a campus to see their local deals.</Text>
            <FlatList
              data={colleges.filter(c => c.emailDomain !== null)} 
              keyExtractor={(item) => item.id}
              renderItem={renderCollegeItem}
            />
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 45 : 10, paddingBottom: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  campusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  dropdownButton: { flexDirection: 'row', alignItems: 'center' },
  lostFoundBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#fde68a',
  },
  lostFoundBtnText: { fontSize: 12, color: '#92400e', fontWeight: '700', marginLeft: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1f2937', letterSpacing: -0.5, marginRight: 5 },
  searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1f2937' },
  chipsContainer: { flexDirection: 'row', marginBottom: 5 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  activeChip: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  activeChipText: { color: '#ffffff' },
  warningBanner: { backgroundColor: '#1f2937', padding: 12, marginHorizontal: 16, marginTop: 16, borderRadius: 8, borderWidth: 1, borderColor: '#4b5563' },
  warningText: { color: '#d1d5db', fontSize: 13, lineHeight: 20 },
  listContainer: { padding: 16 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9ca3af', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  collegeItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  collegeItemText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
  closeModalBtn: { marginTop: 20, padding: 15, backgroundColor: '#f3f4f6', borderRadius: 10, alignItems: 'center' },
  closeModalText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 }
});

export default HomeScreen;