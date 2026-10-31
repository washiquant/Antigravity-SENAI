"use strict";

/**
 * Jogo de Jokenpô (Pedra, Papel e Tesoura)
 * Implementação limpa em Vanilla JavaScript com encapsulamento via IIFE.
 */
(() => {
  /* ==========================================================================
     Constantes e Configurações
     ========================================================================== */
  const CHOICES = ["pedra", "papel", "tesoura"];

  const EMOJI_MAP = {
    pedra: "✊",
    papel: "✋",
    tesoura: "✌️",
  };

  const LABELS = {
    pedra: "Pedra",
    papel: "Papel",
    tesoura: "Tesoura",
  };

  // Mapeamento de regras: Chave vence o Valor correspondente
  const WINNING_RULES = {
    pedra: "tesoura",
    papel: "pedra",
    tesoura: "papel",
  };

  const STORAGE_KEY = "jokenpo_game_state_v1";

  /* ==========================================================================
     Estado Único da Aplicação
     ========================================================================== */
  const state = {
    playerScore: 0,
    computerScore: 0,
    draws: 0,
    round: 1,
    gameMode: "free", // "free" | "bestOf3" | "bestOf5"
    history: [],      // Array com até 5 últimas rodadas
    isGameOver: false,
    isPlaying: false,
  };

  /* ==========================================================================
     Elementos do DOM
     ========================================================================== */
  const dom = {
    playerScore: document.getElementById("player-score"),
    computerScore: document.getElementById("computer-score"),
    drawsScore: document.getElementById("draws-score"),
    playerHand: document.getElementById("player-hand"),
    computerHand: document.getElementById("computer-hand"),
    countdownText: document.getElementById("countdown-text"),
    roundBadge: document.getElementById("round-badge"),
    choiceButtons: document.querySelectorAll(".btn-choice"),
    choiceContainer: document.getElementById("choice-buttons"),
    modeOptions: document.getElementById("mode-options"),
    historyList: document.getElementById("history-list"),
    btnReset: document.getElementById("btn-reset"),
    btnPlayAgain: document.getElementById("btn-play-again"),
    matchOverCard: document.getElementById("match-over-card"),
    matchOverTitle: document.getElementById("match-over-title"),
    matchOverDesc: document.getElementById("match-over-desc"),
    liveAnnouncer: document.getElementById("live-announcer"),
  };

  /* ==========================================================================
     Persistência (localStorage)
     ========================================================================== */

  /**
   * Salva o estado atual no localStorage com proteção try/catch
   */
  function saveState() {
    try {
      const dataToSave = {
        playerScore: state.playerScore,
        computerScore: state.computerScore,
        draws: state.draws,
        round: state.round,
        gameMode: state.gameMode,
        history: state.history,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn("Não foi possível salvar o estado no localStorage:", error);
    }
  }

  /**
   * Carrega o estado salvo previamente, se existir
   */
  function loadState() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        state.playerScore = Number(parsed.playerScore) || 0;
        state.computerScore = Number(parsed.computerScore) || 0;
        state.draws = Number(parsed.draws) || 0;
        state.round = Number(parsed.round) || 1;
        state.gameMode = parsed.gameMode || "free";
        state.history = Array.isArray(parsed.history) ? parsed.history : [];
      }
    } catch (error) {
      console.warn("Erro ao recuperar estado do localStorage:", error);
    }
  }

  /* ==========================================================================
     Regras de Negócio e Lógica do Jogo
     ========================================================================== */

  /**
   * Sorteia aleatoriamente a escolha do computador
   * @returns {string} 'pedra', 'papel' ou 'tesoura'
   */
  function getComputerChoice() {
    const randomIndex = Math.floor(Math.random() * CHOICES.length);
    return CHOICES[randomIndex];
  }

  /**
   * Determina o vencedor da rodada usando o mapa de regras
   * @param {string} player Escolha do jogador
   * @param {string} computer Escolha do computador
   * @returns {'win' | 'lose' | 'draw'}
   */
  function determineWinner(player, computer) {
    if (player === computer) {
      return "draw";
    }
    return WINNING_RULES[player] === computer ? "win" : "lose";
  }

  /**
   * Atualiza o placar e registra no histórico
   * @param {'win' | 'lose' | 'draw'} result
   * @param {string} playerChoice
   * @param {string} computerChoice
   */
  function updateScore(result, playerChoice, computerChoice) {
    if (result === "win") {
      state.playerScore += 1;
    } else if (result === "lose") {
      state.computerScore += 1;
    } else {
      state.draws += 1;
    }

    // Adiciona ao histórico (mantém até as 5 mais recentes)
    state.history.unshift({
      round: state.round,
      playerChoice,
      computerChoice,
      result,
    });

    if (state.history.length > 5) {
      state.history.pop();
    }

    state.round += 1;
    saveState();
  }

  /**
   * Verifica se a partida chegou ao fim nos modos de Melhor de 3 ou Melhor de 5
   * @returns {boolean}
   */
  function checkMatchEnd() {
    if (state.gameMode === "free") return false;

    const winsNeeded = state.gameMode === "bestOf3" ? 2 : 3;

    if (state.playerScore >= winsNeeded) {
      state.isGameOver = true;
      showMatchOver(true);
      return true;
    }

    if (state.computerScore >= winsNeeded) {
      state.isGameOver = true;
      showMatchOver(false);
      return true;
    }

    return false;
  }

  /* ==========================================================================
     Renderização e Interface do Usuário
     ========================================================================== */

  /**
   * Atualiza os números do placar na tela
   */
  function renderScoreboard() {
    dom.playerScore.textContent = state.playerScore;
    dom.computerScore.textContent = state.computerScore;
    dom.drawsScore.textContent = state.draws;
    dom.roundBadge.textContent = `Rodada ${state.round}`;
  }

  /**
   * Renderiza a lista das últimas 5 rodadas
   */
  function renderHistory() {
    if (state.history.length === 0) {
      dom.historyList.innerHTML = `<li class="history-empty">Nenhuma jogada realizada ainda.</li>`;
      return;
    }

    dom.historyList.innerHTML = state.history
      .map((item) => {
        const resultLabel =
          item.result === "win" ? "Vitória" : item.result === "lose" ? "Derrota" : "Empate";
        const playerEmoji = EMOJI_MAP[item.playerChoice];
        const computerEmoji = EMOJI_MAP[item.computerChoice];

        return `
          <li class="history-item ${item.result}">
            <span class="history-item-round">#${item.round}</span>
            <span class="history-item-moves">Você ${playerEmoji} vs ${computerEmoji} CPU</span>
            <span class="history-item-result">${resultLabel}</span>
          </li>
        `;
      })
      .join("");
  }

  /**
   * Habilita ou desabilita os botões de jogada
   * @param {boolean} disabled
   */
  function setButtonsDisabled(disabled) {
    dom.choiceButtons.forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  /**
   * Anuncia mensagem na região aria-live para leitores de tela
   * @param {string} message
   */
  function announceToScreenReader(message) {
    dom.liveAnnouncer.textContent = "";
    // Pequeno delay para garantir detecção de mudança pelo leitor de tela
    setTimeout(() => {
      dom.liveAnnouncer.textContent = message;
    }, 50);
  }

  /**
   * Mostra o resultado final da rodada no centro da arena
   * @param {'win' | 'lose' | 'draw'} result
   * @param {string} playerChoice
   * @param {string} computerChoice
   */
  function renderResult(result, playerChoice, computerChoice) {
    dom.countdownText.className = `countdown-text ${result} pulse`;

    let resultText = "";
    let speechText = "";

    if (result === "win") {
      resultText = "Você venceu! 🎉";
      speechText = `Vitória! Seu ${LABELS[playerChoice]} venceu o ${LABELS[computerChoice]} do computador.`;
    } else if (result === "lose") {
      resultText = "Você perdeu! 😢";
      speechText = `Derrota! O ${LABELS[computerChoice]} do computador venceu o seu ${LABELS[playerChoice]}.`;
    } else {
      resultText = "Deu empate! 🤝";
      speechText = `Empate! Ambos escolheram ${LABELS[playerChoice]}.`;
    }

    dom.countdownText.textContent = resultText;
    announceToScreenReader(speechText);
  }

  /**
   * Exibe a tela de final de partida (Melhor de 3/5)
   * @param {boolean} playerWon
   */
  function showMatchOver(playerWon) {
    dom.matchOverCard.classList.remove("hidden");
    if (playerWon) {
      dom.matchOverTitle.textContent = "🏆 Campeão da Partida!";
      dom.matchOverDesc.textContent = `Você atingiu a meta no modo ${
        state.gameMode === "bestOf3" ? "Melhor de 3" : "Melhor de 5"
      }!`;
      announceToScreenReader("Fim de partida! Você é o grande campeão!");
    } else {
      dom.matchOverTitle.textContent = "🤖 Vitória da CPU!";
      dom.matchOverDesc.textContent = `A CPU atingiu a meta no modo ${
        state.gameMode === "bestOf3" ? "Melhor de 3" : "Melhor de 5"
      }.`;
      announceToScreenReader("Fim de partida! A CPU venceu.");
    }
    setButtonsDisabled(true);
  }

  /* ==========================================================================
     Fluxo Principal da Jogada (Animação Jo-Ken-Pô)
     ========================================================================== */

  /**
   * Executa o ciclo da rodada com contagem de 1,5 segundos
   * @param {string} playerChoice
   */
  function playRound(playerChoice) {
    if (state.isPlaying || state.isGameOver) return;

    state.isPlaying = true;
    setButtonsDisabled(true);

    // Reseta mãos para posição de punho inicial fechado
    dom.playerHand.textContent = "✊";
    dom.computerHand.textContent = "✊";

    // Adiciona classe de animação de balanço
    dom.playerHand.classList.add("shaking-player");
    dom.computerHand.classList.add("shaking-computer");

    // Sequência da contagem verbal
    dom.countdownText.className = "countdown-text pulse";
    dom.countdownText.textContent = "Jo...";

    setTimeout(() => {
      dom.countdownText.textContent = "Ken...";
    }, 500);

    setTimeout(() => {
      dom.countdownText.textContent = "Pô!";
    }, 1000);

    // Finalização após ~1,5 segundos
    setTimeout(() => {
      // Remove classes de balanço
      dom.playerHand.classList.remove("shaking-player");
      dom.computerHand.classList.remove("shaking-computer");

      // Computador escolhe
      const computerChoice = getComputerChoice();

      // Exibe os emojis reais escolhidos
      dom.playerHand.textContent = EMOJI_MAP[playerChoice];
      dom.computerHand.textContent = EMOJI_MAP[computerChoice];

      // Determina resultado
      const result = determineWinner(playerChoice, computerChoice);

      // Atualiza pontuação e histórico
      updateScore(result, playerChoice, computerChoice);
      renderScoreboard();
      renderHistory();
      renderResult(result, playerChoice, computerChoice);

      // Verifica se houve encerramento da melhor de 3 ou 5
      const ended = checkMatchEnd();

      state.isPlaying = false;
      if (!ended) {
        setButtonsDisabled(false);
      }
    }, 1500);
  }

  /* ==========================================================================
     Controle de Reinício e Reset
     ========================================================================== */

  /**
   * Reinicia apenas a série atual (para Jogar Novamente)
   */
  function startNewSeries() {
    state.playerScore = 0;
    state.computerScore = 0;
    state.draws = 0;
    state.round = 1;
    state.isGameOver = false;
    state.isPlaying = false;

    dom.matchOverCard.classList.add("hidden");
    dom.countdownText.className = "countdown-text";
    dom.countdownText.textContent = "Faça sua jogada";
    dom.playerHand.textContent = "✊";
    dom.computerHand.textContent = "✊";

    setButtonsDisabled(false);
    renderScoreboard();
    saveState();
  }

  /**
   * Zera completamente o placar, histórico e limpa o localStorage
   */
  function resetGame() {
    state.playerScore = 0;
    state.computerScore = 0;
    state.draws = 0;
    state.round = 1;
    state.history = [];
    state.isGameOver = false;
    state.isPlaying = false;

    dom.matchOverCard.classList.add("hidden");
    dom.countdownText.className = "countdown-text";
    dom.countdownText.textContent = "Faça sua jogada";
    dom.playerHand.textContent = "✊";
    dom.computerHand.textContent = "✊";

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Falha ao limpar localStorage:", e);
    }

    setButtonsDisabled(false);
    renderScoreboard();
    renderHistory();
    announceToScreenReader("Placar e histórico zerados.");
  }

  /* ==========================================================================
     Event Listeners e Inicialização
     ========================================================================== */

  /**
   * Configura os ouvintes de eventos da página
   */
  function setupEventListeners() {
    // Delegação de evento: cliques nos botões de escolha
    dom.choiceContainer.addEventListener("click", (event) => {
      const button = event.target.closest(".btn-choice");
      if (!button || button.disabled) return;

      const choice = button.getAttribute("data-choice");
      if (choice && CHOICES.includes(choice)) {
        playRound(choice);
      }
    });

    // Atalhos pelo Teclado: 1 = Pedra, 2 = Papel, 3 = Tesoura
    window.addEventListener("keydown", (event) => {
      // Ignora se estiver em campo de digitação ou modal ativo
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (state.isPlaying || state.isGameOver) return;

      const keyChoiceMap = {
        "1": "pedra",
        "2": "papel",
        "3": "tesoura",
      };

      const selectedChoice = keyChoiceMap[event.key];
      if (selectedChoice) {
        playRound(selectedChoice);
      }
    });

    // Mudança de modo de jogo (Livre, Md3, Md5)
    dom.modeOptions.addEventListener("change", (event) => {
      if (event.target.name === "game-mode") {
        state.gameMode = event.target.value;
        startNewSeries();
      }
    });

    // Botão Zerar Placar
    dom.btnReset.addEventListener("click", resetGame);

    // Botão Jogar Novamente (após fim de partida)
    dom.btnPlayAgain.addEventListener("click", startNewSeries);
  }

  /**
   * Inicialização da aplicação ao carregar
   */
  function init() {
    loadState();

    // Sincroniza o radio button do modo salvo
    const activeRadio = dom.modeOptions.querySelector(
      `input[value="${state.gameMode}"]`
    );
    if (activeRadio) {
      activeRadio.checked = true;
    }

    renderScoreboard();
    renderHistory();
    setupEventListeners();
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

