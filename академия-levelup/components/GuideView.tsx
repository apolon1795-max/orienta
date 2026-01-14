import React, { useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft } from 'lucide-react';

interface GuideViewProps {
  archetype: string; // 'Commander', 'Creator', 'Researcher', 'Communicator'
  onBack: () => void;
  onStartCourse: () => void;
}

// Вставляем стили, общие для всех гайдов, чтобы они работали внутри React
const COMMON_STYLES = `
  <style>
      .hero-guide-root {
        font-family: 'Inter', sans-serif;
        line-height: 1.6;
        background-color: #0f172a;
        color: #f8fafc;
        position: relative;
        overflow: hidden;
        border-radius: 12px;
        padding: 20px;
      }
      
      .glass-panel {
        background: rgba(30, 41, 59, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
      }

      .prof-item {
        border-left: 4px solid #fbbf24;
        background: rgba(15, 23, 42, 0.6);
        transition: transform 0.2s, background 0.2s;
        padding: 16px;
        border-radius: 0 8px 8px 0;
        margin-bottom: 12px;
      }
      .prof-item:hover {
        background: rgba(15, 23, 42, 0.9);
        transform: translateX(4px);
      }

      .blacklist-item {
        border-left: 4px solid #ef4444;
        background: rgba(69, 10, 10, 0.4);
      }
      
      .shadow-side-box {
        background: linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%);
        border: 1px solid rgba(167, 139, 250, 0.3);
      }

      table { width: 100%; border-collapse: collapse; }
      th { color: #fbbf24; text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.9em; text-transform: uppercase; }
      td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.95em; }
      
      .category-header {
        display: flex;
        align-items: center;
        color: #fbbf24;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 0.9rem;
        letter-spacing: 0.05em;
        margin-bottom: 16px;
        margin-top: 32px;
        border-bottom: 1px solid rgba(251, 191, 36, 0.2);
        padding-bottom: 8px;
      }
  </style>
`;

// HTML контент для каждого архетипа (вырезан из предоставленных файлов)
const CONTENT_MAP: Record<string, string> = {
  // Дипломат
  'Communicator': `
    ${COMMON_STYLES}
    <div class="hero-guide-root min-h-screen flex justify-center py-10">
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/40 blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px]"></div>
    </div>
    <div class="relative z-10 w-full max-w-4xl glass-panel rounded-2xl p-6 md:p-12 shadow-2xl">
        <div class="text-center mb-12">
            <h1 class="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-6 animate-pulse-slow">
                Гайд Персонажа: Дипломат
            </h1>
            <div class="inline-block bg-slate-800/80 px-8 py-4 rounded-xl border border-slate-600 shadow-lg">
                <p class="text-slate-200 text-sm md:text-lg leading-relaxed">
                    <strong class="text-amber-400 block mb-1">Твоя суперсила:</strong> 
                    Эмпатия, коммуникация и умение договариваться.
                </p>
            </div>
        </div>
        <div class="shadow-side-box p-6 rounded-xl mb-12 relative overflow-hidden">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full"></div>
            <h3 class="text-xl font-serif text-purple-300 mb-4 flex items-center">
                <span class="text-2xl mr-2">&#127768;</span> Твоя Теневая Сторона
            </h3>
            <p class="text-slate-300 mb-4 text-sm md:text-base italic">
                У каждой силы есть цена. Дипломаты часто страдают от <strong>синдрома «Хорошего человека»</strong>.
            </p>
            <ul class="space-y-2 text-slate-400 text-sm">
                <li class="flex items-start"><span class="text-purple-400 mr-2">•</span> Ты боишься конфликтов и часто соглашаешься в ущерб себе.</li>
                <li class="flex items-start"><span class="text-purple-400 mr-2">•</span> Ты выгораешь, потому что впитываешь чужие эмоции как губка.</li>
                <li class="flex items-start"><span class="text-purple-400 mr-2">•</span> Тебе сложно просить высокую зарплату («неудобно же»).</li>
            </ul>
            <div class="mt-4 pt-4 border-t border-purple-500/20 text-white font-semibold text-sm">
                &#128161; <span class="text-amber-300">Инсайт:</span> На курсе мы учим Дипломатов превращать «мягкость» в жесткий инструмент управления, не теряя себя.
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128640;</span> Часть 1. Топ-15 профессий
        </h2>
        <div class="category-header"><span class="text-2xl mr-2">&#128101;</span> Люди и Развитие</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">HR-партнер (Стратег по людям)</strong>
                <span class="text-slate-300">Не «кадровик» с бумажками, а советник бизнеса. Ты решаешь, кого нанять и как создать команду мечты.</span>
            </div>
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Менеджер по работе с IT-сообществом (DevRel)</strong>
                <span class="text-slate-300">Мост между компанией и айтишниками. Твоя работа — тусовки, хакатоны и нетворкинг.</span>
            </div>
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Менеджер по счастью (Well-being)</strong>
                <span class="text-slate-300">Хранитель атмосферы. В топ-компаниях платят за то, чтобы сотрудники не выгорали.</span>
            </div>
        </div>
        <div class="category-header"><span class="text-2xl mr-2">&#127908;</span> Медиа и Бренды</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Комьюнити-менеджер</strong>
                <span class="text-slate-300">Вождь цифрового племени (Telegram, Discord). Ты управляешь вниманием тысяч людей.</span>
            </div>
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Продюсер онлайн-школ</strong>
                <span class="text-slate-300">Находишь экспертов, упаковываешь их знания и создаешь продукты, меняющие жизни.</span>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-6 mt-16 flex items-center">
            <span class="text-3xl mr-4">&#127917;</span> Твои «братья по духу»
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <div class="text-3xl mb-2">&#129418;</div>
                <strong class="text-amber-200 block">Тирион Ланнистер</strong>
                <span class="text-slate-400 text-xs">«Игра Престолов»</span>
                <p class="text-slate-300 text-sm mt-2">Побеждает умом и словом, когда сила бесполезна.</p>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <div class="text-3xl mb-2">&#127836;</div>
                <strong class="text-amber-200 block">Наруто Узумаки</strong>
                <span class="text-slate-400 text-xs">«Наруто»</span>
                <p class="text-slate-300 text-sm mt-2">Превращает врагов в друзей. Суперсила — эмпатия.</p>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <div class="text-3xl mb-2">&#128048;</div>
                <strong class="text-amber-200 block">Джуди Хоппс</strong>
                <span class="text-slate-400 text-xs">«Зверополис»</span>
                <p class="text-slate-300 text-sm mt-2">Верит в людей и находит подход к любому (даже к лису).</p>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#9940;</span> Часть 2. Black-list
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div class="blacklist-item p-4 rounded-r-lg">
                <strong class="text-red-200 block mb-1">Архивариус / Бухгалтер</strong>
                <p class="text-slate-400 text-sm">Мир бумаг без общения — тюрьма для Дипломата.</p>
            </div>
            <div class="blacklist-item p-4 rounded-r-lg">
                <strong class="text-red-200 block mb-1">Системный администратор (одиночка)</strong>
                <p class="text-slate-400 text-sm">Сидеть в подвале с проводами? Ты завоешь.</p>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128176;</span> Часть 3. Карта зарплат
        </h2>
        <div class="overflow-x-auto rounded-lg border border-slate-700 mb-12 shadow-lg">
            <table class="w-full text-left bg-slate-900/50">
                <thead>
                    <tr class="bg-slate-800">
                        <th>Уровень</th>
                        <th>Доход (мес.)</th>
                        <th>Пример роли</th>
                    </tr>
                </thead>
                <tbody class="text-slate-300">
                    <tr><td>Новичок</td><td class="font-bold text-white">60–90 т.р.</td><td>Ассистент, Junior Sales</td></tr>
                    <tr><td>Опытный</td><td class="font-bold text-white">100–200 т.р.</td><td>HR-партнер, Продюсер</td></tr>
                    <tr><td>Мастер</td><td class="font-bold text-white">250–400 т.р.+</td><td>Руководитель, Топ-тренер</td></tr>
                </tbody>
            </table>
        </div>
        <div class="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-6 rounded-2xl mb-12 text-center">
            <h3 class="text-amber-400 font-bold text-xl mb-2 flex justify-center items-center">
                &#9889; Челлендж на 24 часа: «Зеркало Смысла»
            </h3>
            <p class="text-slate-300 text-sm mb-4">
                Попробуй сегодня не просто отвечать на слова собеседника, а <strong>резюмировать его чувства</strong>.
            </p>
        </div>
        <div class="text-center mt-16 mb-8">
            <p class="text-slate-300 italic mb-8 text-lg">
                Это была лишь демо-версия твоих возможностей.<br>
                На курсе мы учим монетизировать этот талант системно.
            </p>
            <div id="guide-action-btn" class="inline-block group relative w-full md:w-auto cursor-pointer">
                <div class="absolute inset-0 bg-amber-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
                <button class="relative w-full md:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-serif font-bold py-5 px-12 rounded-xl shadow-2xl transform group-hover:-translate-y-1 transition-all text-xl border-t border-amber-400/30 pointer-events-none">
                   &#10024; Перейти к Курсу &#8594;
                </button>
            </div>
            <p class="text-xs text-slate-500 mt-4">Начать обучение</p>
        </div>
    </div>
    </div>
  `,
  
  // Творец
  'Creator': `
    ${COMMON_STYLES}
    <div class="hero-guide-root min-h-screen flex justify-center py-10">
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/40 blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px]"></div>
    </div>
    <div class="relative z-10 w-full max-w-4xl glass-panel rounded-2xl p-6 md:p-12 shadow-2xl">
        <div class="text-center mb-12">
            <h1 class="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-6 animate-pulse-slow">
                Гайд Персонажа: Творец
            </h1>
            <div class="inline-block bg-slate-800/80 px-8 py-4 rounded-xl border border-slate-600 shadow-lg">
                <p class="text-slate-200 text-sm md:text-lg leading-relaxed">
                    <strong class="text-amber-400 block mb-1">Твоя суперсила:</strong> 
                    Видение, креативность и создание Нового.
                </p>
            </div>
        </div>
        <div class="shadow-side-box p-6 rounded-xl mb-12 relative overflow-hidden">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full"></div>
            <h3 class="text-xl font-serif text-purple-300 mb-4 flex items-center">
                <span class="text-2xl mr-2">&#127768;</span> Твоя Теневая Сторона
            </h3>
            <p class="text-slate-300 mb-4 text-sm md:text-base italic">
                Твой дар — создавать миры. Твоё проклятие — <strong>Хаос и Перфекционизм</strong>.
            </p>
            <ul class="space-y-2 text-slate-400 text-sm">
                <li class="flex items-start"><span class="text-purple-400 mr-2">•</span> Ты начинаешь 100 проектов, а заканчиваешь 0 (синдром «блестящего объекта»).</li>
                <li class="flex items-start"><span class="text-purple-400 mr-2">•</span> Ты боишься показать работу, пока она не станет «идеальной».</li>
            </ul>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128640;</span> Часть 1. Топ-15 профессий
        </h2>
        <div class="category-header"><span class="text-2xl mr-2">&#127912;</span> Визуал и Дизайн</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">UX/UI Дизайнер (Архитектор интерфейсов)</strong>
                <span class="text-slate-300">Ты решаешь, как люди взаимодействуют с технологиями.</span>
            </div>
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Геймдизайнер / Создатель миров</strong>
                <span class="text-slate-300">Бог своего маленького мира. Ты придумываешь правила.</span>
            </div>
        </div>
        <div class="category-header"><span class="text-2xl mr-2">&#127909;</span> Контент и Смыслы</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Креативный продюсер</strong>
                <span class="text-slate-300">Ты придумываешь идею проекта и следишь, чтобы она не развалилась.</span>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-6 mt-16 flex items-center">
            <span class="text-3xl mr-4">&#127917;</span> Твои «братья по духу»
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <div class="text-3xl mb-2">&#129302;</div>
                <strong class="text-amber-200 block">Тони Старк</strong>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <div class="text-3xl mb-2">&#127852;</div>
                <strong class="text-amber-200 block">Вилли Вонка</strong>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <div class="text-3xl mb-2">&#127823;</div>
                <strong class="text-amber-200 block">Стив Джобс</strong>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#9940;</span> Часть 2. Black-list
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div class="blacklist-item p-4 rounded-r-lg">
                <strong class="text-red-200 block mb-1">Бухгалтер / Аудитор</strong>
                <p class="text-slate-400 text-sm">Строгие правила, цифры, никаких отклонений.</p>
            </div>
            <div class="blacklist-item p-4 rounded-r-lg">
                <strong class="text-red-200 block mb-1">Оператор Call-центра</strong>
                <p class="text-slate-400 text-sm">Работа по скрипту. Повторять одно и то же 100 раз в день — пытка.</p>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128176;</span> Часть 3. Карта зарплат
        </h2>
        <div class="overflow-x-auto rounded-lg border border-slate-700 mb-12 shadow-lg">
            <table class="w-full text-left bg-slate-900/50">
                <thead>
                    <tr class="bg-slate-800">
                        <th>Уровень</th>
                        <th>Доход (мес.)</th>
                        <th>Пример роли</th>
                    </tr>
                </thead>
                <tbody class="text-slate-300">
                    <tr><td>Новичок</td><td class="font-bold text-white">50–80 т.р.</td><td>Junior Designer</td></tr>
                    <tr><td>Опытный</td><td class="font-bold text-white">120–250 т.р.</td><td>Art Director</td></tr>
                    <tr><td>Мастер</td><td class="font-bold text-white">300–600 т.р.+</td><td>Creative Director</td></tr>
                </tbody>
            </table>
        </div>
        <div class="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 p-6 rounded-2xl mb-12 text-center">
            <h3 class="text-amber-400 font-bold text-xl mb-2 flex justify-center items-center">
                &#9889; Челлендж на 24 часа: «Кладбище Идей»
            </h3>
            <p class="text-slate-300 text-sm mb-4">
                Придумай и запиши <strong>5 самых глупых, ужасных и нелепых идей</strong>.
            </p>
        </div>
        <div class="text-center mt-16 mb-8">
            <div id="guide-action-btn" class="inline-block group relative w-full md:w-auto cursor-pointer">
                <div class="absolute inset-0 bg-amber-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
                <button class="relative w-full md:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-serif font-bold py-5 px-12 rounded-xl shadow-2xl transform group-hover:-translate-y-1 transition-all text-xl border-t border-amber-400/30 pointer-events-none">
                   &#10024; Перейти к Курсу &#8594;
                </button>
            </div>
            <p class="text-xs text-slate-500 mt-4">Начать обучение</p>
        </div>
    </div>
    </div>
  `,

  // Командир
  'Commander': `
    ${COMMON_STYLES}
    <div class="hero-guide-root min-h-screen flex justify-center py-10">
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/40 blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px]"></div>
    </div>
    <div class="relative z-10 w-full max-w-4xl glass-panel rounded-2xl p-6 md:p-12 shadow-2xl">
        <div class="text-center mb-12">
            <h1 class="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-6 animate-pulse-slow">
                Гайд Персонажа: Командир
            </h1>
            <div class="inline-block bg-slate-800/80 px-8 py-4 rounded-xl border border-slate-600 shadow-lg">
                <p class="text-slate-200 text-sm md:text-lg leading-relaxed">
                    <strong class="text-amber-400 block mb-1">Твоя суперсила:</strong> 
                    Стратегия, Управление хаосом и Решительность.
                </p>
            </div>
        </div>
        <div class="shadow-side-box p-6 rounded-xl mb-12 relative overflow-hidden">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full"></div>
            <h3 class="text-xl font-serif text-purple-300 mb-4 flex items-center">
                <span class="text-2xl mr-2">&#127768;</span> Твоя Теневая Сторона
            </h3>
            <p class="text-slate-300 mb-4 text-sm md:text-base italic">
                Ты рожден, чтобы вести за собой. Но часто становишься заложником принципа <strong>«Хочешь сделать хорошо — сделай сам»</strong>.
            </p>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128640;</span> Часть 1. Топ-15 профессий
        </h2>
        <div class="category-header"><span class="text-2xl mr-2">&#128188;</span> Бизнес и Топ-менеджмент</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">CEO / Основатель бизнеса</strong>
                <span class="text-slate-300">Капитан корабля. Ты определяешь курс и несешь ответственность.</span>
            </div>
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Project Manager (PM)</strong>
                <span class="text-slate-300">Ты превращаешь идеи в план и дедлайны.</span>
            </div>
        </div>
        <div class="category-header"><span class="text-2xl mr-2">&#128200;</span> Системы и Стратегия</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Операционный директор (COO)</strong>
                <span class="text-slate-300">Архитектор бизнес-процессов.</span>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-6 mt-16 flex items-center">
            <span class="text-3xl mr-4">&#127917;</span> Твои «братья по духу»
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <strong class="text-amber-200 block">Томас Шелби</strong>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <strong class="text-amber-200 block">Миранда Пристли</strong>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <strong class="text-amber-200 block">Харви Спектер</strong>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#9940;</span> Часть 2. Black-list
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div class="blacklist-item p-4 rounded-r-lg">
                <strong class="text-red-200 block mb-1">Ассистент / Секретарь</strong>
                <p class="text-slate-400 text-sm">Ты создан принимать решения, а не носить кофе.</p>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128176;</span> Часть 3. Карта зарплат
        </h2>
        <div class="overflow-x-auto rounded-lg border border-slate-700 mb-12 shadow-lg">
            <table class="w-full text-left bg-slate-900/50">
                <thead>
                    <tr class="bg-slate-800">
                        <th>Уровень</th>
                        <th>Доход (мес.)</th>
                        <th>Пример роли</th>
                    </tr>
                </thead>
                <tbody class="text-slate-300">
                    <tr><td>Новичок</td><td class="font-bold text-white">70–100 т.р.</td><td>Junior PM</td></tr>
                    <tr><td>Опытный</td><td class="font-bold text-white">150–300 т.р.</td><td>Senior PM, Руководитель</td></tr>
                    <tr><td>Мастер</td><td class="font-bold text-white">400–800 т.р.+</td><td>ТОП-менеджер</td></tr>
                </tbody>
            </table>
        </div>
        <div class="text-center mt-16 mb-8">
            <div id="guide-action-btn" class="inline-block group relative w-full md:w-auto cursor-pointer">
                <div class="absolute inset-0 bg-amber-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
                <button class="relative w-full md:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-serif font-bold py-5 px-12 rounded-xl shadow-2xl transform group-hover:-translate-y-1 transition-all text-xl border-t border-amber-400/30 pointer-events-none">
                   &#10024; Перейти к Курсу &#8594;
                </button>
            </div>
            <p class="text-xs text-slate-500 mt-4">Начать обучение</p>
        </div>
    </div>
    </div>
  `,

  // Мыслитель
  'Researcher': `
    ${COMMON_STYLES}
    <div class="hero-guide-root min-h-screen flex justify-center py-10">
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/40 blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px]"></div>
    </div>
    <div class="relative z-10 w-full max-w-4xl glass-panel rounded-2xl p-6 md:p-12 shadow-2xl">
        <div class="text-center mb-12">
            <h1 class="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-6 animate-pulse-slow">
                Гайд Персонажа: Мыслитель
            </h1>
            <div class="inline-block bg-slate-800/80 px-8 py-4 rounded-xl border border-slate-600 shadow-lg">
                <p class="text-slate-200 text-sm md:text-lg leading-relaxed">
                    <strong class="text-amber-400 block mb-1">Твоя суперсила:</strong> 
                    Логика, Глубина и способность видеть Суть вещей.
                </p>
            </div>
        </div>
        <div class="shadow-side-box p-6 rounded-xl mb-12 relative overflow-hidden">
            <h3 class="text-xl font-serif text-purple-300 mb-4 flex items-center">
                <span class="text-2xl mr-2">&#127768;</span> Твоя Теневая Сторона
            </h3>
            <p class="text-slate-300 mb-4 text-sm md:text-base italic">
                Твой мозг — суперкомпьютер, но иногда он перегревается. Ты страдаешь от <strong>«Горя от ума» (Analysis Paralysis)</strong>.
            </p>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128640;</span> Часть 1. Топ-15 профессий
        </h2>
        <div class="category-header"><span class="text-2xl mr-2">&#128187;</span> IT и Данные (Архитекторы систем)</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Data Scientist / Аналитик Big Data</strong>
                <span class="text-slate-300">Ты находишь закономерности в хаосе цифр.</span>
            </div>
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Backend-разработчик / Архитектор ПО</strong>
                <span class="text-slate-300">Ты строишь невидимый, но мощный фундамент.</span>
            </div>
        </div>
        <div class="category-header"><span class="text-2xl mr-2">&#129488;</span> Стратегия и Финансы</div>
        <div class="space-y-4">
            <div class="prof-item">
                <strong class="text-white text-lg block mb-1">Инвестиционный аналитик</strong>
                <span class="text-slate-300">Ты видишь то, что скрыто в отчетах компаний.</span>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-6 mt-16 flex items-center">
            <span class="text-3xl mr-4">&#127917;</span> Твои «братья по духу»
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <strong class="text-amber-200 block">Шерлок Холмс</strong>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <strong class="text-amber-200 block">Доктор Хаус</strong>
            </div>
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 text-center">
                <strong class="text-amber-200 block">Гермиона Грейнджер</strong>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#9940;</span> Часть 2. Black-list
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <div class="blacklist-item p-4 rounded-r-lg">
                <strong class="text-red-200 block mb-1">Менеджер по холодным продажам</strong>
                <p class="text-slate-400 text-sm">Навязываться людям и работать на голых эмоциях? Для твоей логики это ад.</p>
            </div>
        </div>
        <h2 class="text-2xl md:text-3xl font-serif text-white mb-4 flex items-center border-b border-slate-700 pb-4">
            <span class="text-3xl mr-4">&#128176;</span> Часть 3. Карта зарплат
        </h2>
        <div class="overflow-x-auto rounded-lg border border-slate-700 mb-12 shadow-lg">
            <table class="w-full text-left bg-slate-900/50">
                <thead>
                    <tr class="bg-slate-800">
                        <th>Уровень</th>
                        <th>Доход (мес.)</th>
                        <th>Пример роли</th>
                    </tr>
                </thead>
                <tbody class="text-slate-300">
                    <tr><td>Новичок</td><td class="font-bold text-white">80–120 т.р.</td><td>Junior Dev</td></tr>
                    <tr><td>Опытный</td><td class="font-bold text-white">180–350 т.р.</td><td>Senior Dev, Финансист</td></tr>
                    <tr><td>Мастер</td><td class="font-bold text-white">400–900 т.р.+</td><td>CTO, Архитектор</td></tr>
                </tbody>
            </table>
        </div>
        <div class="text-center mt-16 mb-8">
            <div id="guide-action-btn" class="inline-block group relative w-full md:w-auto cursor-pointer">
                <div class="absolute inset-0 bg-amber-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
                <button class="relative w-full md:w-auto bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-serif font-bold py-5 px-12 rounded-xl shadow-2xl transform group-hover:-translate-y-1 transition-all text-xl border-t border-amber-400/30 pointer-events-none">
                   &#10024; Перейти к Курсу &#8594;
                </button>
            </div>
            <p class="text-xs text-slate-500 mt-4">Начать обучение</p>
        </div>
    </div>
    </div>
  `
};

export const GuideView: React.FC<GuideViewProps> = ({ archetype, onBack, onStartCourse }) => {
  const content = CONTENT_MAP[archetype] || '<div class="text-center text-white p-10">Гайд не найден</div>';

  useEffect(() => {
    const btn = document.getElementById('guide-action-btn');
    const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        onStartCourse();
    };

    if (btn) {
      btn.addEventListener('click', handleClick);
    }

    return () => {
      if (btn) {
        btn.removeEventListener('click', handleClick);
      }
    };
  }, [archetype, onStartCourse]);

  return (
    <div className="w-full h-full relative">
       {/* Кнопка "Назад" поверх контента */}
      <div className="fixed top-4 left-4 z-50">
        <button 
          onClick={onBack}
          className="bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          В Хаб
        </button>
      </div>

      {/* Рендеринг HTML контента */}
      <div 
        dangerouslySetInnerHTML={{ __html: content }} 
        className="w-full min-h-screen bg-[#0f172a]"
      />
    </div>
  );
};
