import { TestResult, CourseModule } from "../types";
import { GOOGLE_SCRIPT_URL } from "./storageService";

// Мы используем Google Apps Script как прокси для YandexGPT, чтобы скрыть ключи и избежать CORS ошибок.
export const generateGraduationSummary = async (
  testResult: TestResult,
  courseProgress: CourseModule[]
): Promise<string> => {
  try {
    const completedModules = courseProgress.filter((m) => m.isCompleted).length;
    const totalModules = courseProgress.length;

    // Формируем промпт для Яндекса
    const prompt = `
      Студент: ${testResult.title} (Тип личности: ${testResult.scoreType}).
      Прогресс курса: ${completedModules}/${totalModules} модулей завершено.
      Описание архетипа: ${testResult.description}
      
      Задача: Напиши краткий персональный вывод по итогам курса для этого человека. Дай совет.
    `;

    const payload = {
      action: "generate_ai",
      prompt: prompt
    };

    // Запрос к Google Script, который перешлет его в YandexGPT
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      // Важно: используем text/plain чтобы избежать preflight запросов, которые GAS не любит
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data && data.text) {
      return data.text;
    } else {
      throw new Error("Empty response from AI proxy");
    }

  } catch (error) {
    console.error("Error generating Yandex GPT summary:", error);
    return "Поздравляем с завершением курса! Вы проделали отличную работу. (ИИ временно недоступен, но ваш прогресс сохранен).";
  }
};