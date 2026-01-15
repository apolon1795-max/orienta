import { UserState } from "../types";

// =============================================================================================
// SAFE STORAGE SERVICE
// Этот файл безопасен для GitHub. Он не содержит ключей.
// Ссылка на скрипт берется из файла .env (переменная VITE_GOOGLE_SCRIPT_URL)
// =============================================================================================

// Helper function to safely access environment variables without crashing
const getScriptUrl = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";
    }
  } catch (e) {
    console.warn("Environment check failed", e);
  }
  return "";
};

export const GOOGLE_SCRIPT_URL = getScriptUrl();

export const saveUserDataToSheet = async (userState: UserState) => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("⚠️ Google Sheet URL не настроен! Проверьте файл .env");
    return;
  }

  // Если нет результата теста, значит пользователь либо только начал, либо нажал "Рестарт"
  // Если hasOnboarded = true, но результата нет — это Рестарт.
  let archetypeStatus = "Не начал";
  if (userState.testResult?.title) {
      archetypeStatus = userState.testResult.title;
  } else if (userState.hasOnboarded) {
      archetypeStatus = "Проходит тест (Рестарт)";
  }

  const payload = {
    action: "save",
    // Force string to ensure Google Apps Script lookup works correctly even for large numbers
    telegramId: String(userState.telegramId || "Anonymous"), 
    firstName: userState.firstName || "User",
    username: userState.username ? `@${userState.username}` : "-", 
    archetype: archetypeStatus,
    progress: `${userState.courseProgress.filter(m => m.isCompleted).length}/${userState.courseProgress.length}`,
    aiSummary: userState.aiSummary || "-"
  };

  try {
    console.log("📤 Отправка данных в Google Sheet:", payload);
    // Используем no-cors. Мы не узнаем ответ, но данные уйдут.
    // credentials: 'omit' важен, чтобы браузер не блокировал запрос из-за кук
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      credentials: "omit",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
    console.log("✅ Запрос отправлен (no-cors)");
  } catch (error) {
    console.error("❌ Ошибка сохранения в таблицу:", error);
  }
};
