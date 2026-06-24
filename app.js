// ─── State ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'trello-clone-v1';

let state = {
  boardName: 'My Board',
  lists: [],
  nextListId: 1,
  nextCardId: 1,
};

let dragState = {
  active: false,
  cardId: null,
  sourceListId: null,
  ghost: null,
  startX: 0,
  startY: 0,
};

let openCardId = null;
let openCardListId = null;

// ─── Persistence ────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      return;
    }
  } catch (_) {}

  // Demo data
  state = {
    boardName: 'My Board',
    lists: [
      {
        id: 'l1', title: 'To Do',
        cards: [
          { id: 'c1', title: 'Create project plan', description: 'Define scope, timeline, and resources for the upcoming release.' },
          { id: 'c2', title: 'Design mockups', description: '' },
          { id: 'c3', title: 'Set up CI/CD pipeline', description: '' },
          { id: 'c4', title: 'Write unit tests', description: '' },
        ],
      },
      {
        id: 'l2', title: 'In Progress',
        cards: [
          { id: 'c5', title: 'Build frontend components', description: 'Implement reusable UI components with accessibility in mind.' },
          { id: 'c6', title: 'API integration', description: '' },
        ],
      },
      {
        id: 'l3', title: 'Review',
        cards: [
          { id: 'c7', title: 'Code review for auth module', description: '' },
        ],
      },
      {
        id: 'l4', title: 'Done',
        cards: [
          { id: 'c8', title: 'Define requirements', description: 'Gathered all functional and non-functional requirements.' },
          { id: 'c9', title: 'Initial repo setup', description: '' },
        ],
      },
    ],
    nextListId: 5,
    nextCardId: 10,
  };
  saveState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(text) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(text)));
  return d.innerHTML;
}

function findCard(cardId) {
  for (const list of state.lists) {
    const card = list.cards.find(c => c.id === cardId);
    if (card) return { card, list };
  }
  return null;
}

function genListId() { return `l${state.nextListId++}`; }
function genCardId() { return `c${state.nextCardId++}`; }

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const board = document.getElementById('board');
  const addListContainer = document.getElementById('add-list-container');
  board.querySelectorAll('.list').forEach(el => el.remove());

  for (const list of state.lists) {
    board.insertBefore(buildList(list), addListContainer);
  }

  document.getElementById('board-name').textContent = state.boardName;
  document.getElementById('board-bar-name').textContent = state.boardName;
}

function buildList(list) {
  const el = document.createElement('div');
  el.className = 'list';
  el.dataset.listId = list.id;

  el.innerHTML = `
    <div class="list-header">
      <div class="list-title" contenteditable="true" spellcheck="false" data-list-id="${esc(list.id)}">${esc(list.title)}</div>
      <button class="list-options-btn" data-list-id="${esc(list.id)}" title="List options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
      </button>
    </div>
    <div class="cards-container" data-list-id="${esc(list.id)}">
      ${list.cards.map(buildCardHTML).join('')}
    </div>
    <div class="add-card-area">
      <button class="add-card-btn" data-list-id="${esc(list.id)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        Add a card
      </button>
      <div class="add-card-form hidden" data-list-id="${esc(list.id)}">
        <textarea class="add-card-input" placeholder="Enter a title for this card…" rows="3"></textarea>
        <div class="form-controls">
          <button class="btn-primary save-new-card-btn" data-list-id="${esc(list.id)}">Add card</button>
          <button class="btn-icon-cancel cancel-new-card-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // List title edit
  const titleEl = el.querySelector('.list-title');
  titleEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    if (e.key === 'Escape') { titleEl.textContent = list.title; titleEl.blur(); }
  });
  titleEl.addEventListener('blur', () => {
    const val = titleEl.textContent.trim();
    if (val && val !== list.title) {
      list.title = val;
      saveState();
      document.getElementById('board-bar-name').textContent = state.boardName;
    } else {
      titleEl.textContent = list.title;
    }
  });
  // Prevent newlines in list title
  titleEl.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\n/g, ' ');
    document.execCommand('insertText', false, text);
  });

  // Options button
  el.querySelector('.list-options-btn').addEventListener('click', e => {
    e.stopPropagation();
    showListMenu(list.id, e.currentTarget);
  });

  // Add card
  el.querySelector('.add-card-btn').addEventListener('click', () => openAddCardForm(list.id, el));
  el.querySelector('.save-new-card-btn').addEventListener('click', () => commitAddCard(list.id, el));
  el.querySelector('.cancel-new-card-btn').addEventListener('click', () => closeAddCardForm(el));
  el.querySelector('.add-card-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitAddCard(list.id, el); }
    if (e.key === 'Escape') closeAddCardForm(el);
  });

  // Cards: click + drag
  el.querySelectorAll('.card').forEach(cardEl => {
    const cardId = cardEl.dataset.cardId;
    cardEl.querySelector('.card-edit-btn').addEventListener('click', e => {
      e.stopPropagation();
      openModal(cardId, list.id);
    });
    cardEl.addEventListener('click', () => openModal(cardId, list.id));
    setupDrag(cardEl);
  });

  // Drop zone
  const container = el.querySelector('.cards-container');
  container.addEventListener('dragover', e => handleDragOver(e, list.id));
  container.addEventListener('drop', e => handleDrop(e, list.id));
  container.addEventListener('dragleave', e => {
    if (!el.contains(e.relatedTarget)) container.querySelectorAll('.drop-indicator').forEach(d => d.remove());
  });

  return el;
}

function buildCardHTML(card) {
  const hasDesc = Boolean(card.description && card.description.trim());
  return `
    <div class="card" data-card-id="${esc(card.id)}" draggable="true">
      <div class="card-content">
        <div class="card-title">${esc(card.title)}</div>
        ${hasDesc ? `<div class="card-badges"><span class="card-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h12v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg></span></div>` : ''}
      </div>
      <button class="card-edit-btn" title="Edit card" tabindex="-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
      </button>
    </div>
  `;
}

// ─── Add Card form ────────────────────────────────────────────────────────────

function openAddCardForm(listId, listEl) {
  const form = listEl.querySelector('.add-card-form');
  const btn = listEl.querySelector('.add-card-btn');
  btn.classList.add('hidden');
  form.classList.remove('hidden');
  const ta = form.querySelector('.add-card-input');
  ta.value = '';
  ta.focus();
}

function closeAddCardForm(listEl) {
  const form = listEl.querySelector('.add-card-form');
  const btn = listEl.querySelector('.add-card-btn');
  form.classList.add('hidden');
  btn.classList.remove('hidden');
}

function commitAddCard(listId, listEl) {
  const ta = listEl.querySelector('.add-card-input');
  const title = ta.value.trim();
  if (!title) return;

  const list = state.lists.find(l => l.id === listId);
  if (!list) return;

  list.cards.push({ id: genCardId(), title, description: '' });
  saveState();

  // Re-render just this list's cards for speed, then full render
  render();

  // Re-open the form to add another card quickly
  const newListEl = document.querySelector(`.list[data-list-id="${listId}"]`);
  if (newListEl) openAddCardForm(listId, newListEl);
}

// ─── List Menu ────────────────────────────────────────────────────────────────

let activeContextMenu = null;

function closeContextMenu() {
  if (activeContextMenu) { activeContextMenu.remove(); activeContextMenu = null; }
}

function showListMenu(listId, anchorEl) {
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-header">
      List actions
      <button class="context-menu-close" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    </div>
    <button class="context-menu-item" data-action="add-card">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
      Add card…
    </button>
    <button class="context-menu-item" data-action="sort-az">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
      Sort alphabetically
    </button>
    <button class="context-menu-item danger" data-action="delete">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      Delete this list
    </button>
  `;

  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left}px`;
  document.body.appendChild(menu);
  activeContextMenu = menu;

  menu.querySelector('.context-menu-close').addEventListener('click', closeContextMenu);

  menu.querySelectorAll('.context-menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      closeContextMenu();
      if (action === 'add-card') {
        const listEl = document.querySelector(`.list[data-list-id="${listId}"]`);
        if (listEl) openAddCardForm(listId, listEl);
      } else if (action === 'sort-az') {
        const list = state.lists.find(l => l.id === listId);
        if (list) {
          list.cards.sort((a, b) => a.title.localeCompare(b.title));
          saveState(); render();
        }
      } else if (action === 'delete') {
        const list = state.lists.find(l => l.id === listId);
        if (list && confirm(`Delete list "${list.title}" and all its cards?`)) {
          state.lists = state.lists.filter(l => l.id !== listId);
          saveState(); render();
        }
      }
    });
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
  }, 0);
}

// ─── Add List form ────────────────────────────────────────────────────────────

function initAddList() {
  const btn = document.getElementById('add-list-btn');
  const form = document.getElementById('add-list-form');
  const input = document.getElementById('add-list-input');
  const saveBtn = document.getElementById('save-list-btn');
  const cancelBtn = document.getElementById('cancel-list-btn');

  btn.addEventListener('click', () => {
    btn.classList.add('hidden');
    form.classList.remove('hidden');
    input.value = '';
    input.focus();
    // Scroll to reveal the form
    document.getElementById('board').scrollLeft = 99999;
  });

  cancelBtn.addEventListener('click', resetAddList);

  saveBtn.addEventListener('click', commitAddList);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commitAddList();
    if (e.key === 'Escape') resetAddList();
  });
}

function resetAddList() {
  document.getElementById('add-list-form').classList.add('hidden');
  document.getElementById('add-list-btn').classList.remove('hidden');
}

function commitAddList() {
  const input = document.getElementById('add-list-input');
  const title = input.value.trim();
  if (!title) { input.focus(); return; }

  state.lists.push({ id: genListId(), title, cards: [] });
  saveState();
  render();
  resetAddList();
  // Re-open for quick successive adds
  document.getElementById('add-list-btn').click();
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────

function setupDrag(cardEl) {
  cardEl.addEventListener('mousedown', startDrag);
  cardEl.addEventListener('touchstart', startDrag, { passive: false });
}

let dragMoved = false;
let dragThreshold = 5;
let dragStartPos = null;
let pendingDragCard = null;

function startDrag(e) {
  if (e.target.closest('.card-edit-btn')) return;
  const cardEl = e.currentTarget;
  const cardId = cardEl.dataset.cardId;
  const listEl = cardEl.closest('.list');
  const listId = listEl.dataset.listId;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  dragStartPos = { x: clientX, y: clientY };
  pendingDragCard = { cardId, listId, cardEl };
  dragMoved = false;

  const onMove = (ev) => {
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const dx = cx - dragStartPos.x;
    const dy = cy - dragStartPos.y;

    if (!dragMoved && Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
      dragMoved = true;
      activateDrag(pendingDragCard.cardId, pendingDragCard.listId, pendingDragCard.cardEl, cx, cy);
    }

    if (dragState.active) {
      ev.preventDefault();
      moveDragGhost(cx, cy);
      updateDropTarget(cx, cy);
    }
  };

  const onUp = (ev) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);

    if (dragState.active) {
      commitDrop();
    }
    pendingDragCard = null;
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
}

function activateDrag(cardId, listId, cardEl, x, y) {
  const rect = cardEl.getBoundingClientRect();

  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.style.width = rect.width + 'px';
  ghost.style.left = (x - rect.width / 2) + 'px';
  ghost.style.top = (y - 20) + 'px';
  ghost.textContent = cardEl.querySelector('.card-title').textContent;
  document.body.appendChild(ghost);

  cardEl.classList.add('is-dragging');

  dragState = { active: true, cardId, sourceListId: listId, ghost, cardEl };
}

function moveDragGhost(x, y) {
  if (!dragState.ghost) return;
  const w = parseInt(dragState.ghost.style.width);
  dragState.ghost.style.left = (x - w / 2) + 'px';
  dragState.ghost.style.top = (y - 20) + 'px';
}

function updateDropTarget(x, y) {
  // Clear all existing indicators
  document.querySelectorAll('.drop-indicator').forEach(d => d.remove());

  const container = findContainerAt(x, y);
  if (!container) return;

  const listId = container.dataset.listId;
  const cards = [...container.querySelectorAll('.card:not(.is-dragging)')];
  const insertBefore = getInsertBeforeCard(cards, y);

  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';

  if (insertBefore) {
    container.insertBefore(indicator, insertBefore);
  } else {
    container.appendChild(indicator);
  }
}

function findContainerAt(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.classList.contains('cards-container')) return el;
    if (el.classList.contains('list')) return el.querySelector('.cards-container');
  }
  return null;
}

function getInsertBeforeCard(cards, y) {
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) return card;
  }
  return null;
}

function commitDrop() {
  const indicator = document.querySelector('.drop-indicator');
  const { cardId, sourceListId } = dragState;

  cleanDrag();

  if (!indicator) return;

  const container = indicator.parentElement;
  const targetListId = container.dataset.listId;
  if (!targetListId) return;

  const cards = [...container.querySelectorAll('.card:not(.is-dragging)')];
  let insertIndex = state.lists.find(l => l.id === targetListId).cards.length;

  // Find where the indicator sits among real cards
  const siblings = [...container.children];
  const indicatorIdx = siblings.indexOf(indicator);
  let countBefore = 0;
  for (const sibling of siblings.slice(0, indicatorIdx)) {
    if (sibling.classList.contains('card')) countBefore++;
  }
  insertIndex = countBefore;

  // Move card
  const srcList = state.lists.find(l => l.id === sourceListId);
  const tgtList = state.lists.find(l => l.id === targetListId);
  const cardIdx = srcList.cards.findIndex(c => c.id === cardId);
  const [card] = srcList.cards.splice(cardIdx, 1);

  if (sourceListId === targetListId && cardIdx < insertIndex) insertIndex--;
  tgtList.cards.splice(insertIndex, 0, card);

  saveState();
  render();

  document.querySelectorAll('.drop-indicator').forEach(d => d.remove());
}

function cleanDrag() {
  if (dragState.ghost) dragState.ghost.remove();
  if (dragState.cardEl) dragState.cardEl.classList.remove('is-dragging');
  document.querySelectorAll('.drop-indicator').forEach(d => d.remove());
  dragState = { active: false, cardId: null, sourceListId: null, ghost: null, cardEl: null };
}

// HTML5 drag fallback
function handleDragOver(e, listId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, listId) {
  e.preventDefault();
  const cardId = e.dataTransfer.getData('text/plain');
  if (!cardId) return;

  const container = e.currentTarget;
  const cards = [...container.querySelectorAll('.card')];
  const afterEl = getInsertBeforeCard(cards, e.clientY);

  const srcList = state.lists.find(l => l.id === dragState.sourceListId);
  const tgtList = state.lists.find(l => l.id === listId);
  if (!srcList || !tgtList) return;

  const cardIdx = srcList.cards.findIndex(c => c.id === cardId);
  const [card] = srcList.cards.splice(cardIdx, 1);

  let insertIndex = tgtList.cards.length;
  if (afterEl) {
    const idx = tgtList.cards.findIndex(c => c.id === afterEl.dataset.cardId);
    if (idx !== -1) insertIndex = idx;
  }
  if (dragState.sourceListId === listId && cardIdx < insertIndex) insertIndex--;
  tgtList.cards.splice(insertIndex, 0, card);

  saveState();
  render();
  cleanDrag();
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(cardId, listId) {
  const result = findCard(cardId);
  if (!result) return;
  const { card, list } = result;

  openCardId = cardId;
  openCardListId = listId;

  document.getElementById('modal-title').textContent = card.title;
  document.getElementById('modal-list-name').textContent = list.title;

  const desc = card.description || '';
  const descText = document.getElementById('desc-text');
  if (desc.trim()) {
    descText.textContent = desc;
    descText.classList.remove('desc-placeholder');
    document.getElementById('edit-desc-btn').classList.remove('hidden');
  } else {
    descText.textContent = 'Add a more detailed description…';
    descText.classList.add('desc-placeholder');
    document.getElementById('edit-desc-btn').classList.add('hidden');
  }
  document.getElementById('modal-description').value = desc;

  closeDescEditor();
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-title').focus();
}

function closeModal() {
  if (!openCardId) return;

  // Save title
  const newTitle = document.getElementById('modal-title').textContent.trim();
  const result = findCard(openCardId);
  if (result && newTitle) {
    result.card.title = newTitle;
    saveState();
    render();
  }

  document.getElementById('modal-overlay').classList.add('hidden');
  openCardId = null;
  openCardListId = null;
}

function openDescEditor() {
  document.getElementById('desc-display').classList.add('hidden');
  document.getElementById('edit-desc-btn').classList.add('hidden');
  document.getElementById('desc-editor').classList.remove('hidden');
  const ta = document.getElementById('modal-description');
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
}

function closeDescEditor() {
  document.getElementById('desc-display').classList.remove('hidden');
  document.getElementById('desc-editor').classList.add('hidden');
}

function saveDescription() {
  if (!openCardId) return;
  const desc = document.getElementById('modal-description').value;
  const result = findCard(openCardId);
  if (result) {
    result.card.description = desc;
    saveState();
  }

  const descText = document.getElementById('desc-text');
  if (desc.trim()) {
    descText.textContent = desc;
    descText.classList.remove('desc-placeholder');
    document.getElementById('edit-desc-btn').classList.remove('hidden');
  } else {
    descText.textContent = 'Add a more detailed description…';
    descText.classList.add('desc-placeholder');
    document.getElementById('edit-desc-btn').classList.add('hidden');
  }
  closeDescEditor();
}

function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Title save on blur
  document.getElementById('modal-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modal-title').blur(); }
  });

  // Description
  document.getElementById('desc-display').addEventListener('click', openDescEditor);
  document.getElementById('edit-desc-btn').addEventListener('click', openDescEditor);
  document.getElementById('save-desc-btn').addEventListener('click', saveDescription);
  document.getElementById('cancel-desc-btn').addEventListener('click', () => {
    if (openCardId) {
      const result = findCard(openCardId);
      if (result) document.getElementById('modal-description').value = result.card.description || '';
    }
    closeDescEditor();
  });
  document.getElementById('modal-description').addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const result = findCard(openCardId);
      if (result) document.getElementById('modal-description').value = result.card.description || '';
      closeDescEditor();
    }
  });

  // Delete
  document.getElementById('delete-card-btn').addEventListener('click', () => {
    if (!openCardId) return;
    const result = findCard(openCardId);
    if (!result) return;
    if (!confirm(`Delete card "${result.card.title}"?`)) return;

    result.list.cards = result.list.cards.filter(c => c.id !== openCardId);
    saveState();
    render();
    document.getElementById('modal-overlay').classList.add('hidden');
    openCardId = null;
    openCardListId = null;
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modal-overlay').classList.contains('hidden')) {
        if (!document.getElementById('desc-editor').classList.contains('hidden')) {
          closeDescEditor();
        } else {
          closeModal();
        }
      }
    }
  });
}

// ─── Board name ───────────────────────────────────────────────────────────────

function initBoardName() {
  const el = document.getElementById('board-name');
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { el.textContent = state.boardName; el.blur(); }
  });
  el.addEventListener('blur', () => {
    const val = el.textContent.trim();
    if (val) {
      state.boardName = val;
      document.getElementById('board-bar-name').textContent = val;
      document.title = `${val} | Trello Clone`;
      saveState();
    } else {
      el.textContent = state.boardName;
    }
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

loadState();
render();
initAddList();
initModal();
initBoardName();

document.title = `${state.boardName} | Trello Clone`;
