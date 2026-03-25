import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Image, StatusBar, Alert,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useThemeStyles } from '../hooks/useThemeStyles'; // <-- Make sure path is correct

// ── PDF.js HTML template ──────────────────────────────────────────────────────
// Updated to accept the current theme's background and text colors
const buildPdfHtml = (pdfUrl, themeColors) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: ${themeColors.background}; width: 100%; overflow-x: hidden; }
    #container { display: flex; flex-direction: column; align-items: center; padding: 8px 4px; }
    canvas { display: block; width: 100%; margin-bottom: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.6); }
    #status {
      color: ${themeColors.textSub};
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px; padding: 60px 20px; text-align: center;
    }
    #progress {
      color: ${themeColors.primaryAccent};
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px; padding: 8px 20px; text-align: center;
    }
  </style>
</head>
<body>
  <div id="status">Loading PDF…</div>
  <div id="progress"></div>
  <div id="container"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const status    = document.getElementById('status');
    const progress  = document.getElementById('progress');
    const container = document.getElementById('container');
    const pdfUrl    = '${pdfUrl.replace(/'/g, "\\'")}';

    pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false }).promise
      .then(async (pdf) => {
        status.style.display = 'none';
        const total = pdf.numPages;
        for (let i = 1; i <= total; i++) {
          progress.textContent = 'Rendering page ' + i + ' of ' + total + '…';
          const page = await pdf.getPage(i);
          
          // 1. Calculate the base scale to fit the phone screen width
          const baseScale = (window.innerWidth - 8) / page.getViewport({ scale: 1 }).width;
          
          // 2. Get the phone's pixel density (usually 2 or 3 on modern phones)
          const pixelRatio = window.devicePixelRatio || 1;
          
          // 3. Render the PDF at the ultra-high physical resolution
          const viewport = page.getViewport({ scale: baseScale * pixelRatio });
          const canvas   = document.createElement('canvas');
          const ctx      = canvas.getContext('2d');
          
          // Set the internal canvas resolution to be huge
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          
          // 4. Use CSS to shrink the huge canvas back down to the screen size
          canvas.style.width  = (viewport.width / pixelRatio) + 'px';
          canvas.style.height = (viewport.height / pixelRatio) + 'px';
          
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        progress.style.display = 'none';
      })
      .catch((err) => {
        status.textContent = 'Failed to render PDF. Please try downloading instead.';
        status.style.color = '#ef4444'; // Keep semantic red for error
        progress.style.display = 'none';
      });
  </script>
</body>
</html>
`;

// ── Component ─────────────────────────────────────────────────────────────────
const MaterialViewerScreen = ({ navigation, route }) => {
  // 1. Initialize dynamic theme hook
  const { styles, colors } = useThemeStyles(createStyles);

  const { title, fileUrl, fileType } = route.params;

  const [webLoading, setWebLoading]   = useState(true);
  const [webError, setWebError]       = useState(false);
  const [imgLoading, setImgLoading]   = useState(true);
  const [imgError, setImgError]       = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);

      const ext      = fileType === 'pdf' ? 'pdf' : 'jpg';
      const safeName = (title || 'Document').replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim();
      const fileName = `${safeName}.${ext}`;
      const localUri = FileSystem.cacheDirectory + fileName;

      // Download directly from the clean Cloudinary URL
      const { status } = await FileSystem.downloadAsync(fileUrl, localUri);
      
      if (status !== 200) throw new Error(`Download failed with status ${status}`);

      // Open native share/save sheet
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, {
          mimeType: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
          dialogTitle: `Save "${title || 'Document'}"`,
          UTI: fileType === 'pdf' ? 'com.adobe.pdf' : 'public.jpeg',
        });
      } else {
        Alert.alert('Saved', `File saved to: ${localUri}`);
      }
    } catch (e) {
      const detail = e?.message || String(e);
      Alert.alert('Download Failed', `Could not download the file.\n\n${detail}`);
    } finally {
      setDownloading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.header} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Document'}</Text>

        {/* Download button */}
        <TouchableOpacity
          style={[styles.iconBtn, styles.downloadBtn, downloading && styles.downloadBtnActive]}
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading
            ? <ActivityIndicator size="small" color={colors.textOnPrimary || '#ffffff'} />
            : <Ionicons name="download-outline" size={20} color={colors.textOnPrimary || '#ffffff'} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Image viewer ── */}
      {fileType === 'image' ? (
        <View style={styles.imageContainer}>
          {imgLoading && (
            <ActivityIndicator size="large" color={colors.primaryAccent} style={StyleSheet.absoluteFill} />
          )}
          {imgError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={styles.errorTitle}>Could not load image</Text>
              <Text style={styles.errorSub}>Try downloading it instead.</Text>
            </View>
          ) : (
            <Image
              source={{ uri: fileUrl }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgLoading(false); setImgError(true); }}
            />
          )}
        </View>

      ) : (
        /* ── PDF viewer (PDF.js in WebView) ── */
        <View style={styles.webviewContainer}>
          {webLoading && !webError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primaryAccent} />
              <Text style={styles.loadingText}>Loading PDF…</Text>
            </View>
          )}

          {webError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="document-outline" size={48} color="#ef4444" />
              <Text style={styles.errorTitle}>Could not render PDF</Text>
              <Text style={styles.errorSub}>
                Tap the download button above to save and open with a PDF app.
              </Text>
            </View>
          ) : (
            <WebView
              // Passing colors object into HTML builder to adapt webview background and text
              source={{ html: buildPdfHtml(fileUrl, colors), baseUrl: 'https://res.cloudinary.com' }}
              style={styles.webview}
              onLoadEnd={() => setWebLoading(false)}
              onError={() => { setWebLoading(false); setWebError(true); }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
              allowFileAccess
              allowUniversalAccessFromFileURLs
              allowFileAccessFromFileURLs
              allowsFullscreenVideo={false}
              scrollEnabled
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default MaterialViewerScreen;

// ─── Theme-Aware Style Generator ─────────────────────────────────────────────
const createStyles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 10,
    marginTop: Platform.OS === 'ios' ? 40 : 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.headerDivider,
    backgroundColor: theme.header,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: theme.textMain,
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  downloadBtn: {
    backgroundColor: theme.primaryAction,
    borderRadius: 20,
  },
  downloadBtnActive: {
    opacity: 0.7,
  },

  // Image viewer
  imageContainer: {
    flex: 1,
    backgroundColor: theme.background, // Used standard theme background instead of pure black for better integration
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },

  // WebView (PDF.js)
  webviewContainer: { flex: 1 },
  webview:          { flex: 1, backgroundColor: theme.background },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: { color: theme.textSub, fontSize: 14 },

  // Shared error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: { color: theme.textMain, fontSize: 17, fontWeight: '700', marginTop: 8 },
  errorSub:   { color: theme.textSub, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});