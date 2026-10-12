// DiceBear v9 API configuration and curated presets

export const AVATAR_CATEGORIES = [
  { id: 'all', label: 'All Avatars' },
  { id: 'adventurer', label: 'Students' },
  { id: 'lorelei', label: 'Illustrated' },
  { id: 'bottts', label: 'Robots' },
  { id: 'notionists', label: 'Minimal' },
  { id: 'thumbs', label: 'Playful' },
];

export const AVATAR_PRESETS = [
  // Students (Adventurer)
  { id: 'adv-1', style: 'adventurer', seed: 'Felix', label: 'Felix' },
  { id: 'adv-2', style: 'adventurer', seed: 'Aneka', label: 'Aneka' },
  { id: 'adv-3', style: 'adventurer', seed: 'Milo', label: 'Milo' },
  { id: 'adv-4', style: 'adventurer', seed: 'Aria', label: 'Aria' },
  { id: 'adv-5', style: 'adventurer', seed: 'Leo', label: 'Leo' },
  { id: 'adv-6', style: 'adventurer', seed: 'Zoe', label: 'Zoe' },
  { id: 'adv-7', style: 'adventurer', seed: 'Jasper', label: 'Jasper' },
  { id: 'adv-8', style: 'adventurer', seed: 'Maya', label: 'Maya' },

  // Illustrated (Lorelei)
  { id: 'lor-1', style: 'lorelei', seed: 'Alexander', label: 'Alex' },
  { id: 'lor-2', style: 'lorelei', seed: 'Sarah', label: 'Sarah' },
  { id: 'lor-3', style: 'lorelei', seed: 'Brian', label: 'Brian' },
  { id: 'lor-4', style: 'lorelei', seed: 'Jessica', label: 'Jessica' },
  { id: 'lor-5', style: 'lorelei', seed: 'Liam', label: 'Liam' },
  { id: 'lor-6', style: 'lorelei', seed: 'Sophia', label: 'Sophia' },
  { id: 'lor-7', style: 'lorelei', seed: 'Noah', label: 'Noah' },
  { id: 'lor-8', style: 'lorelei', seed: 'Olivia', label: 'Olivia' },

  // Robots (Bottts)
  { id: 'bot-1', style: 'bottts', seed: 'Gizmo', label: 'Gizmo' },
  { id: 'bot-2', style: 'bottts', seed: 'Spark', label: 'Spark' },
  { id: 'bot-3', style: 'bottts', seed: 'Buster', label: 'Buster' },
  { id: 'bot-4', style: 'bottts', seed: 'Cosmo', label: 'Cosmo' },
  { id: 'bot-5', style: 'bottts', seed: 'Circuit', label: 'Circuit' },
  { id: 'bot-6', style: 'bottts', seed: 'Pixel', label: 'Pixel' },
  { id: 'bot-7', style: 'bottts', seed: 'Bolt', label: 'Bolt' },
  { id: 'bot-8', style: 'bottts', seed: 'Titan', label: 'Titan' },

  // Minimal (Notionists)
  { id: 'not-1', style: 'notionists', seed: 'Aiden', label: 'Aiden' },
  { id: 'not-2', style: 'notionists', seed: 'Riley', label: 'Riley' },
  { id: 'not-3', style: 'notionists', seed: 'Taylor', label: 'Taylor' },
  { id: 'not-4', style: 'notionists', seed: 'Jordan', label: 'Jordan' },
  { id: 'not-5', style: 'notionists', seed: 'Morgan', label: 'Morgan' },
  { id: 'not-6', style: 'notionists', seed: 'Sam', label: 'Sam' },

  // Playful (Thumbs)
  { id: 'thu-1', style: 'thumbs', seed: 'Happy', label: 'Happy' },
  { id: 'thu-2', style: 'thumbs', seed: 'Sunny', label: 'Sunny' },
  { id: 'thu-3', style: 'thumbs', seed: 'Chirpy', label: 'Chirpy' },
  { id: 'thu-4', style: 'thumbs', seed: 'Lucky', label: 'Lucky' },
];

export const buildDiceBearUrl = (style, seed) => {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
};

export const generateRandomAvatars = (category = 'all', count = 12) => {
  const styles = category === 'all' 
    ? ['adventurer', 'lorelei', 'bottts', 'notionists', 'thumbs']
    : [category];

  const randomAvatars = [];
  for (let i = 0; i < count; i++) {
    const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomSeed = Math.random().toString(36).substring(2, 9);
    randomAvatars.push({
      id: `rnd-${i}-${Date.now()}`,
      style: chosenStyle,
      seed: randomSeed,
      label: `Avatar ${i + 1}`,
      url: buildDiceBearUrl(chosenStyle, randomSeed)
    });
  }
  return randomAvatars;
};
