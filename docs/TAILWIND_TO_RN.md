# Tailwind CSS → React Native StyleSheet

## Layout & Flexbox

| Tailwind | React Native StyleSheet |
|----------|------------------------|
| `flex` | `display: 'flex'` (default for View) |
| `flex-row` | `flexDirection: 'row'` |
| `flex-col` | `flexDirection: 'column'` (default) |
| `items-center` | `alignItems: 'center'` |
| `items-start` | `alignItems: 'flex-start'` |
| `justify-center` | `justifyContent: 'center'` |
| `justify-between` | `justifyContent: 'space-between'` |
| `gap-4` | `gap: 16` |
| `flex-1` | `flex: 1` |

## Spacing

| Tailwind | RN StyleSheet | Notes |
|----------|---------------|-------|
| `p-4` | `padding: 16` | Tailwind: 4 = 16px |
| `px-4` | `paddingHorizontal: 16` | |
| `py-2` | `paddingVertical: 8` | |
| `m-4` | `margin: 16` | |
| `mt-2` | `marginTop: 8` | |

**Spacing scale (Tailwind → RN):**
- 1 → 4
- 2 → 8
- 3 → 12
- 4 → 16
- 5 → 20
- 6 → 24
- 8 → 32

## Typography

| Tailwind | RN StyleSheet |
|----------|---------` | `fontSize: 14` |
| `text-base` | `fontSize: 16` |
| `text-lg` | `fontSize: 18` |
| `text-xl` | `fontSize: 20` |
| `text-2xl` | `fontSize: 24` |
| `font-medium` | `fontWeight: '500'` |
| `font-semibold` | `fontWeight: '600'` |
| `font-bold` | `fontWeight: '700'` |
| `text-center` | `textAlign: 'center'` |

## Colors (Use Your Theme Tokens)

Instead of Tailwind color classes, import from shared theme:
```javascript
import { getThemeColors } from '../../shared/config/theme';

const colors = getThemeColors(false, 'theme1'); // isDark, themeKey

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
  },
  text: {
    color: colors.textPrimary,
  },
});
```

## Borders & Radius

| Tailwind | RN StyleSheet |
|----------|---------------|
| `rounded-xl` | `borderRadius: 12` |
| `rounded-2xl` | `borderRadius: 16` |
| `rounded-full` | `borderRadius: 9999` (or half of width/height) |
| `border` | `borderWidth: 1` |
| `border-gray-200` | `borderColor: '#EBEBEB'` |

## Shadows

Tailwind shadows → Platform-specific shadows:
```javascript
// iOS
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,

// Android
elevation: 3,
```

## Width & Height

| Tailwind | RN StyleSheet |
|----------|---------------|
| `w-full` | `width: '100%'` |
| `w-12` | `width: 48` |
| `h-12` | `height: 48` |
| `min-h-screen` | `minHeight: Dimensions.get('window').height` |

## Position

| Tailwind | RN StyleSheet |
|----------|---------------|
| `absolute` | `position: 'absolute'` |
| `relative` | `position: 'relative'` |
| `top-0` | `top: 0` |
| `right-4` | `right: 16` |

## Example: Full Component Conversion

**Web (Tailwind):**
```javascript
<div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
  <span className="text-lg font-semibold text-gray-900">Bottle</span>
  <span className="text-sm text-gray-500">3h ago</span>
</div>
```

**React Native (StyleSheet):**
```javascript
<View style={styles.card}>
  <Text style={styles.title}>Bottle</Tt>
  <Text style={styles.subtitle}>3h ago</Text>
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#9E9E9E',
  },
});
```

