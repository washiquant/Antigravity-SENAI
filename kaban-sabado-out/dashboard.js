/**
 * SCRIPT: DASHBOARD DE INDICADORES KANBAN
 * Foco: Consolidação de métricas, análise de prazos e gráfico por categorias.
 * Fonte de Dados: LocalStorage compartilhado com a página do Quadro.
 */

// Chaves de armazenamento do LocalStorage
const STORAGE_TASKS_KEY = 'kanban_antigravity_tasks';
const STORAGE_COLUMNS_KEY = 'kanban_antigravity_columns';

// Elementos do DOM
const dashDone = document.getElementById('dash-done');
const dashProgress = document.getElementById('dash-progress');
const dashPending = document.getElementById('dash-pending');
const dashOverdueFinished = document.getElementById('dash-overdue-finished');
const chartBarsContainer = document.getElementById('chart-bars-container');
const totalCategoriesCount = document.getElementById('total-categories-count');
const tableTasksBody = document.getElementById('table-tasks-body');

/**
 * Carrega as tarefas do LocalStorage
 */
function loadTasks() {
  const data = localStorage.getItem(STORAGE_TASKS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler tarefas:', e);
    return [];
  }
}

/**
 * Carrega a lista de colunas para mapear nomes de status amigáveis
 */
function loadColumns() {
  const data = localStorage.getItem(STORAGE_COLUMNS_KEY);
  if (!data) {
    return [
      { id: 'a-fazer', title: 'A Fazer' },
      { id: 'em-execucao', title: 'Em Execução' },
      { id: 'finalizado', title: 'Finalizado' }
    ];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * Formata data YYYY-MM-DD para DD/MM/AAAA
 */
function formatDateBR(dateString) {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Obtém a data de hoje no formato YYYY-MM-DD
 */
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Processa e renderiza todos os dados analíticos no Dashboard
 */
function renderDashboard() {
  const tasks = loadTasks();
  const columns = loadColumns();

  // Dicionário para mapear ID da coluna para seu título legível
  const columnMap = {};
  columns.forEach(c => {
    columnMap[c.id] = c.title;
  });

  const hoje = getTodayDateString();

  // 1. CÁLCULO DAS 4 MÉTRICAS PRINCIPAIS
  let countDone = 0;
  let countProgress = 0;
  let countPending = 0;
  let countOverdueFinished = 0;

  // Dicionário para contagem por categoria
  const categoriesCount = {
    'Trabalho': 0,
    'Estudos': 0,
    'Pessoal': 0,
    'Projetos': 0,
    'Geral': 0
  };

  tasks.forEach(task => {
    const isFinished = task.status === 'finalizado';
    const isOverdue = task.deadline < hoje;

    // Métricas
    if (isFinished) {
      countDone++;

      // Concluída fora do prazo: finalizada com nota de justificativa ou com data superior ao prazo
      const finishedLate = !!task.overdueNote || (task.finishedAt && task.deadline && task.finishedAt > task.deadline);
      if (finishedLate) {
        countOverdueFinished++;
      }
    } else {
      // Todas que não estão finalizadas são consideradas pendentes
      countPending++;

      if (task.status === 'em-execucao') {
        countProgress++;
      }
    }

    // Contagem de categorias
    const cat = task.category || 'Geral';
    categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
  });

  // Atualização dos cards na tela
  dashDone.textContent = countDone;
  dashProgress.textContent = countProgress;
  dashPending.textContent = countPending;
  dashOverdueFinished.textContent = countOverdueFinished;

  // 2. RENDERIZAÇÃO DO GRÁFICO POR CATEGORIA
  renderCategoryChart(categoriesCount, tasks.length);

  // 3. RENDERIZAÇÃO DA TABELA CONSOLIDADA DE TAREFAS
  renderTasksTable(tasks, columnMap, hoje);
}

/**
 * Renderiza o gráfico de barras por categoria com proporção e porcentagem
 */
function renderCategoryChart(categoriesCount, totalTasks) {
  chartBarsContainer.innerHTML = '';

  const entries = Object.entries(categoriesCount);
  totalCategoriesCount.textContent = `${entries.length} Categorias Monitoradas`;

  if (totalTasks === 0) {
    chartBarsContainer.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">Nenhuma tarefa cadastrada no momento.</p>';
    return;
  }

  entries.forEach(([categoryName, count]) => {
    const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
    const catSlug = categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const barRow = document.createElement('div');
    barRow.className = 'chart-bar-row';

    barRow.innerHTML = `
      <div class="chart-bar-info">
        <span style="display: inline-flex; align-items: center; gap: 0.4rem;">
          <span class="tag tag-cat tag-cat-${catSlug}">${escapeHTML(categoryName)}</span>
          <span style="color: var(--color-text-muted); font-size: 0.82rem;">(${count} ${count === 1 ? 'tarefa' : 'tarefas'})</span>
        </span>
        <span style="font-weight: 700; color: var(--color-text-main);">${percentage}%</span>
      </div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill bar-${catSlug}" style="width: ${percentage}%;"></div>
      </div>
    `;

    chartBarsContainer.appendChild(barRow);
  });
}

/**
 * Renderiza a listagem de tarefas no final do dashboard para consulta
 */
function renderTasksTable(tasks, columnMap, hoje) {
  tableTasksBody.innerHTML = '';

  if (tasks.length === 0) {
    tableTasksBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">Nenhuma tarefa cadastrada.</td></tr>';
    return;
  }

  tasks.forEach(task => {
    const tr = document.createElement('tr');
    const isDone = task.status === 'finalizado';
    const isLate = task.deadline < hoje;
    const catSlug = (task.category || 'Geral').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    let statusBadge = '';
    if (isDone) {
      if (task.overdueNote) {
        statusBadge = `<span class="tag tag-overdue-alert" title="Justificativa: ${escapeHTML(task.overdueNote)}">⚠ Concluída Fora do Prazo</span>`;
      } else {
        statusBadge = `<span class="tag tag-done">✓ Concluída no Prazo</span>`;
      }
    } else {
      if (isLate) {
        statusBadge = `<span class="tag tag-overdue-alert">⚠ Atrasada</span>`;
      } else {
        statusBadge = `<span class="tag deadline-tag">Em Dia</span>`;
      }
    }

    const colTitle = columnMap[task.status] || task.status;

    tr.innerHTML = `
      <td><strong>${escapeHTML(task.title)}</strong></td>
      <td><span class="tag tag-cat tag-cat-${catSlug}">${escapeHTML(task.category || 'Geral')}</span></td>
      <td>${escapeHTML(colTitle)}</td>
      <td>${formatDateBR(task.deadline)}</td>
      <td>${statusBadge}</td>
    `;

    tableTasksBody.appendChild(tr);
  });
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

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
});

