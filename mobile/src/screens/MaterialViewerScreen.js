import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Image, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const MaterialViewerScreen = ({ navigation, route }) => {
  const { title, fileUrl, fileType } = route.params;

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  // Google Docs viewer wraps any public PDF URL into a browser-renderable page
  const viewerUrl = fileType === 'pdf'
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : fileUrl;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {fileType === 'image' ? (
        <View style={styles.imageContainer}>
          {loading && (
            <ActivityIndicator size="large" color="#818cf8" style={StyleSheet.absoluteFill} />
          )}
          <Image
            source={{ uri: fileUrl }}
            style={styles.image}
            resizeMode="contain"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
          {error && <Text style={styles.errorText}>Could not load image.</Text>}
        </View>
      ) : (
        <View style={styles.webviewContainer}>
          {loading && !error && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#818cf8" />
              <Text style={styles.loadingText}>Loading PDF…</Text>
            </View>
          )}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={styles.errorTitle}>Could not load PDF</Text>
              <Text style={styles.errorSub}>Try pulling to refresh or check your connection.</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setError(false); setLoading(true); }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              source={{ uri: viewerUrl }}
              style={styles.webview}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 400) {
                  setLoading(false);
                  setError(true);
                }
              }}
              startInLoadingState={false}
              javaScriptEnabled
              domStorageEnabled
              allowsFullscreenVideo={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default MaterialViewerScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginHorizontal: 8 },

  // Image viewer
  imageContainer: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  image:          { width: '100%', height: '100%' },

  // WebView / PDF
  webviewContainer: { flex: 1 },
  webview:          { flex: 1, backgroundColor: '#0f172a' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: { color: '#94a3b8', fontSize: 14 },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '700', marginTop: 8 },
  errorSub:   { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText:  { color: '#ef4444', fontSize: 14, position: 'absolute' },

  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: '#818cf8',
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
