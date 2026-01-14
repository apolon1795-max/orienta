import { UserState } from "../types";

// =============================================================================================
// БЕЗОПАСНОСТЬ ДАННЫХ
// =============================================================================================
// Ссылка на Google Script теперь берется из переменных окружения (Environment Variables).
// Это безопасно для публикации кода на GitHub.
//
// В Timeweb / Vercel / Netlify добавьте переменную:
// Key: REACT_APP_GOOGLE_SCRIPT_URL
// Value: https://script.google.com/macros/s/.......
// =============================================================================================

// Fix for TypeScript finding "process" in browser env
declare var process: any;

const getScriptUrl = () => {
  // 1. Попытка получить из process.env (стандарт Node.js / Create React App)
  if (typeof process !== 'undefined' && process.env?.REACT_APP_GOOGLE_SCRIPT_URL) {
    return process.env.REACT_APP_GOOGLE_SCRIPT_URL;
  }
  
  // 2. Попытка получить из import.meta.env (стандарт Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SCRIPT_URL) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_SCRIPT_URL;
  }

  // 3. ФОЛБЭК: Если переменная не найдена, возвращаем пустую строку.
  // Это гарантирует, что секретная ссылка не попадет в репозиторий.
  return ""; 
};

export const GOOGLE_SCRIPT_URL = getScriptUrl();

export const saveUserDataToSheet = async (userState: UserState) => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("Google Sheet URL is not set. Please configure REACT_APP_GOOGLE_SCRIPT_URL in your environment variables.");
    return;
  }

  const payload = {
    action: "save",
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
