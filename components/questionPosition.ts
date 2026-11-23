/** Move to a new prompt without reopening a mobile keyboard or animating from the previous answer. */
export function revealPrompt(prompt: HTMLElement) {
  prompt.tabIndex = -1;
  prompt.focus({ preventScroll: true });
  prompt.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
}
