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
    telegramId: userState.telegramId || "Anonymous",
    firstName: userState.firstName || "User",
    username: userState.username ? `@${userState.username}` : "-", // Явно отправляем прочерк если нет юзернейма
    archetype: archetypeStatus,
    progress: `${userState.courseProgress.filter(m => m.isCompleted).length}/${userState.courseProgress.length}`,
    aiSummary: userState.aiSummary || "-"
  };

  try {
    // Используем no-cors. Мы не узнаем ответ, но данные уйдут.
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
    console.log("✅ Данные отправлены в таблицу:", payload);
  } catch (error) {
    console.error("❌ Ошибка сохранения в таблицу:", error);
  }
};
