const TARGET_SELECTOR = [
  '#courseAnswer',
  '#answerInput',
  '#coreSearch',
  '#verbSearch',
  '.video-card textarea',
  '[data-buryat-input]'
].join(',');

export function insertAtSelection(field, char) {
  if (!field || typeof field.value !== 'string') return '';
  const start = Number.isInteger(field.selectionStart) ? field.selectionStart : field.value.length;
  const end = Number.isInteger(field.selectionEnd) ? field.selectionEnd : start;
  field.value = field.value.slice(0, start) + char + field.value.slice(end);
  const next = start + char.length;
  field.setSelectionRange?.(next, next);
  field.dispatchEvent(new Event('input', {bubbles:true}));
  field.focus?.();
  return field.value;
}

function keyboardFor(field) {
  if (!field.id) field.id = `buryat-input-${Math.random().toString(36).slice(2, 9)}`;
  const keyboard = document.createElement('div');
  keyboard.className = 'buryat-keyboard';
  keyboard.dataset.buryatKeyboardFor = field.id;
  keyboard.setAttribute('aria-label', 'Бурятские буквы');
  keyboard.innerHTML = ['ү','ө','һ'].map((char) =>
    `<button type="button" class="buryat-key" data-char="${char}" aria-label="Вставить букву ${char}">${char}</button>`
  ).join('');
  keyboard.addEventListener('pointerdown', (event) => event.preventDefault());
  keyboard.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-char]');
    if (button) insertAtSelection(field, button.dataset.char);
  });
  field.insertAdjacentElement('afterend', keyboard);
}

export function enhanceBuryatInputs(root = document) {
  root.querySelectorAll?.(TARGET_SELECTOR).forEach((field) => {
    const next = field.nextElementSibling;
    if (next?.classList?.contains('buryat-keyboard')) return;
    keyboardFor(field);
  });
}

export function initBuryatInputKeys() {
  enhanceBuryatInputs();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(TARGET_SELECTOR)) enhanceBuryatInputs(node.parentElement || document);
        else enhanceBuryatInputs(node);
      }
    }
  });
  observer.observe(document.body, {childList:true, subtree:true});
  return observer;
}

if (typeof document !== 'undefined') initBuryatInputKeys();
