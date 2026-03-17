import React from "react";

const EMOJI_MAP: Record<string, string> = {
  sugar: "🍬",
  salt: "🧂",
  milk: "🥛",
  flour: "🌾",
  egg: "🥚",
  eggs: "🥚",
  butter: "🧈",
  oil: "🫒",
  beef: "🥩",
  pork: "🥩",
  chicken: "🍗",
  fish: "🐟",
  cheese: "🧀",
  cream: "🍶",
  chocolate: "🍫",
  honey: "🍯",
  nut: "🥜",
  peanut: "🥜",
  almond: "🌰",
  bread: "🍞",
  rice: "🍚",
  pasta: "🍝",
  potato: "🥔",
  tomato: "🍅",
  onion: "🧅",
  garlic: "🧄",
  carrot: "🥕",
  apple: "🍎",
  banana: "🍌",
  lemon: "🍋",
  water: "💧",
};

export function EmojiIcon({ name, className }: { name: string; className?: string }) {
  const normalized = name.toLowerCase();
  let emoji = "🥗"; // Default healthy fallback
  
  for (const [key, val] of Object.entries(EMOJI_MAP)) {
    if (normalized.includes(key)) {
      emoji = val;
      break;
    }
  }

  return (
    <span className={`inline-flex items-center justify-center bg-secondary/50 rounded-full aspect-square ${className || "w-12 h-12 text-2xl"}`}>
      {emoji}
    </span>
  );
}
