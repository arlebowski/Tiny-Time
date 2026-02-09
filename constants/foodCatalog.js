// Food Catalog for Solids Tracking
// Contains the emoji-based food list

const FOOD_CATEGORIES = {
  EMOJI: 'Emoji',
  FRUITS: 'Fruits',
  VEGETABLES: 'Vegetables',
  GRAINS: 'Grains / Starches',
  PROTEINS: 'Proteins',
  DAIRY: 'Dairy',
  NUTS_SEEDS: 'Nuts & Seeds'
};

const EMOJI_FOODS = [
  { id: 'apple', name: 'Apple', emoji: '🍎' },
  { id: 'avocado', name: 'Avocado', emoji: '🥑' },
  { id: 'bagel', name: 'Bagel', emoji: '🥯' },
  { id: 'banana', name: 'Banana', emoji: '🍌' },
  { id: 'beans', name: 'Beans', emoji: '🫘' },
  { id: 'bell-pepper', name: 'Bell Pepper', emoji: '🫑' },
  { id: 'blueberries', name: 'Blueberries', emoji: '🫐' },
  { id: 'bread', name: 'Bread', emoji: '🍞' },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦' },
  { id: 'carrot', name: 'Carrot', emoji: '🥕' },
  { id: 'cereal', name: 'Cereal', emoji: '🥣' },
  { id: 'cheese', name: 'Cheese', emoji: '🧀' },
  { id: 'chicken', name: 'Chicken', emoji: '🍗' },
  { id: 'corn', name: 'Corn', emoji: '🌽' },
  { id: 'cucumber', name: 'Cucumber', emoji: '🥒' },
  { id: 'egg', name: 'Egg', emoji: '🥚' },
  { id: 'french-fries', name: 'French Fries', emoji: '🍟' },
  { id: 'green-peas', name: 'Green Peas', emoji: '🫛' },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬' },
  { id: 'mango', name: 'Mango', emoji: '🥭' },
  { id: 'oatmeal', name: 'Oatmeal', emoji: '🥣' },
  { id: 'pasta', name: 'Pasta', emoji: '🍝' },
  { id: 'peach', name: 'Peach', emoji: '🍑' },
  { id: 'peanut-butter', name: 'Peanut Butter', emoji: '🥜' },
  { id: 'pear', name: 'Pear', emoji: '🍐' },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍' },
  { id: 'potato', name: 'Potato', emoji: '🥔' },
  { id: 'rice', name: 'Rice', emoji: '🍚' },
  { id: 'spinach', name: 'Spinach', emoji: '🍃' },
  { id: 'steak', name: 'Steak', emoji: '🥩' },
  { id: 'strawberries', name: 'Strawberries', emoji: '🍓' },
  { id: 'sweet-potato', name: 'Sweet Potato', emoji: '🍠' },
  { id: 'tomato', name: 'Tomato', emoji: '🍅' },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉' },
  { id: 'yogurt', name: 'Yogurt', emoji: '🥛' }
];

const COMMON_FOODS = EMOJI_FOODS.map((food) => ({
  ...food,
  category: FOOD_CATEGORIES.EMOJI
}));

// Create a flat map for quick lookups by ID
const FOOD_MAP = COMMON_FOODS.reduce((acc, food) => {
  acc[food.id] = food;
  return acc;
}, {});

// Get foods by category
const getFoodsByCategory = (category) => {
  return COMMON_FOODS.filter(food => food.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Get all foods sorted alphabetically
const getAllFoodsSorted = () => {
  return [...COMMON_FOODS].sort((a, b) => a.name.localeCompare(b.name));
};

// Get foods organized by category
const getFoodsByCategories = () => {
  const categoriesArray = Object.values(FOOD_CATEGORIES);
  return categoriesArray.map(category => ({
    category,
    foods: getFoodsByCategory(category)
  }));
};

// Search foods by name
const searchFoods = (query, customFoods = []) => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const allFoods = [...COMMON_FOODS, ...customFoods];
  return allFoods.filter(food =>
    food.name.toLowerCase().includes(normalizedQuery)
  );
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.constants = window.TT.constants || {};
  window.TT.constants.FOOD_CATEGORIES = FOOD_CATEGORIES;
  window.TT.constants.COMMON_FOODS = COMMON_FOODS;
  window.TT.constants.FOOD_MAP = FOOD_MAP;
  window.TT.constants.getFoodsByCategory = getFoodsByCategory;
  window.TT.constants.getAllFoodsSorted = getAllFoodsSorted;
  window.TT.constants.getFoodsByCategories = getFoodsByCategories;
  window.TT.constants.searchFoods = searchFoods;
}
