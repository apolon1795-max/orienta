// Fixed per-question order, stable IDs. Persisted drafts contain aggregate scores,
// not option indexes: previous answers/results are never recalculated on upgrade.
export interface TestChoice { id: string; text: string; archetype: string }
export const TEST_CHOICES: Record<string, TestChoice[]> = {
  "question_1": [
    {
      "id": "q1-1",
      "text": "Предложу план: ложкой завтракаю я, а ты греешь чай. Если согласен, будем командой!",
      "archetype": "Commander"
    },
    {
      "id": "q1-2",
      "text": "Достану лупу: «Ого! А как ты дышишь в бульоне? Давай я тебя изучу!»",
      "archetype": "Researcher"
    },
    {
      "id": "q1-3",
      "text": "Улыбнусь: «О, говорящий суп! Давай сфоткаемся и поболтаем!»",
      "archetype": "Communicator"
    },
    {
      "id": "q1-4",
      "text": "Слеплю ему новую ложку из хлебного мякиша. Мне не жалко!",
      "archetype": "Creator"
    }
  ],
  "question_2": [
    {
      "id": "q2-1",
      "text": "Предлагаю обмен: он учит меня, а я придумываю ему название и вывеску.",
      "archetype": "Creator"
    },
    {
      "id": "q2-2",
      "text": "Договариваюсь, чему учимся и какой результат получим. Прокачка по плану!",
      "archetype": "Commander"
    },
    {
      "id": "q2-3",
      "text": "Прошу показать, чему он уже научил других, и объяснить, как это работает.",
      "archetype": "Researcher"
    },
    {
      "id": "q2-4",
      "text": "Беру урок, мы болтаем, потом я становлюсь крёстным у его сына.",
      "archetype": "Communicator"
    }
  ],
  "question_3": [
    {
      "id": "q3-4",
      "text": "Перо Общения. Можно болтать даже с камнем. И камень будет рад.",
      "archetype": "Communicator"
    },
    {
      "id": "q3-2",
      "text": "Кисть Идей. Всё, что ты рисуешь, становится частью реальности.",
      "archetype": "Creator"
    },
    {
      "id": "q3-1",
      "text": "Кольцо Командующего. Придаёт голосу авторитет, даже если ты говоришь «пельмени».",
      "archetype": "Commander"
    },
    {
      "id": "q3-3",
      "text": "Камень Разума. Усиливает мозг. Почти до состояния учителя по химии.",
      "archetype": "Researcher"
    }
  ],
  "question_4": [
    {
      "id": "q4-3",
      "text": "Спрашиваю у прохожих, что на каждой дороге. Собираю ответы, сравниваю. Почти научная экспедиция.",
      "archetype": "Researcher"
    },
    {
      "id": "q4-1",
      "text": "Иду туда, где весело. Обычно там и еда, и успех.",
      "archetype": "Communicator"
    },
    {
      "id": "q4-4",
      "text": "Придумываю четвёртый путь. Он включает лодку и панду.",
      "archetype": "Creator"
    },
    {
      "id": "q4-2",
      "text": "Заворачиваю налево — потому что я заранее распланировал этот маршрут.",
      "archetype": "Commander"
    }
  ],
  "question_5": [
    {
      "id": "q5-4",
      "text": "Перепридумываю его заново. Добавляю блёстки и реакцию на музыку.",
      "archetype": "Creator"
    },
    {
      "id": "q5-3",
      "text": "Устраиваю вечеринку в его честь и зову всех. Артефакт отвечает за музыку.",
      "archetype": "Communicator"
    },
    {
      "id": "q5-2",
      "text": "Разбираю его на части, чтобы понять принцип работы.",
      "archetype": "Researcher"
    },
    {
      "id": "q5-1",
      "text": "Провожу собрание: решаем, зачем нам артефакт и кто что с ним проверит.",
      "archetype": "Commander"
    }
  ]
};
