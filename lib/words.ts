export interface WordEntry {
  word: string;
  hint: string;
  category: string;
}

const WORD_DATA: { category: string; hint: string; words: string[] }[] = [
  {
    category: "Fruits",
    hint: "A type of fruit",
    words: ["Apple", "Banana", "Mango", "Strawberry", "Watermelon", "Pineapple", "Grape", "Cherry", "Peach", "Blueberry", "Lemon", "Orange", "Kiwi", "Papaya", "Coconut"],
  },
  {
    category: "Animals",
    hint: "A type of animal",
    words: ["Elephant", "Tiger", "Dolphin", "Eagle", "Penguin", "Gorilla", "Giraffe", "Cheetah", "Wolf", "Shark", "Octopus", "Kangaroo", "Panda", "Polar Bear", "Flamingo"],
  },
  {
    category: "Countries",
    hint: "A country",
    words: ["Japan", "Brazil", "Australia", "France", "Canada", "Mexico", "India", "Egypt", "Norway", "Argentina", "South Korea", "Thailand", "New Zealand", "Portugal", "Kenya"],
  },
  {
    category: "Sports",
    hint: "A sport or physical activity",
    words: ["Soccer", "Basketball", "Tennis", "Swimming", "Volleyball", "Boxing", "Wrestling", "Skiing", "Surfing", "Cycling", "Golf", "Baseball", "Rugby", "Gymnastics", "Archery"],
  },
  {
    category: "Food",
    hint: "A type of food or dish",
    words: ["Pizza", "Sushi", "Tacos", "Pasta", "Burger", "Ramen", "Curry", "Pancakes", "Steak", "Croissant", "Dumplings", "Lasagna", "Paella", "Pho", "Nachos"],
  },
  {
    category: "Technology",
    hint: "Something related to technology",
    words: ["Smartphone", "Laptop", "Keyboard", "Headphones", "Camera", "Drone", "Robot", "Satellite", "Microchip", "Password", "Browser", "Algorithm", "Bluetooth", "Podcast", "USB"],
  },
  {
    category: "Movies",
    hint: "A popular movie",
    words: ["Titanic", "Inception", "Avatar", "Gladiator", "Interstellar", "Parasite", "Joker", "Gravity", "Dune", "Matrix", "Avengers", "Frozen", "Coco", "Up", "Alien"],
  },
  {
    category: "Places",
    hint: "A type of place or location",
    words: ["Beach", "Mountain", "Library", "Airport", "Hospital", "Stadium", "Museum", "Lighthouse", "Castle", "Farm", "Volcano", "Desert", "Jungle", "Waterfall", "Subway"],
  },
  {
    category: "Occupations",
    hint: "A job or profession",
    words: ["Astronaut", "Chef", "Firefighter", "Doctor", "Pilot", "Architect", "Lawyer", "Teacher", "Scientist", "Photographer", "Musician", "Detective", "Engineer", "Journalist", "Surgeon"],
  },
  {
    category: "Vehicles",
    hint: "A type of vehicle",
    words: ["Helicopter", "Submarine", "Motorcycle", "Skateboard", "Bicycle", "Tank", "Yacht", "Tractor", "Ambulance", "Rocket", "Cable Car", "Hovercraft", "Zeppelin", "Snowmobile", "Jet Ski"],
  },
  {
    category: "Music",
    hint: "Something related to music",
    words: ["Guitar", "Piano", "Violin", "Drums", "Microphone", "Concert", "Album", "Melody", "Bass", "Opera", "Jazz", "Orchestra", "Remix", "Vinyl", "Chorus"],
  },
  {
    category: "Nature",
    hint: "Something found in nature",
    words: ["Tornado", "Rainbow", "Glacier", "Thunderstorm", "Eclipse", "Aurora", "Avalanche", "Tide", "Earthquake", "Meteor", "Canyon", "Reef", "Geyser", "Swamp", "Tundra"],
  },
  {
    category: "Pop Culture",
    hint: "A pop culture reference",
    words: ["TikTok", "Meme", "Streamer", "Podcast", "Influencer", "Viral", "NFT", "Cosplay", "Selfie", "Hashtag", "Unboxing", "Reels", "Trending", "Binge-watch", "Fan Fiction"],
  },
  {
    category: "Everyday Objects",
    hint: "An everyday object",
    words: ["Mirror", "Umbrella", "Scissors", "Candle", "Wallet", "Alarm Clock", "Toothbrush", "Backpack", "Lamp", "Pillow", "Calendar", "Gloves", "Compass", "Thermometer", "Magnifying Glass"],
  },
  {
    category: "Drinks",
    hint: "A type of drink or beverage",
    words: ["Coffee", "Lemonade", "Smoothie", "Milkshake", "Tea", "Espresso", "Champagne", "Mojito", "Hot Chocolate", "Energy Drink", "Matcha", "Kombucha", "Sparkling Water", "Cider", "Lassi"],
  },
];

export function getRandomWord(): WordEntry {
  const category = WORD_DATA[Math.floor(Math.random() * WORD_DATA.length)];
  const word = category.words[Math.floor(Math.random() * category.words.length)];
  return { word, hint: category.hint, category: category.category };
}
