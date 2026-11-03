export const csvCell = value => {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export const csvRow = values => values.map(csvCell).join(';') + '\r\n';
export const exportRows = async store => {
  const learners = await store.scan('learner:');
  const rows = [['Ученик', 'ID', 'Обновлено', 'Этапов выполнено', 'Видео завершено', 'Ответы и прогресс']];
  for (const learner of learners) {
    const progress = await store.get('progress:' + learner.value.learnerId), state = progress?.value.payload.state;
    rows.push([learner.value.label, learner.value.learnerId, progress ? new Date(progress.value.updatedAt).toISOString() : '', state?.course.completedStages.length || 0,
      Object.values(state?.course.lessons || {}).filter(lesson => lesson.completed).length, progress ? JSON.stringify(progress.value.payload) : '']);
  }
  return '\uFEFF' + rows.map(csvRow).join('');
};
