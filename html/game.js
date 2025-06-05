// Variable global para las preguntas (se cargará desde questions.js)
let allQuestions = [];

// Variables del juego
let currentQuestions = [];
let shuffledQuestions = [];
let currentQuestionIndex = 0;
let score = {
    correct: 0,
    incorrect: 0,
    passed: 0,
    remaining: 0
};
let timer;
let timeLeft = 150; // Tiempo inicial
let gameStarted = false;
let currentDifficulty = 'medium';

// Referencias a elementos del DOM
const roscoElement = document.getElementById('rosco');
const timerElement = document.getElementById('timer');
const correctCountElement = document.getElementById('correct-count');
const incorrectCountElement = document.getElementById('incorrect-count');
const passedCountElement = document.getElementById('passed-count');
const remainingCountElement = document.getElementById('remaining-count');
const currentLetterDisplay = document.getElementById('current-letter-text');
const questionElement = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const gameControls = document.getElementById('game-controls');
const startButton = document.getElementById('start-btn');
const difficultySelector = document.getElementById('difficulty');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const finalDifficultyElement = document.getElementById('final-difficulty');
const finalStatsElement = document.getElementById('final-stats');
const performanceMessageElement = document.getElementById('performance-message');
const hintTextElement = document.getElementById('hint-text');

const alphabet = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,Ñ,O,P,Q,R,S,T,U,V,W,X,Y,Z'.split(',');

// --- Funciones de Inicialización y Control del Juego ---

// Función para cargar preguntas únicas por letra y dificultad, evitando repetir preguntas usadas
function loadUniqueQuestionsByDifficulty(difficulty) {
    // Obtener historial de preguntas usadas
    let usedQuestions = JSON.parse(localStorage.getItem('usedQuestions')) || {};
    if (!usedQuestions[difficulty]) usedQuestions[difficulty] = {};

    const uniqueQuestions = [];

    alphabet.forEach(letter => {
        const questionsForLetter = questionDatabase[difficulty]?.[letter] || [];

        // Preguntas ya usadas para esta letra y dificultad
        const usedForLetter = usedQuestions[difficulty][letter] || [];

        // Filtrar preguntas no usadas
        const availableQuestions = questionsForLetter.filter(q => !usedForLetter.includes(q.answer));

        let selectedQuestion;

        if (availableQuestions.length > 0) {
            // Elegir aleatoriamente una pregunta no usada
            selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        } else if (questionsForLetter.length > 0) {
            // Si no quedan preguntas nuevas, elegir cualquiera (o podrías saltar la letra)
            selectedQuestion = questionsForLetter[Math.floor(Math.random() * questionsForLetter.length)];
        } else {
            // No hay preguntas para esta letra
            selectedQuestion = null;
        }

        if (selectedQuestion) {
            uniqueQuestions.push({
                difficulty: difficulty,
                letter: letter,
                question: selectedQuestion.question,
                answer: selectedQuestion.answer,
                hint: selectedQuestion.hint,
                status: null
            });
        }
    });

    return uniqueQuestions;
}

// Función para barajar un array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Función para preparar el rosco visual
function createRoscoLetters() {
    roscoElement.innerHTML = ''; // Limpiar rosco anterior
    const numLetters = alphabet.length;
    const angleStep = (2 * Math.PI) / numLetters;
    const radius = 170; // Radio para posicionar las letras

    for (let i = 0; i < numLetters; i++) {
        const angle = i * angleStep - Math.PI / 2; // -PI/2 para empezar desde arriba (A)
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        const letterDiv = document.createElement('div');
        letterDiv.classList.add('letter');
        letterDiv.id = `letter-${alphabet[i]}`;
        letterDiv.textContent = alphabet[i];
        letterDiv.style.left = `calc(50% + ${x}px - 22.5px)`; // Restar la mitad del ancho de la letra
        letterDiv.style.top = `calc(50% + ${y}px - 22.5px)`; // Restar la mitad del alto de la letra
        roscoElement.appendChild(letterDiv);
    }
}

// Función para iniciar el juego
function startGame() {
    if (gameStarted) return; // Evitar iniciar el juego múltiples veces

    gameStarted = true;
    resetGameState(); // Resetear el estado del juego al iniciar

    currentDifficulty = difficultySelector.value;

    // Cargar preguntas únicas por letra y dificultad
    shuffledQuestions = loadUniqueQuestionsByDifficulty(currentDifficulty);

    // Ordenar alfabéticamente por letra
    shuffledQuestions.sort((a, b) => alphabet.indexOf(a.letter) - alphabet.indexOf(b.letter));

    if (shuffledQuestions.length === 0) {
        alert("No hay preguntas para la dificultad seleccionada. Por favor, revisa `questions.js`.");
        gameStarted = false;
        return;
    }

    score.remaining = shuffledQuestions.length;
    updateStatsDisplay();

    startButton.textContent = 'REINICIAR JUEGO'; // Cambiar texto del botón
    startButton.onclick = resetGame; // Cambiar acción del botón

    gameControls.classList.remove('hidden');
    answerInput.disabled = false;
    answerInput.focus();

    startTimer();
    nextQuestion();
}

// Función para resetear el estado del juego
function resetGame() {
    clearInterval(timer); // Detener cualquier temporizador activo
    gameStarted = false;
    currentQuestionIndex = 0;
    score = { correct: 0, incorrect: 0, passed: 0, remaining: 0 };
    timeLeft = 150; // Resetear tiempo
    timerElement.textContent = timeLeft;
    timerElement.classList.remove('warning');
    answerInput.value = '';
    answerInput.disabled = true;
    questionElement.textContent = 'Presiona "COMENZAR JUEGO" para empezar tu desafío de Pasapalabra. ¡Tienes 150 segundos para completar el rosco!';
    currentLetterDisplay.textContent = '-';
    hintTextElement.classList.add('hidden');
    hintTextElement.textContent = '';
    gameOverScreen.style.display = 'none';

    // Limpiar clases del rosco
    document.querySelectorAll('.letter').forEach(letterDiv => {
        letterDiv.classList.remove('correct', 'incorrect', 'current', 'passed');
    });

    startButton.textContent = 'COMENZAR JUEGO';
    startButton.onclick = startGame;
    gameControls.classList.add('hidden'); // Ocultar controles hasta que empiece el juego
    updateStatsDisplay();
}

// Resetea el estado del juego sin cambiar el texto del botón de inicio
function resetGameState() {
    clearInterval(timer);
    currentQuestionIndex = 0;
    score = { correct: 0, incorrect: 0, passed: 0, remaining: 0 };
    timeLeft = 150;
    timerElement.textContent = timeLeft;
    timerElement.classList.remove('warning');
    answerInput.value = '';
    answerInput.disabled = false; // Habilitar al iniciar el juego
    questionElement.textContent = ''; // Limpiar la pregunta inicial
    currentLetterDisplay.textContent = '';
    hintTextElement.classList.add('hidden');
    hintTextElement.textContent = '';
    gameOverScreen.style.display = 'none';

    document.querySelectorAll('.letter').forEach(letterDiv => {
        letterDiv.classList.remove('correct', 'incorrect', 'current', 'passed');
    });

    updateStatsDisplay();
}

// Función para iniciar el temporizador
function startTimer() {
    clearInterval(timer); // Asegurarse de que no haya múltiples temporizadores
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;

        if (timeLeft <= 30) {
            timerElement.classList.add('warning');
        } else {
            timerElement.classList.remove('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

// Función para mostrar la siguiente pregunta
function nextQuestion() {
    if (score.remaining === 0 || timeLeft <= 0) {
        endGame();
        return;
    }

    let nextQ;
    let foundNext = false;
    let originalIndex = currentQuestionIndex; // Guarda el índice original para evitar bucles infinitos

    // Buscar la siguiente pregunta no respondida ni pasada
    while (!foundNext) {
        if (currentQuestionIndex >= shuffledQuestions.length) {
            currentQuestionIndex = 0; // Volver al inicio del rosco
        }

        nextQ = shuffledQuestions[currentQuestionIndex];

        // Si la pregunta no ha sido respondida (correct o incorrect) o está pasada
        if (!nextQ.status || nextQ.status === 'passed') {
            foundNext = true;
        } else {
            currentQuestionIndex++;
            if (currentQuestionIndex === originalIndex) {
                // Todas las preguntas han sido respondidas o pasadas
                foundNext = true; // Salir del bucle para terminar el juego
                nextQ = null; // No hay más preguntas para mostrar
            }
        }
    }

    if (nextQ) {
        const currentLetter = nextQ.letter;
        currentLetterDisplay.textContent = currentLetter;
        questionElement.textContent = nextQ.question;
        answerInput.value = ''; // Limpiar la respuesta anterior
        hintTextElement.classList.add('hidden'); // Ocultar pista
        hintTextElement.textContent = '';

        // Actualizar el estado visual de las letras en el rosco
        document.querySelectorAll('.letter').forEach(letterDiv => {
            letterDiv.classList.remove('current');
            const letterData = shuffledQuestions.find(q => q.letter === letterDiv.id.split('-')[1]);
            if (letterData && letterData.status) {
                letterDiv.classList.add(letterData.status);
            }
        });

        const currentLetterDiv = document.getElementById(`letter-${currentLetter}`);
        if (currentLetterDiv) {
            currentLetterDiv.classList.add('current');
        }
    } else {
        // No quedan preguntas por responder o pasar
        endGame();
    }
}

// Función para enviar la respuesta
function submitAnswer() {
    const currentQ = shuffledQuestions[currentQuestionIndex];
    if (!currentQ) return; // No hay pregunta actual

    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswer = currentQ.answer.toLowerCase();
    const letterDiv = document.getElementById(`letter-${currentQ.letter}`);

    if (userAnswer === correctAnswer) {
        score.correct++;
        score.remaining--;
        currentQ.status = 'correct'; // Marcar como correcta
        if (letterDiv) letterDiv.classList.add('correct');
    } else {
        score.incorrect++;
        score.remaining--;
        currentQ.status = 'incorrect'; // Marcar como incorrecta
        if (letterDiv) letterDiv.classList.add('incorrect');
    }

    updateStatsDisplay();
    currentQuestionIndex++; // Avanzar al siguiente índice
    nextQuestion();
}

// Función para pasar la palabra
function passWord() {
    const currentQ = shuffledQuestions[currentQuestionIndex];
    if (!currentQ) return;

    if (!currentQ.status) { // Solo si no ha sido respondida aún
        score.passed++;
        currentQ.status = 'passed'; // Marcar como pasada
        const letterDiv = document.getElementById(`letter-${currentQ.letter}`);
        if (letterDiv) letterDiv.classList.add('passed');
    }

    updateStatsDisplay();
    currentQuestionIndex++; // Avanzar al siguiente índice
    nextQuestion();
}

// Función para mostrar pista
function showHint() {
    const currentQ = shuffledQuestions[currentQuestionIndex];
    if (currentQ && currentQ.hint) {
        hintTextElement.textContent = currentQ.hint;
        hintTextElement.classList.remove('hidden');
    } else {
        hintTextElement.textContent = 'No hay pista disponible para esta palabra.';
        hintTextElement.classList.remove('hidden');
    }
}

// Función para actualizar el display de estadísticas
function updateStatsDisplay() {
    correctCountElement.textContent = score.correct;
    incorrectCountElement.textContent = score.incorrect;
    passedCountElement.textContent = score.passed;
    remainingCountElement.textContent = score.remaining;
}

// Función para terminar el juego
function endGame() {
    clearInterval(timer);
    gameStarted = false;
    gameOverScreen.style.display = 'flex';
    answerInput.disabled = true;
    gameControls.classList.add('hidden'); // Ocultar controles
    startButton.textContent = 'JUGAR DE NUEVO'; // Resetear botón de inicio para reintentar

    finalScoreElement.textContent = `${score.correct}`;
    finalDifficultyElement.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1); // Capitalizar

    finalStatsElement.innerHTML = `
        <p>Respuestas Correctas: <strong>${score.correct}</strong></p>
        <p>Respuestas Incorrectas: <strong>${score.incorrect}</strong></p>
        <p>Pasapalabras: <strong>${score.passed}</strong></p>
        <p>Tiempo Restante: <strong>${Math.max(0, timeLeft)}</strong> segundos</p>
    `;

    // Guardar preguntas usadas en localStorage para no repetirlas en próximas partidas
    let usedQuestions = JSON.parse(localStorage.getItem('usedQuestions')) || {};
    if (!usedQuestions[currentDifficulty]) usedQuestions[currentDifficulty] = {};

    shuffledQuestions.forEach(q => {
        if (!usedQuestions[currentDifficulty][q.letter]) {
            usedQuestions[currentDifficulty][q.letter] = [];
        }
        // Guardar solo si la respuesta fue correcta o incorrecta (no pasadas)
        if (q.status === 'correct' || q.status === 'incorrect') {
            if (!usedQuestions[currentDifficulty][q.letter].includes(q.answer)) {
                usedQuestions[currentDifficulty][q.letter].push(q.answer);
            }
        }
    });

    localStorage.setItem('usedQuestions', JSON.stringify(usedQuestions));

    // Mensaje de rendimiento
    let performanceClass = '';
    let performanceMessageText = '';
    const totalQuestions = shuffledQuestions.length;
    const correctPercentage = (score.correct / totalQuestions) * 100;

    if (correctPercentage >= 90) {
        performanceMessageText = '¡Excelente trabajo! Un verdadero campeón del Pasapalabra.';
        performanceClass = 'excellent';
    } else if (correctPercentage >= 70) {
        performanceMessageText = '¡Buen rendimiento! Sigue practicando para mejorar.';
        performanceClass = 'good';
    } else if (correctPercentage >= 40) {
        performanceMessageText = 'Resultado promedio. ¡Puedes hacerlo mejor!';
        performanceClass = 'average';
    } else {
        performanceMessageText = 'Necesitas más práctica. ¡No te rindas!';
        performanceClass = 'poor';
    }

    performanceMessageElement.textContent = performanceMessageText;
    performanceMessageElement.className = `performance-message ${performanceClass}`;
}
// Función para eliminar el historial de preguntas usadas
function clearHistory() {
    if (confirm("¿Estás seguro de que quieres eliminar el historial de preguntas usadas? Esto permitirá repetir preguntas en próximas partidas.")) {
        localStorage.removeItem('usedQuestions');
        alert("Historial eliminado correctamente.");
    }
}


// --- Event Listeners ---

// Al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    createRoscoLetters(); // Crear las letras del rosco al inicio
    updateStatsDisplay(); // Inicializar estadísticas
    // Asegurarse de que el input está deshabilitado al inicio
    answerInput.disabled = true;
    gameControls.classList.add('hidden');

    // Añadir listener para botón eliminar historial
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
});

// Función para eliminar el historial de preguntas usadas
function clearHistory() {
    if (confirm("¿Estás seguro de que quieres eliminar el historial de preguntas usadas? Esto permitirá repetir preguntas en próximas partidas.")) {
        localStorage.removeItem('usedQuestions');
        alert("Historial eliminado correctamente.");
    }
}
