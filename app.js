/**
 * APLICAÇÃO: QUADRO KANBAN (COM COLUNAS DINÂMICAS E CATEGORIAS)
 * Foco: Gestão simples de tarefas, controle de prazos e fluxo de trabalho.
 * Persistência: LocalStorage (sem necessidade de backend ou login).
 */

// ==========================================================================
// 1. CONSTANTES E ESTADO DA APLICAÇÃO
// ==========================================================================
const STORAGE_TASKS_KEY = 'kanban_antigravity_tasks';
const STORAGE_COLUMNS_KEY = 'kanban_antigravity_columns';

// Lista de colunas (as 3 originais são fixas, novas colunas podem ser criadas)
let columns = loadColumnsFromStorage();

// Lista de tarefas carregada da memória local
let tasks = loadTasksFromStorage();

// Referência temporária para tarefa em processo de finalização atrasada
let pendingFinishTaskId = null;

// Filtro de categoria selecionado atualmente
let currentCategoryFilter = 'todas';

// ==========================================================================
// 2. ELEMENTOS DO DOM
// ==========================================================================
const boardContainer = document.getElementById('board-container');
const filterCategorySelect = document.getElementById('filter-category');

const stats = {
  total: document.getElementById('stat-total'),
  todo: document.getElementById('stat-todo'),
  progress: document.getElementById('stat-progress'),
  done: document.getElementById('stat-done'),
  overdue: document.getElementById('stat-overdue')
};

// Modal de Tarefa
const modalTask = document.getElementById('modal-task');
const formTask = document.getElementById('form-task');
const modalTitle = document.getElementById('modal-title');
const inputTaskId = document.getElementById('task-id');
const inputTaskTitle = document.getElementById('task-title');
const inputTaskDesc = document.getElementById('task-desc');
const inputTaskCategory = document.getElementById('task-category');
const inputTaskDeadline = document.getElementById('task-deadline');
const inputTaskStatus = document.getElementById('task-status');
const groupTaskStatus = document.getElementById('group-task-status');
const btnNovaTarefa = document.getElementById('btn-nova-tarefa');
const btnCloseModal = document.getElementById('modal-btn-close');
const btnCancelModal = document.getElementById('modal-btn-cancel');

// Modal de Coluna
const modalColumn = document.getElementById('modal-column');
const formColumn = document.getElementById('form-column');
const inputColumnName = document.getElementById('column-name');
const btnNovaColuna = document.getElementById('btn-nova-coluna');
const btnCloseModalColumn = document.getElementById('column-btn-close');
const btnCancelModalColumn = document.getElementById('column-btn-cancel');

// Modal de Justificativa para Vencidas
const modalOverdue = document.getElementById('modal-overdue');
const formOverdue = document.getElementById('form-overdue');
const overdueTaskId = document.getElementById('overdue-task-id');
const overdueNote = document.getElementById('overdue-note');
const overdueBtnCancel = document.getElementById('overdue-btn-cancel');

const toastContainer = document.getElementById('toast-container');

// ==========================================================================
// 3. PERSISTÊNCIA (LOCALSTORAGE)
// ==========================================================================
/**
 * Inicializa e recupera as colunas do quadro.
 * Garante que as 3 colunas base obrigatórias sempre existam.
 */
function loadColumnsFromStorage() {
  const defaultColumns = [
    { id: 'a-fazer', title: 'A Fazer', isFixed: true },
    { id: 'em-execucao', title: 'Em Execução', isFixed: true },
    { id: 'finalizado', title: 'Finalizado', isFixed: true }
  ];

  const data = localStorage.getItem(STORAGE_COLUMNS_KEY);
  if (!data) return defaultColumns;

  try {
    const parsed = JSON.parse(data);
    // Garante que as colunas fixas essenciais estejam presentes
    const hasTodo = parsed.some(c => c.id === 'a-fazer');
    const hasProgress = parsed.some(c => c.id === 'em-execucao');
    const hasDone = parsed.some(c => c.id === 'finalizado');

    if (!hasTodo || !hasProgress || !hasDone) {
      return defaultColumns;
    }
    return parsed;
  } catch (e) {
    console.error('Falha ao ler colunas locais:', e);
    return defaultColumns;
  }
}

function saveColumnsToStorage() {
  localStorage.setItem(STORAGE_COLUMNS_KEY, JSON.stringify(columns));
}

/**
 * Recupera as tarefas do LocalStorage com suporte a categorias.
 */
function loadTasksFromStorage() {
  const data = localStorage.getItem(STORAGE_TASKS_KEY);
  if (data) {
    try {
      const parsedTasks = JSON.parse(data);
      // Garante retrocompatibilidade adicionando categoria padrão caso não exista
      return parsedTasks.map(t => ({
        category: 'Geral',
        ...t
      }));
    } catch (e) {
      console.error('Falha ao ler dados locais:', e);
    }
  }

  // Exemplos iniciais com categorias e datas didáticas
  const hoje = getTodayDateString();
  const ontem = getRelativeDateString(-2);
  const amanha = getRelativeDateString(3);

  return [
    {
      id: generateId(),
      title: 'Explorar o Google Antigravity',
      description: 'Testar os recursos de criação de interfaces e agentes autônomos.',
      category: 'Estudos',
      deadline: amanha,
      status: 'a-fazer',
      createdAt: hoje,
      finishedAt: null,
      overdueNote: null
    },
    {
      id: generateId(),
      title: 'Construir o Quadro Kanban',
      description: 'Implementar a estrutura em HTML, CSS e JavaScript puro.',
      category: 'Projetos',
      deadline: hoje,
      status: 'em-execucao',
      createdAt: hoje,
      finishedAt: null,
      overdueNote: null
    },
    {
      id: generateId(),
      title: 'Configurar ambiente de estudos',
      description: 'Tarefa de exemplo já finalizada no prazo.',
      category: 'Geral',
      deadline: amanha,
      status: 'finalizado',
      createdAt: ontem,
      finishedAt: hoje,
      overdueNote: null
    }
  ];
}

function saveTasksToStorage() {
  localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
}

// ==========================================================================
// 4. FUNÇÕES DE UTILIDADE E DATAS
// ==========================================================================
function generateId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function isTaskOverdue(task) {
  if (task.status === 'finalizado') {
    if (task.finishedAt && task.deadline) {
      return task.finishedAt > task.deadline;
    }
    return false;
  }
  const hoje = getTodayDateString();
  return task.deadline < hoje;
}

// ==========================================================================
// 5. RENDERIZAÇÃO DO QUADRO E COLUNAS
// ==========================================================================
function renderBoard() {
  boardContainer.innerHTML = '';

  // Filtra as tarefas de acordo com a categoria selecionada
  const filteredTasks = currentCategoryFilter === 'todas'
    ? tasks
    : tasks.filter(t => t.category === currentCategoryFilter);

  // Contadores para o resumo do cabeçalho
  const summary = {
    total: tasks.length,
    todo: 0,
    progress: 0,
    done: 0,
    overdue: 0
  };

  tasks.forEach(task => {
    if (task.status === 'a-fazer') summary.todo++;
    else if (task.status === 'em-execucao') summary.progress++;
    else if (task.status === 'finalizado') summary.done++;

    if (isTaskOverdue(task) && task.status !== 'finalizado') {
      summary.overdue++;
    }
  });

  stats.total.textContent = summary.total;
  stats.todo.textContent = summary.todo;
  stats.progress.textContent = summary.progress;
  stats.done.textContent = summary.done;
  stats.overdue.textContent = summary.overdue;

  // Renderiza cada coluna (fixas e personalizadas)
  columns.forEach(col => {
    const colTasks = filteredTasks.filter(t => t.status === col.id);

    const columnEl = document.createElement('section');
    columnEl.className = 'column';
    columnEl.setAttribute('data-status', col.id);

    // Identificador de estilo da coluna
    let indicatorClass = '';
    if (col.id === 'a-fazer') indicatorClass = 'column-todo';
    else if (col.id === 'em-execucao') indicatorClass = 'column-progress';
    else if (col.id === 'finalizado') indicatorClass = 'column-done';

    // Cabeçalho da Coluna
    let headerHtml = `
      <div class="column-header ${indicatorClass}">
        <div class="column-title-group">
          <span class="column-indicator"></span>
          <h2>${escapeHTML(col.title)}</h2>
        </div>
        <div class="column-controls">
          <span class="badge-count" id="count-${col.id}">${colTasks.length}</span>
          ${!col.isFixed ? `
            <button type="button" class="btn-delete-column" title="Excluir Coluna" onclick="deleteColumn('${col.id}')">
              &times;
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Dropzone da Coluna
    const taskListEl = document.createElement('div');
    taskListEl.className = 'task-list';
    taskListEl.id = `list-${col.id}`;

    // Adiciona os cards de tarefas correspondentes
    colTasks.forEach(task => {
      const isOverdue = isTaskOverdue(task);
      const card = createTaskCardElement(task, isOverdue);
      taskListEl.appendChild(card);
    });

    columnEl.innerHTML = headerHtml;
    columnEl.appendChild(taskListEl);
    boardContainer.appendChild(columnEl);
  });

  // Reconfigura eventos de drag and drop nas colunas
  setupDropZones();

  // Atualiza as opções do formulário de criação de tarefa
  updateColumnSelectOptions();
}

/**
 * Cria o elemento HTML correspondente a um cartão de tarefa
 */
function createTaskCardElement(task, isOverdue) {
  const card = document.createElement('article');
  card.className = 'task-card';
  card.id = task.id;

  const isDone = task.status === 'finalizado';
  card.draggable = !isDone;

  if (isDone) {
    card.classList.add('is-done');
    card.setAttribute('title', 'Tarefas concluídas não podem ser movidas');
  }

  if (isOverdue && !isDone) {
    card.classList.add('is-overdue');
  }

  // Sanitiza a categoria para a classe CSS
  const catClass = 'tag-cat-' + (task.category || 'Geral').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let html = `
    <div class="card-header">
      <h4 class="card-title">${escapeHTML(task.title)}</h4>
    </div>
  `;

  if (task.description && task.description.trim() !== '') {
    html += `<p class="card-description">${escapeHTML(task.description)}</p>`;
  }

  // Metadados (Categoria, Prazo, Status)
  html += `<div class="card-meta">`;
  html += `<span class="tag tag-cat ${catClass}">${escapeHTML(task.category || 'Geral')}</span>`;

  if (isDone) {
    html += `<span class="tag tag-done">✓ Concluída (${formatDateBR(task.finishedAt || task.deadline)})</span>`;
  } else if (isOverdue) {
    html += `<span class="tag tag-overdue-alert">⚠ Atrasada - Prazo: ${formatDateBR(task.deadline)}</span>`;
  } else {
    html += `<span class="tag deadline-tag">Prazo: ${formatDateBR(task.deadline)}</span>`;
  }

  html += `</div>`;

  // Justificativa caso tenha sido finalizada fora do prazo
  if (isDone && task.overdueNote) {
    html += `
      <div class="card-note-box">
        <strong>Justificativa de atraso:</strong>
        ${escapeHTML(task.overdueNote)}
      </div>
    `;
  }

  // Ações do Card
  html += `<div class="card-actions">`;
  
  if (!isDone) {
    html += `
      <button type="button" class="btn-card btn-card-finish" onclick="handleFinishTaskRequest('${task.id}')">
        Concluir
      </button>
      <button type="button" class="btn-card" onclick="openEditTaskModal('${task.id}')">
        Editar
      </button>
    `;
  }

  html += `
    <button type="button" class="btn-card btn-card-danger" onclick="deleteTask('${task.id}')">
      Excluir
    </button>
  </div>`;

  card.innerHTML = html;

  if (!isDone) {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  }

  return card;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// 6. GERENCIAMENTO DE NOVAS COLUNAS
// ==========================================================================
btnNovaColuna.addEventListener('click', () => {
  formColumn.reset();
  modalColumn.classList.remove('hidden');
  inputColumnName.focus();
});

btnCloseModalColumn.addEventListener('click', () => modalColumn.classList.add('hidden'));
btnCancelModalColumn.addEventListener('click', () => modalColumn.classList.add('hidden'));

formColumn.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = inputColumnName.value.trim();

  if (!name) return;

  const newColId = 'col_' + Date.now();
  const newColumn = {
    id: newColId,
    title: name,
    isFixed: false
  };

  // Insere a nova coluna antes da coluna "finalizado" (que é fixa como última)
  const finalizadoIndex = columns.findIndex(c => c.id === 'finalizado');
  if (finalizadoIndex !== -1) {
    columns.splice(finalizadoIndex, 0, newColumn);
  } else {
    columns.push(newColumn);
  }

  saveColumnsToStorage();
  renderBoard();
  modalColumn.classList.add('hidden');
  showToast(`Coluna "${name}" criada com sucesso!`, 'success');
});

/**
 * Exclui uma coluna personalizada após confirmação,
 * realocando eventuais tarefas existentes para "A Fazer".
 */
window.deleteColumn = function(columnId) {
  const colIndex = columns.findIndex(c => c.id === columnId);
  if (colIndex === -1) return;

  const col = columns[colIndex];
  if (col.isFixed) {
    showToast('As 3 colunas base não podem ser removidas.', 'warning');
    return;
  }

  const tasksInCol = tasks.filter(t => t.status === columnId);
  let message = `Deseja realmente excluir a coluna "${col.title}"?`;
  if (tasksInCol.length > 0) {
    message += `\nAs ${tasksInCol.length} tarefas nela contidas serão movidas para "A Fazer".`;
  }

  if (!confirm(message)) return;

  // Move as tarefas da coluna excluída para 'a-fazer'
  tasks.forEach(t => {
    if (t.status === columnId) {
      t.status = 'a-fazer';
    }
  });

  columns.splice(colIndex, 1);
  saveColumnsToStorage();
  saveTasksToStorage();
  renderBoard();
  showToast(`Coluna "${col.title}" removida.`, 'warning');
};

/**
 * Atualiza o dropdown de status do modal de tarefa com as colunas disponíveis
 */
function updateColumnSelectOptions() {
  inputTaskStatus.innerHTML = '';
  // Filtra para não permitir cadastrar diretamente em 'finalizado' na criação
  columns.forEach(col => {
    const opt = document.createElement('option');
    opt.value = col.id;
    opt.textContent = col.title;
    inputTaskStatus.appendChild(opt);
  });
}

// ==========================================================================
// 7. SISTEMA DE DRAG AND DROP
// ==========================================================================
let draggedTaskId = null;

function handleDragStart(e) {
  draggedTaskId = this.id;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.id);
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.task-list').forEach(list => list.classList.remove('drag-over'));
}

function setupDropZones() {
  const columnElements = document.querySelectorAll('.column');

  columnElements.forEach(column => {
    const list = column.querySelector('.task-list');

    column.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    };

    column.ondragleave = (e) => {
      if (!column.contains(e.relatedTarget)) {
        list.classList.remove('drag-over');
      }
    };

    column.ondrop = (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
      const targetStatus = column.getAttribute('data-status');

      if (!taskId || !targetStatus) return;

      attemptMoveTask(taskId, targetStatus);
    };
  });
}

/**
 * Tenta mover uma tarefa validando as restrições de negócio
 */
function attemptMoveTask(taskId, targetStatus) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // RESTRIÇÃO 1: Tarefas concluídas não podem sofrer alterações de status
  if (task.status === 'finalizado') {
    showToast('Tarefas já concluídas não podem ter seu status alterado!', 'warning');
    return;
  }

  if (task.status === targetStatus) return;

  // Mudança para o status "finalizado"
  if (targetStatus === 'finalizado') {
    handleFinishTaskRequest(taskId);
    return;
  }

  // Movimentação normal entre colunas em aberto
  task.status = targetStatus;
  saveTasksToStorage();
  renderBoard();
  showToast('Tarefa movida com sucesso!', 'success');
}

// ==========================================================================
// 8. REGRAS DE FINALIZAÇÃO E CONTROLE DE PRAZOS
// ==========================================================================
function handleFinishTaskRequest(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.status === 'finalizado') {
    showToast('Esta tarefa já foi concluída.', 'warning');
    return;
  }

  const hoje = getTodayDateString();
  const isOverdue = task.deadline < hoje;

  // RESTRIÇÃO 2: Se a tarefa estiver vencida, exige justificativa obrigatória
  if (isOverdue) {
    pendingFinishTaskId = taskId;
    overdueTaskId.value = taskId;
    overdueNote.value = '';
    modalOverdue.classList.remove('hidden');
    overdueNote.focus();
  } else {
    // Tarefa dentro do prazo: finaliza diretamente
    finalizeTask(taskId, null);
  }
}

function finalizeTask(taskId, note) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.status = 'finalizado';
  task.finishedAt = getTodayDateString();
  task.overdueNote = note ? note.trim() : null;

  saveTasksToStorage();
  renderBoard();
  showToast('Tarefa concluída com sucesso!', 'success');
}

formOverdue.addEventListener('submit', (e) => {
  e.preventDefault();
  const note = overdueNote.value.trim();

  if (!note) {
    showToast('A justificativa é obrigatória para tarefas vencidas.', 'danger');
    return;
  }

  finalizeTask(pendingFinishTaskId, note);
  modalOverdue.classList.add('hidden');
  pendingFinishTaskId = null;
});

overdueBtnCancel.addEventListener('click', () => {
  modalOverdue.classList.add('hidden');
  pendingFinishTaskId = null;
});

// ==========================================================================
// 9. CADASTRO, EDIÇÃO E EXCLUSÃO (CRUD)
// ==========================================================================
btnNovaTarefa.addEventListener('click', () => {
  formTask.reset();
  inputTaskId.value = '';
  modalTitle.textContent = 'Nova Tarefa';
  inputTaskDeadline.value = getTodayDateString();
  inputTaskCategory.value = 'Trabalho';
  groupTaskStatus.style.display = 'block';
  modalTask.classList.remove('hidden');
  inputTaskTitle.focus();
});

window.openEditTaskModal = function(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.status === 'finalizado') {
    showToast('Tarefas concluídas não podem ser editadas.', 'warning');
    return;
  }

  inputTaskId.value = task.id;
  inputTaskTitle.value = task.title;
  inputTaskDesc.value = task.description || '';
  inputTaskCategory.value = task.category || 'Geral';
  inputTaskDeadline.value = task.deadline;
  inputTaskStatus.value = task.status;
  
  modalTitle.textContent = 'Editar Tarefa';
  groupTaskStatus.style.display = 'block';
  modalTask.classList.remove('hidden');
  inputTaskTitle.focus();
};

formTask.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = inputTaskId.value;
  const title = inputTaskTitle.value.trim();
  const description = inputTaskDesc.value.trim();
  const category = inputTaskCategory.value;
  const deadline = inputTaskDeadline.value;
  const status = inputTaskStatus.value;

  if (!title || !deadline) {
    showToast('Preencha os campos obrigatórios.', 'danger');
    return;
  }

  if (id) {
    // Modo Edição
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex].title = title;
      tasks[taskIndex].description = description;
      tasks[taskIndex].category = category;
      tasks[taskIndex].deadline = deadline;
      tasks[taskIndex].status = status;
      showToast('Tarefa atualizada com sucesso!', 'success');
    }
  } else {
    // Modo Criação
    const newTask = {
      id: generateId(),
      title,
      description,
      category,
      deadline,
      status: status || 'a-fazer',
      createdAt: getTodayDateString(),
      finishedAt: null,
      overdueNote: null
    };
    tasks.push(newTask);
    showToast('Nova tarefa criada!', 'success');
  }

  saveTasksToStorage();
  renderBoard();
  modalTask.classList.add('hidden');
});

btnCloseModal.addEventListener('click', () => modalTask.classList.add('hidden'));
btnCancelModal.addEventListener('click', () => modalTask.classList.add('hidden'));

window.deleteTask = function(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const confirmar = confirm(`Deseja realmente excluir a tarefa "${task.title}"?`);
  if (!confirmar) return;

  tasks = tasks.filter(t => t.id !== taskId);
  saveTasksToStorage();
  renderBoard();
  showToast('Tarefa removida.', 'warning');
};

// Filtro de Categoria no Quadro
filterCategorySelect.addEventListener('change', (e) => {
  currentCategoryFilter = e.target.value;
  renderBoard();
});

// ==========================================================================
// 10. FEEDBACK VISUAL (TOASTS)
// ==========================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

window.addEventListener('click', (e) => {
  if (e.target === modalTask) modalTask.classList.add('hidden');
  if (e.target === modalColumn) modalColumn.classList.add('hidden');
  if (e.target === modalOverdue) modalOverdue.classList.add('hidden');
});

// ==========================================================================
// 11. INICIALIZAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderBoard();
});
