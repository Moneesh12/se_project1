const RAW_WHOLE_FOODS = new Set([
  "apple", "banana", "orange", "lemon", "lime", "grape", "strawberry",
  "blueberry", "raspberry", "blackberry", "cherry", "peach", "pear", "plum",
  "apricot", "mango", "pineapple", "watermelon", "kiwi", "grapefruit",
  "avocado", "coconut", "fig", "date",
  "spinach", "kale", "lettuce", "cabbage", "broccoli", "cauliflower",
  "asparagus", "green bean", "pea", "corn", "carrot", "celery", "cucumber",
  "tomato", "bell pepper", "zucchini", "squash", "pumpkin", "sweet potato",
  "potato", "onion", "garlic", "ginger", "turmeric", "radish", "beet",
  "eggplant", "mushroom", "artichoke", "okra",
  "basil", "oregano", "thyme", "rosemary", "sage", "mint", "cilantro", "parsley",
  "dill", "chives", "cinnamon", "nutmeg", "clove", "cumin", "coriander",
  "paprika", "cayenne", "black pepper", "white pepper", "salt", "sea salt",
  "chicken", "turkey", "beef", "steak", "pork", "lamb",
  "salmon", "tuna", "cod", "tilapia", "shrimp",
  "egg", "eggs", "egg white",
  "rice", "brown rice", "white rice", "quinoa", "oats", "barley",
  "lentil", "chickpea", "black bean", "kidney bean", "pinto bean",
  "almond", "walnut", "cashew", "pecan", "peanut", "hazelnut",
  "sunflower seed", "pumpkin seed", "sesame seed", "chia seed", "flax seed",
  "broccoli", "cauliflower",
]);

export function isBrandedCategory(ingredientName: string): boolean {
  const normalized = ingredientName.toLowerCase().trim();
  if (RAW_WHOLE_FOODS.has(normalized)) return false;
  if (normalized.length < 3) return false;
  return true;
}
