# Theme Refactoring Guide for KampusCart Mobile App

## Overview
The mobile app now supports dynamic theming with two themes available:
- **Original Indigo** (default) - The original blue theme
- **Premium Gold** - A luxury gold/champagne theme

The theme toggle is located in the Profile menu. When switched, the entire app updates dynamically, and the preference persists across app restarts via AsyncStorage.

---

## Implementation Status

### ✅ Completed (Core Infrastructure)
1. **[ThemeContext.jsx](mobile/src/context/ThemeContext.jsx)** - Theme definitions and provider
2. **[App.js](mobile/App.js)** - ThemeProvider wrapper and dynamic theme injection
3. **[ProfileScreen.js](mobile/src/screens/ProfileScreen.js)** - Fully themified + toggle button
4. **[EditProfileScreen.js](mobile/src/screens/EditProfileScreen.js)** - Fully themified
5. **[useThemeStyles.js](mobile/src/hooks/useThemeStyles.js)** - Helper hook for styling

### ⏳ Remaining (24 screens to refactor)
- HomeScreen, LoginScreen, RegisterScreen, OTPVerificationScreen, ForgotPasswordScreen
- AllItemsScreen, ItemDetailsScreen, EditItemScreen, PostScreen/SellScreen
- WishlistScreen, ChatScreen, ChatListScreen
- LostFoundScreen, EventsScreen, EventDetailsScreen, PostEventScreen
- SportsScreen, SportDetailsScreen, PostSportScreen
- MaterialViewerScreen, AdminDashboardScreen
- And 3 more utility screens

---

## Refactoring Pattern: Step-by-Step Template

### For Every Screen, Follow This Pattern:

#### Step 1: Add Import
```javascript
import { useTheme } from '../context/ThemeContext';
// or if using the helper hook:
import { useThemeStyles } from '../hooks/useThemeStyles';
```

#### Step 2: Get Theme in Component
```javascript
const MyScreen = ({ route, navigation }) => {
  const { theme } = useTheme(); // ← Add this line
  // rest of your state...
};
```

#### Step 3: Replace Hardcoded Colors with Theme Properties

**Color Mapping Reference:**

| Use Case | Indigo Color | Theme Property | Gold Color |
|----------|--------------|---------------|------------|
| Screen background | `#0f172a` | `theme.background` | `#151411` |
| Card/container bg | `#1e293b` | `theme.card` | `#1c1b18` |
| Form/input background | `#1e293b` | `theme.inputBg` or `theme.card` | `#1c1b18` |
| Input border | `#334155` | `theme.inputBorder` | `#3d3c39` |
| Primary button/accent | `#4f46e5` | `theme.primaryAction` | `#AA7733` |
| Secondary accent | `#818cf8` | `theme.secondaryAction` | `#EECC77` |
| Main text | `#f1f5f9` | `theme.textMain` | `#FFFFFF` |
| Subtitle text | `#94a3b8` | `theme.textSub` | `#EECC77` |
| Light gray text | `#64748b` | `theme.textTertiary` | `#b0afa8` |
| Divider lines | `#334155` | `theme.inputBorder` | `#3d3c39` |
| Subtle accents | `#273549` | `theme.cardAccent` | `#2e2d29` |

#### Step 4: Examples of Replacements

**Before (Hardcoded):**
```javascript
<View style={{ flex: 1, backgroundColor: '#0f172a' }}>
  <Text style={{ color: '#f1f5f9', fontSize: 18, fontWeight: '700' }}>My Title</Text>
  <TextInput 
    style={{ 
      backgroundColor: '#1e293b', 
      borderColor: '#334155',
      color: '#f1f5f9'
    }} 
  />
  <TouchableOpacity style={{ backgroundColor: '#4f46e5' }}>
    <Text style={{ color: '#fff' }}>Save</Text>
  </TouchableOpacity>
</View>
```

**After (Using Theme):**
```javascript
<View style={{ flex: 1, backgroundColor: theme.background }}>
  <Text style={{ color: theme.textMain, fontSize: 18, fontWeight: '700' }}>My Title</Text>
  <TextInput 
    style={{ 
      backgroundColor: theme.inputBg, 
      borderColor: theme.inputBorder,
      color: theme.textMain,
      placeholderTextColor: theme.textTertiary
    }} 
    placeholder="Enter text"
  />
  <TouchableOpacity style={{ backgroundColor: theme.primaryAction }}>
    <Text style={{ color: '#fff' }}>Save</Text>
  </TouchableOpacity>
</View>
```

#### Step 5: Remove Old StyleSheet (When Converting to Inline)

If you're converting from `StyleSheet.create()` to inline styles:

**Before:**
```javascript
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  text: { color: '#f1f5f9', fontSize: 16 },
  button: { backgroundColor: '#4f46e5' },
});

// In component:
<View style={styles.container}>
  <Text style={styles.text}>Hello</Text>
</View>
```

**After:**
```javascript
// No StyleSheet needed - use inline styles with theme
<View style={{ flex: 1, backgroundColor: theme.background }}>
  <Text style={{ color: theme.textMain, fontSize: 16 }}>Hello</Text>
</View>
```

**OR Keep StyleSheet but Wrap in Function:**
```javascript
const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  text: { color: theme.textMain, fontSize: 16 },
  button: { backgroundColor: theme.primaryAction },
});

// In component:
const MyScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]); // Memoize for performance
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
};
```

---

## Quick Refactoring Checklist

For each screen, use this checklist:

- [ ] Add `import { useTheme } from '../context/ThemeContext';`
- [ ] Add `const { theme } = useTheme();` in component
- [ ] Find all hardcoded colors (`#0f172a`, `#1e293b`, `#4f46e5`, etc.)
- [ ] Replace with corresponding `theme.propertyName`
- [ ] Test: Switch theme in Profile menu → colors should update
- [ ] Test: Close and reopen app → theme preference should persist
- [ ] Verify: Both themes are readable and look good

---

## Priority Refactoring Order

**High Priority (Core Flows):**
1. HomeScreen - Browse/browse marketplace
2. LoginScreen + RegisterScreen - Auth flow
3. PostScreen/SellScreen - Create listings
4. ItemDetailsScreen - View item details

**Medium Priority (Secondary Features):**
5. WishlistScreen - Saved items
6. ChatScreen + ChatListScreen - Messaging
7. EventsScreen + EventDetailsScreen - Events
8. LostFoundScreen - Lost & found

**Lower Priority (Less Used):**
9. SportScreen, MaterialViewerScreen, AdminDashboard, etc.

---

## Troubleshooting

### Colors not updating when theme changes?
- Make sure you're importing from the correct ThemeContext path
- Verify `useTheme()` is being called in the component function
- Check that the component is wrapped by ThemeProvider (it should be from App.js)

### App crashes with "useTheme must be used within ThemeProvider"?
- This means the component is being used outside the ThemeProvider wrapper
- Verify App.js has ThemeProvider wrapping all child components
- Don't use theme outside of React components

### Performance issues after adding theme?
- Memoize expensive style calculations using `useMemo`
- Avoid creating new style objects on every render
- Use the `useThemeStyles` helper hook to memoize getStyles() calls

---

## Manual Testing Workflow

After refactoring each screen:

1. **Test Theme Toggle:**
   - Navigate to Profile (hamburger menu) → open menu → select "Theme"
   - Verify all colors change to the alternative theme
   - Check that text remains readable on both backgrounds

2. **Test Persistence:**
   - Toggle theme to Premium Gold
   - Close app completely (background kill)
   - Reopen app
   - Verify theme is still Premium Gold (not reset to Indigo)

3. **Test Consistency:**
   - Navigate through multiple screens
   - Toggle theme while on different screens
   - Verify all screens update colors consistently

4. **Accessibility Check:**
   - Check text contrast ratios on both themes
   - Ensure icons are visible on background colors
   - Test on different device sizes

---

## Useful Theme Properties

```javascript
// Core backgrounds
theme.background       // Main screen background
theme.card            // Card/container background
theme.formBackground  // Form container background

// Colors for interactive elements
theme.primaryAction    // Main buttons, prominent accents
theme.secondaryAction  // Secondary buttons, lighter accents
theme.primaryAccent    // Tab indicators, badges
theme.secondaryAccent  // Alternative accent color
theme.tertiaryAccent   // Tertiary action color

// Text colors
theme.textMain        // Primary text (headings, body)
theme.textBody        // Body text (same as textMain)
theme.textSub         // Subtitles, secondary text
theme.textTertiary    // Very light gray text
theme.textIndigo      // Indigo-specific text (original theme only)
theme.textGold        // Gold-specific text (premium theme only)

// UI Elements
theme.inputBg         // Input/text field backgrounds
theme.inputBorder     // Input field borders
theme.header          // Header background
theme.headerDivider   // Header divider color
theme.cardAccent      // Subtle dividers, accents within cards

// Status bar
theme.statusBarStyle  // 'light-content' or 'dark-content'
```

---

## Key Files Reference

- **Theme Definition:** [mobile/src/context/ThemeContext.jsx](mobile/src/context/ThemeContext.jsx)
- **Provider Wrapper:** [mobile/App.js](mobile/App.js)
- **Helper Hook:** [mobile/src/hooks/useThemeStyles.js](mobile/src/hooks/useThemeStyles.js)
- **Example Implementation:** [mobile/src/screens/ProfileScreen.js](mobile/src/screens/ProfileScreen.js)

---

## Next Steps

1. Follow the pattern above for remaining 24 screens
2. Prioritize HomeScreen, LoginScreen, and PostScreen first
3. Test each screen after refactoring with theme toggle + persistence
4. Once all screens are done, test full app flow with both themes

Done! Your app now has a professional dynamic theming system. 🎨✨
