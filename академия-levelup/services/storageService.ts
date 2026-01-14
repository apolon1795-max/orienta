import { UserState } from "../types";

// =============================================================================================
// ВАЖНО: ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ ОТ GOOGLE APPS SCRIPT (Web App URL)
// =============================================================================================
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5GRy1eRACRvvstodX3b7crXAeHkWOjSHgTyg1_HddBh3d42JTYIfgxpo9mu29kMQj/exec"; 

export const saveUserDataToSheet = async (userState: UserState) => {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("ВСТАВИТЬ_ССЫЛКУ_СЮДА")) {
    console.warn("Google Sheet URL is not set. Data saved locally only.");
    return;
  }

  const payload = {
    action: "save", // Указываем действие для скрипта
    telegramId: userState.telegramId || "Anonymous",
    firstName: userState.firstName || "User",
    archetype: userState.testResult?.title || "Not Completed",
    progress: `${userState.courseProgress.filter(m => m.isCompleted).length}/${userState.courseProgress.length}`,
    aiSummary: userState.aiSummary ? "Generated" : "None"
  };

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
    console.log("Data sent to Google Sheet successfully");
  } catch (error) {
    console.error("Failed to save data to Google Sheet:", error);
  }
};