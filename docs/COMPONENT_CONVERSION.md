# Component Conversion Examples

## Basic Component Pattern

### Web Version (from your app)
```javascript
const TrackerCard = ({ title, icon, value, unit }) => {
  return React.createElement(
    'div',
    { className: 'bg-white rounded-2xl p-4 shadow-sm' },
    React.createElement(
      'div',
      { className: 'flex items-center justify-between' },
      React.createElement('span', { className: 'text-lg font-semibold' }, title)
    )
  );
};
```

### React Native Version
```javascript
import { View, Text, StyleSheet } from 'react-native';

const TrackerCard = ({ title, icon, value, unit }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
});
```

## Common Conversions

### Buttons
```javascript
// Web
<button className="bg-indigo-600 text-white px-4 py-2 rounded-xl">
  Click Me
</button>

// React Native
import { Pressable, Text } from 'react-native';

<Pressable 
  style={styles.button}
  onPress={handlePress}
>
  <Text style={styles.buttonText}>Click Me</Text>
</Pressable>

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#277dc4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Lists
```javascript
// Web - map over array
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}

// React Native - FlatList (better performance)
import { FlatList } from 'react-native';

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View>
      <Text>{item.name}</Text>
    </View>
  )}
/>
```

### Images
```javascript
// Web
<img src={photoURL} alt="Baby" className="w-12 h-12 rounded-full" />

// React Native
import { Image } from 'react-native';

<Image 
  source={{ uri: photoURL }}
  style={styles.avatar}
/>

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
```

## Migration Workflow for Each Component

1. **Copy the logic** (state, effects, handlers) - this usually works as-is
2. **Replace JSX elements**:
   - div → View
   - span/p → Text
   - button → Pressable
   - input → TextInput
3. **Convert styling** using TAILWIND_TO_RN.md
4. **Test on device**
5. **Refine**

