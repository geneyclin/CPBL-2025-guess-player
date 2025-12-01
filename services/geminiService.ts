import { GoogleGenAI } from "@google/genai";
import { PlayerData, StatItem } from '../types';
import { CPBL_TEAMS } from '../constants';

// Define the exact display order for stats based on Rebas.tw UI
const PITCHER_STAT_ORDER = [
  "ERA", "FIP", "AVG", "BABIP", "LOB%", "Whiff%", "K%", "BB%", "GB%"
];

const BATTER_STAT_ORDER = [
  "wOBA", "AVG", "SLG", "OBP", "OPS", "ISO", "BABIP", "Whiff%", "K%", "BB%"
];

const sortStats = (stats: StatItem[], type: 'batter' | 'pitcher'): StatItem[] => {
  // Safety check: ensure stats is an array
  if (!Array.isArray(stats)) return [];

  const order = type === 'pitcher' ? PITCHER_STAT_ORDER : BATTER_STAT_ORDER;
  
  // Create a map for O(1) lookup of order index
  const orderMap = new Map(order.map((label, index) => [label.toLowerCase(), index]));

  return stats
    .filter(stat => stat && typeof stat.label === 'string') // Filter out invalid items
    .sort((a, b) => {
      // Normalize labels to handle minor case variations (e.g. k% vs K%)
      const labelA = a.label?.toLowerCase() || "";
      const labelB = b.label?.toLowerCase() || "";
      
      const indexA = orderMap.get(labelA);
      const indexB = orderMap.get(labelB);

      // If both are in the known list, sort by index
      if (indexA !== undefined && indexB !== undefined) {
        return indexA - indexB;
      }

      // If one is known and the other isn't, put the known one first
      if (indexA !== undefined) return -1;
      if (indexB !== undefined) return 1;

      // If neither is known, keep original order (or sort alphabetically)
      return 0;
    });
};

// Robust JSON extraction helper
const extractJSON = (text: string): any => {
  try {
    // 1. Try parsing the whole text directly
    return JSON.parse(text);
  } catch (e) {
    // 2. Try parsing from markdown block
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch (e2) {
        // continue
      }
    }
    
    // 3. Try finding the first '{' and last '}' to isolate JSON object
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const potentialJson = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(potentialJson);
      } catch (e3) {
        // continue
      }
    }
    
    console.error("Failed to extract JSON from text:", text);
    throw new Error("Could not extract valid JSON from response");
  }
};

export const fetchRandomPlayerData = async (): Promise<PlayerData> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Randomly select parameters to ensure variety without a local DB
    const randomTeam = CPBL_TEAMS[Math.floor(Math.random() * CPBL_TEAMS.length)];
    const randomType = Math.random() > 0.5 ? 'pitcher' : 'batter';
    
    // Using gemini-2.5-flash for speed and search capability
    const model = "gemini-2.5-flash"; 
    
    // Prompt to find a RANDOM player from the web
    const prompt = `
      Act as a Data Extraction API.
      Task: Find a random *qualified* (符合進榜資格) active CPBL (Chinese Professional Baseball League) player from the team "${randomTeam}" who is a ${randomType}.
      Use Google Search to find their stats for the **2025** regular season on 'rebas.tw' (野球革命).
      
      CRITICAL REQUIREMENT:
      1. **YEAR: 2025 ONLY**. Do NOT return 2024 or career stats.
      2. The player MUST be "qualified" for the 2025 leaderboard (符合2025進榜資格). 
         - Pitchers: IP (投球局數) approx >= Team Games.
         - Batters: PA (打席) approx >= 3.1 * Team Games.
      
      Do NOT use a hardcoded example. Pick a player effectively at random from the qualified roster/leaderboard.
      
      Return a VALID JSON object representing the player's performance.
      The JSON must match this structure:
      {
        "name": "Player Name (Traditional Chinese)",
        "team": "${randomTeam}",
        "type": "${randomType}",
        "year": "2025",
        "stats": [
          { "label": "Stat Name", "value": "Stat Value (string or number)", "pr": Number (0-99) }
        ],
        "sprayChart": [ // REQUIRED if batter. Generate ~20 realistic points based on 2025 hitting tendency.
          { "x": Number (-100 to 100), "y": Number (0 to 120), "type": "1B"|"2B"|"3B"|"HR"|"FO" }
        ],
        "pitchDistribution": [ // REQUIRED if pitcher. Generate realistic distribution for their 2025 pitch types.
          { "type": "Pitch Name", "mean": Number (speed in kph), "data": [{"speed": Number, "count": Number}] }
        ]
      }

      REQUIRED STATS (Use these specific column names to ensure accuracy):
      If Pitcher: 
        ERA (防禦率), FIP (場內自責分率), AVG (被打擊率), BABIP (被場內打擊率), 
        LOB% (殘壘率), Whiff% (揮空率), K% (奪三振率), BB% (保送率), GB% (滾地球率).
      If Batter: 
        wOBA (加權上壘率), AVG (打擊率), SLG (長打率), OBP (上壘率), 
        OPS (攻擊指數), ISO (純長打率), BABIP (場內球打擊率), 
        Whiff% (揮空率), K% (被三振率), BB% (保送率).

      IMPORTANT: 
      - Provide the 'pr' (Percentile Rank) for each stat. 
      - Ensure values are accurate for the **2025** season. 
      - Return ONLY the JSON object. Do not add conversational text or explanations.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType: 'application/json' is NOT supported with googleSearch
      }
    });

    // Parse the response using robust helper
    const text = response.text || "";
    let data: PlayerData;
    try {
        data = extractJSON(text);
    } catch (e) {
        throw new Error("Invalid JSON format from API. Please try again.");
    }

    // Validation to ensure we didn't get empty data
    if (!data.name || !data.stats || !Array.isArray(data.stats) || data.stats.length === 0) {
        throw new Error("Incomplete data received.");
    }

    // Sort stats according to Rebas.tw order
    if (Array.isArray(data.stats)) {
        data.stats = sortStats(data.stats, data.type);
    }

    // Extract grounding sources if available
    const sourceUrls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map(chunk => chunk.web?.uri)
        .filter((uri): uri is string => !!uri);
    
    if (sourceUrls && sourceUrls.length > 0) {
        data.sourceUrls = sourceUrls;
    }

    return data;

  } catch (error) {
    console.error("Gemini fetch failed:", error);
    // We do NOT return fallback data here. We re-throw so the UI shows an error.
    throw error;
  }
};

export const fetchSpecificPlayerStats = async (playerName: string, year: string): Promise<PlayerData | { error: string }> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash";

    // Force strict 2025 check if the passed year is 2025 (or default)
    // The previous logic allowed loose checking, now we force 2025 explicitly if requesting current.
    const targetYear = "2025"; 

    // Prompt to validation and fetch specific player
    const prompt = `
      Act as a Data Extraction API. Your ONLY goal is to output JSON.
      Task: Search for the player "${playerName}" in CPBL using Google Search and retrieve their stats for the year **${targetYear}** from 'rebas.tw' (野球革命).

      Perform these checks logically based on the search results:
      1. Does "${playerName}" exist in CPBL? If not, return { "error": "NOT_FOUND" }.
      2. Did they play in the Major League (一軍) in ${targetYear}? If they only played in the 2nd team or have no records for ${targetYear}, return { "error": "NO_DATA" }.
      3. Are they "Qualified" (符合進榜資格) for the ${targetYear} season?
         - Look for explicit mentions of "qualified" or "符合資格" in stats tables.
         - General Rule of Thumb for qualification: 
            - Pitchers need IP (局數) >= Team Games (approx 120).
            - Batters need PA (打席) >= 3.1 * Team Games (approx 372).
         - If they played but are clearly NOT qualified, return { "error": "NOT_QUALIFIED" }.

      4. If they exist, have data, AND are qualified:
         Return the full player JSON object:
         {
            "name": "${playerName}",
            "team": "Team Name",
            "type": "pitcher" or "batter",
            "year": "${targetYear}",
            "stats": [ ... ],
            "sprayChart": [], // Return empty array if not easily available
            "pitchDistribution": [] // Return empty array if not easily available
         }

      REQUIRED STATS (Match these exactly):
      If Pitcher: ERA, FIP, AVG, BABIP, LOB%, Whiff%, K%, BB%, GB%.
      If Batter: wOBA, AVG, SLG, OBP, OPS, ISO, BABIP, Whiff%, K%, BB%.
      
      IMPORTANT:
      - Return ONLY the JSON object. 
      - Do NOT write sentences like "I cannot directly browse". You have the Google Search tool; use it to find the text on the page.
      - Ensure the values correspond to the ${targetYear} season.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    
    let result: any;
    try {
        result = extractJSON(text);
    } catch (e) {
        console.error("Failed to parse JSON for specific player:", text);
        return { error: "解析資料失敗" };
    }

    if (result.error) {
        // Map API error codes to user-friendly messages
        if (result.error === "NOT_FOUND") return { error: "無此球員" };
        if (result.error === "NO_DATA") return { error: `該球員無${targetYear}一軍資料` };
        if (result.error === "NOT_QUALIFIED") return { error: `該球員${targetYear}不符合資格` };
        return { error: "無法獲取球員資料" };
    }

    // If valid data, ensure stats are sorted
    if (result.stats && Array.isArray(result.stats)) {
        result.stats = sortStats(result.stats, result.type);
    } else {
        // Ensure stats is an array even if missing from response to prevent UI crashes
        result.stats = [];
    }

    return result as PlayerData;

  } catch (error) {
    console.error("Specific player fetch failed:", error);
    return { error: "系統發生錯誤，請稍後再試" };
  }
};
