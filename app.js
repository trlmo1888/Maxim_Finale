// MAXIM - Card Revelation App
// v18 - 2026-02-16 12:00

console.log('========================================');
console.log('MAXIM APP.JS LOADING...');
console.log('========================================');

// App State
const state = {
    selectedSuit: null,
    selectedRank: null,
    targetCard: null, // Carta que el espectador nombró
    keyCard: null, // Carta de abajo que vemos
    currentStack: 'mnemonica',
    customStacks: {}, // Stacks personalizados creados por el usuario
    doubleClickEnabled: true, // Doble click en timer (true = sí, false = no)
    timerDefault: 15, // Segundos por defecto del timer
    stopMode: 1, // 1 = detener directo, 2 = detener sonido primero
    customStaticOuts: {}, // Se cargará con defaults
    dynamicOutsConfig: {
        sumaMinutos: { enabled: true, adelantarSi: 12, adelantarMinutos: 0 },
        letrasNombre: { enabled: true },
        sumaFecha: { enabled: true }
    },
    timer: {
        seconds: 0,
        interval: null,
        isRunning: false
    },
    stats: {
        performances: 0,
        lastCard: null
    }
};

// Card Stacks
const stacks = {
    mnemonica: [
        '4♣', '2♥', '7♦', '3♣', '4♥', '6♦', 'A♠', '5♥', '9♠', '2♠',
        'Q♥', '3♦', 'Q♣', '8♥', '6♠', '5♠', '9♥', 'K♣', '2♦', 'J♥',
        '3♠', '8♠', '6♥', '10♣', '5♦', 'K♦', '2♣', '3♥', '8♦', 'A♥',
        'K♠', '10♦', 'Q♠', 'J♣', '7♠', 'K♥', 'J♦', 'A♦', '4♠', 'Q♦',
        '7♥', '6♣', '10♠', 'A♣', '9♦', 'J♠', '9♣', '5♣', '8♣', '7♣',
        '4♦', '10♥'
    ],
    aronson: [
        'J♣', 'A♥', '9♠', '2♦', '7♣', '3♥', 'K♦', '4♠', 'A♣', '8♥',
        '5♦', 'Q♠', '6♣', '2♥', '10♦', 'J♠', '3♣', '9♥', '4♦', 'K♠',
        '7♥', 'A♦', '6♠', 'Q♣', '8♦', '3♠', '5♥', '10♠', '2♣', 'K♥',
        '9♦', '4♥', 'J♦', '6♥', 'A♠', 'Q♥', '7♦', '10♣', '5♠', '3♦',
        '8♠', '2♠', 'K♣', '9♣', '6♦', 'J♥', '4♣', 'Q♦', '7♠', '10♥',
        '5♣', '8♣'
    ],
    'eight-kings': generateEightKings(),
    'si-stebbins': generateSiStebbins(),
    custom: []
};

function generateEightKings() {
    const pattern = ['8', 'K', '3', '10', '2', '7', '9', '5', 'Q', '4', 'A', '6', 'J'];
    const suits = ['♣', '♥', '♠', '♦'];
    const deck = [];
    for (let i = 0; i < 52; i++) {
        deck.push(pattern[i % 13] + suits[i % 4]);
    }
    return deck;
}

function generateSiStebbins() {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['♣', '♥', '♠', '♦'];
    const deck = [];
    let rankIndex = 0, suitIndex = 0;
    for (let i = 0; i < 52; i++) {
        deck.push(ranks[rankIndex] + suits[suitIndex]);
        rankIndex = (rankIndex + 3) % 13;
        suitIndex = (suitIndex + 1) % 4;
    }
    return deck;
}

// Navigation Functions
function showScreen(screenId) {
    try {
        console.log('showScreen called with:', screenId);
        
        const allScreens = document.querySelectorAll('.screen, .perform-screen, .results-screen');
        console.log('Found screens:', allScreens.length);
        
        allScreens.forEach(s => s.classList.remove('active'));
        
        const screen = document.getElementById(screenId);
        console.log('Target screen found:', screen ? 'YES' : 'NO');
        
        if (screen) {
            screen.classList.add('active');
            console.log('Added active class to:', screenId);
        } else {
            console.error('Screen not found:', screenId);
            return;
        }
        
        // Cargar contenido especial según pantalla
        if (screenId === 'editOutsScreen') {
            showEditOuts();
        } else if (screenId === 'settingsScreen') {
            console.log('Loading dynamic outs config...');
            loadDynamicOutsConfig();
        } else if (screenId === 'stackScreen') {
            console.log('Loading stack display...');
            updateStackDisplay();
        }
        
        vibrate(30);
        console.log('showScreen completed successfully');
    } catch (error) {
        console.error('Error in showScreen:', error);
        alert('Error al cambiar de pantalla: ' + error.message);
    }
}

function showMainScreen() {
    showScreen('mainScreen');
    resetSelection();
}

function showTimerFirst() {
    // Ejecutar → Mostrar pantalla de palos (carta objetivo)
    showPerformScreen();
}

function showPerformScreen() {
    showScreen('performScreen');
    resetSelection();
}

function showRankScreen() {
    showScreen('rankScreen');
}

function showResultsScreen() {
    showScreen('resultsScreen');
}

// Card Selection - Step by Step
function selectSuitAndNext(suit) {
    state.selectedSuit = suit;
    vibrate(50);
    
    const buttons = document.querySelectorAll('.suit-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    
    setTimeout(() => {
        showRankScreen();
    }, 200);
}

function selectRankAndCalculate(rank) {
    state.selectedRank = rank;
    vibrate(50);
    
    // Highlight selected rank
    document.querySelectorAll('.rank-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    // Guardar carta objetivo (la que buscaremos)
    state.targetCard = formatCard(state.selectedRank, state.selectedSuit);
    
    // Abrir temporizador
    setTimeout(() => {
        if (typeof iosTimer !== 'undefined' && iosTimer) {
            iosTimer.open();
        }
    }, 200);
}

function selectSuit(suit) {
    state.selectedSuit = suit;
    const buttons = document.querySelectorAll('.suit-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    vibrate(30);
}

function selectRank(rank) {
    state.selectedRank = rank;
    const buttons = document.querySelectorAll('.rank-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    vibrate(30);
}

function resetSelection() {
    state.selectedSuit = null;
    state.selectedRank = null;
    const buttons = document.querySelectorAll('.suit-button, .rank-button');
    buttons.forEach(btn => btn.classList.remove('selected'));
}

// Key Card Selection (después del timer)
function selectKeySuitAndNext(suit) {
    state.selectedSuit = suit;
    vibrate(50);
    
    document.querySelectorAll('.suit-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    setTimeout(() => {
        showScreen('keyCardRankScreen');
    }, 200);
}

function selectKeyRankAndCalculate(rank) {
    state.selectedRank = rank;
    state.keyCard = formatCard(rank, state.selectedSuit);
    vibrate(50);
    
    document.querySelectorAll('.rank-button').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    
    setTimeout(() => {
        calculateTargetPosition();
    }, 200);
}

function calculateTargetPosition() {
    // Calcular posición de la carta objetivo basada en la key card
    const stack = stacks[state.currentStack];
    const keyPosition = stack.indexOf(state.keyCard) + 1;
    const targetPosition = stack.indexOf(state.targetCard) + 1;
    
    if (keyPosition === 0 || targetPosition === 0) {
        showNotification('Error: Carta no encontrada en el stack');
        return;
    }
    
    // Calcular distancia
    let distance;
    if (targetPosition > keyPosition) {
        distance = targetPosition - keyPosition;
    } else {
        distance = (52 - keyPosition) + targetPosition;
    }
    
    console.log('===== ANTES DE DISPLAY =====');
    console.log('Distance calculada:', distance);
    console.log('defaultStaticOuts:', typeof defaultStaticOuts);
    console.log('defaultStaticOuts[' + distance + ']:', defaultStaticOuts[distance]);
    console.log('============================');
    
    displayTargetResults(distance);
    showResultsScreen();
}

// Función para encontrar frase de deletreo
function findSpellingPhrase(targetDistance) {
    const targetName = getCardName(state.targetCard);
    const stack = stacks[state.currentStack];
    
    // Variantes de nombres de cartas
    const variants = [
        targetName, // "Rey de Diamantes"
        targetName.replace(' de ', ' '), // "Rey Diamantes"
        targetName.split(' de ')[0], // "Rey"
        targetName.split(' de ')[1] // "Diamantes"
    ];
    
    let result = null;
    
    // Probar desde arriba
    for (let removeCount = 0; removeCount <= 52; removeCount++) {
        for (const variant of variants) {
            const letterCount = variant.replace(/\s/g, '').length;
            const finalPosition = removeCount + letterCount;
            
            if (finalPosition === targetDistance) {
                result = {
                    phrase: variant,
                    fromTop: true,
                    remove: removeCount,
                    letterCount: letterCount,
                    exact: true
                };
                return result;
            }
        }
    }
    
    // Probar desde abajo
    for (let removeCount = 0; removeCount <= 52; removeCount++) {
        for (const variant of variants) {
            const letterCount = variant.replace(/\s/g, '').length;
            const finalPosition = removeCount + letterCount;
            
            if (finalPosition === (52 - targetDistance + 1)) {
                result = {
                    phrase: variant,
                    fromTop: false,
                    remove: removeCount,
                    letterCount: letterCount,
                    exact: true
                };
                return result;
            }
        }
    }
    
    // Si no encontramos exacto, buscar el más cercano
    let bestMatch = null;
    let minRemove = 999;
    
    for (let removeCount = 0; removeCount <= 30; removeCount++) {
        for (const variant of variants) {
            const letterCount = variant.replace(/\s/g, '').length;
            const finalPositionTop = removeCount + letterCount;
            const finalPositionBottom = removeCount + letterCount;
            
            // Desde arriba
            if (finalPositionTop > targetDistance && removeCount < minRemove) {
                bestMatch = {
                    phrase: variant,
                    fromTop: true,
                    remove: removeCount,
                    letterCount: letterCount,
                    exact: false,
                    needsAdjust: finalPositionTop - targetDistance
                };
                minRemove = removeCount;
            }
            
            // Desde abajo
            if (finalPositionBottom > (52 - targetDistance + 1) && removeCount < minRemove) {
                bestMatch = {
                    phrase: variant,
                    fromTop: false,
                    remove: removeCount,
                    letterCount: letterCount,
                    exact: false,
                    needsAdjust: finalPositionBottom - (52 - targetDistance + 1)
                };
                minRemove = removeCount;
            }
        }
    }
    
    return bestMatch || {
        phrase: targetName,
        fromTop: true,
        remove: 0,
        letterCount: targetName.replace(/\s/g, '').length,
        exact: false
    };
}

// Calculate Reveals
function calculateReveals() {
    if (!state.selectedSuit || !state.selectedRank) {
        showNotification('Por favor, selecciona una carta primero');
        return;
    }

    const card = formatCard(state.selectedRank, state.selectedSuit);
    const position = findPosition(card);

    if (position === -1) {
        showNotification('Carta no encontrada en el stack actual');
        return;
    }

    displayResults(card, position);
    showResultsScreen();
    
    state.stats.performances++;
    state.stats.lastCard = card;
    saveState();
    
    vibrate([50, 100, 50]);
}

function formatCard(rank, suit) {
    const suitSymbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };
    return rank + suitSymbols[suit];
}

function findPosition(card) {
    const stack = stacks[state.currentStack];
    return stack.indexOf(card) + 1;
}

function displayTargetResults(distance) {
    const targetName = getCardName(state.targetCard);
    const keyName = getCardName(state.keyCard);
    
    // Calcular posiciones
    const posFromTop = distance;
    const posFromBottom = 53 - distance;
    
    // **PRIMERO: Buscar Dynamic Outs**
    const dynamicOuts = [
        checkSumaMinutos(posFromTop),
        checkSumaMinutos(posFromBottom),
        checkLetrasNombre(posFromTop, state.currentStack),
        checkLetrasNombre(posFromBottom, state.currentStack),
        checkSumaFecha(posFromTop),
        checkSumaFecha(posFromBottom)
    ].filter(out => out !== null);
    
    let outText, outName, outPosition, outDirection;
    
    if (dynamicOuts.length > 0) {
        // Hay Dynamic Out - USAR
        const bestDynamic = dynamicOuts[0];
        outText = bestDynamic.text;
        outName = bestDynamic.name;
        outPosition = bestDynamic.position;
        outDirection = bestDynamic.fromBottom ? 'desde abajo' : 'desde arriba';
        
        console.log('🎯 DYNAMIC OUT encontrado:', outName);
    } else {
        // NO hay Dynamic - Usar Static Out
        outText = defaultStaticOuts[posFromTop];
        outName = 'Static Out';
        outPosition = posFromTop;
        outDirection = 'desde arriba';
        
        // Si no hay out para arriba, buscar para abajo
        if (!outText && defaultStaticOuts[posFromBottom]) {
            outText = defaultStaticOuts[posFromBottom];
            outPosition = posFromBottom;
            outDirection = 'desde abajo';
        }
        
        // Si aún no hay, usar genérico
        if (!outText) {
            outText = `Posición ${posFromTop}`;
        }
        
        console.log('📋 STATIC OUT usado');
    }
    
    console.log('=== REVELACIÓN ===');
    console.log('OUT Name:', outName);
    console.log('OUT Text:', outText);
    console.log('Posición:', outPosition, outDirection);
    console.log('==================');
    
    document.getElementById('selectedCardName').textContent = 'Revelaciones';
    
    const container = document.getElementById('revealMethods');
    
    // Buscar carta que coincida con las letras
    let matchingCard = null;
    const stack = stacks[state.currentStack];
    for (const card of stack) {
        const cardName = getCardName(card);
        const variants = [cardName, cardName.replace(' de ', ' ')];
        
        for (const variant of variants) {
            const letterCount = variant.replace(/\s/g, '').length;
            if (letterCount === distance || letterCount === posFromBottom) {
                matchingCard = variant;
                break;
            }
        }
        if (matchingCard) break;
    }
    
    container.innerHTML = `
        <div class="reveal-card" style="
            background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 24px;
            padding: 32px 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        ">
            <h3 style="
                margin: 0 0 24px 0;
                font-size: 18px;
                color: #fff;
                font-weight: 700;
                opacity: 0.9;
                letter-spacing: 0.5px;
            ">💬 ${outName}</h3>
            
            <div style="
                font-size: 20px;
                font-weight: 600;
                margin: 20px 0 30px;
                line-height: 1.6;
                color: #fff;
                text-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">
                ${outText}
            </div>
            
            ${matchingCard ? `
                <div style="
                    margin-top: 30px;
                    padding-top: 24px;
                    border-top: 2px solid rgba(255,255,255,0.2);
                ">
                    <p style="
                        font-size: 18px;
                        color: #a8e063;
                        margin: 0;
                        font-weight: 600;
                    ">
                        💚 Deletrea: "${matchingCard}"
                    </p>
                </div>
            ` : ''}
            
            <div style="
                margin-top: 30px;
                padding-top: 24px;
                border-top: 2px solid rgba(255,255,255,0.2);
            ">
                <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: #fff;">
                    ${posFromTop} desde arriba
                </div>
                
                <div style="font-size: 20px; font-weight: 600; margin-top: 20px; color: #fff;">
                    ${posFromBottom} desde abajo
                </div>
            </div>
        </div>
        
        <div style="
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            opacity: 0.7;
            font-size: 15px;
            border-top: 1px solid rgba(255,255,255,0.2);
            color: #fff;
        ">
            <div style="margin-bottom: 12px;">
                🎯 Carta Buscada: <strong>${targetName}</strong>
            </div>
            <div>
                🔑 Carta Vista: <strong>${keyName}</strong>
            </div>
        </div>
    `;
}

function displayResults(card, position) {
    const cardName = getCardName(card);
    document.getElementById('selectedCardName').textContent = cardName;

    const reveals = generateReveals(card, position, cardName);
    const container = document.getElementById('revealMethods');
    
    container.innerHTML = reveals.map(reveal => `
        <div class="reveal-card">
            <h3>${reveal.icon} ${reveal.title}</h3>
            <p>${reveal.description}</p>
            <div class="reveal-number">${reveal.number}</div>
            <p class="reveal-instruction">${reveal.instruction}</p>
            ${reveal.hasTimer ? `
                <button class="timer-launch-btn" onclick="launchQuickTimer(${reveal.timerSeconds})">
                    ⏱️ Temporizador ${reveal.timerSeconds}s
                </button>
            ` : ''}
        </div>
    `).join('');
}

function launchQuickTimer(seconds) {
    if (typeof iosTimer !== 'undefined' && iosTimer) {
        iosTimer.hours = 0;
        iosTimer.minutes = 0;
        iosTimer.seconds = seconds;
        iosTimer.open();
        
        setTimeout(() => {
            iosTimer.start();
        }, 500);
    }
    
    vibrate(50);
}

function getCardName(card) {
    const rankNames = {
        'A': 'As', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco',
        '6': 'Seis', '7': 'Siete', '8': 'Ocho', '9': 'Nueve', '10': 'Diez',
        'J': 'Jota', 'Q': 'Reina', 'K': 'Rey'
    };
    const suitNames = {
        '♥': 'Corazones', '♦': 'Diamantes', '♣': 'Tréboles', '♠': 'Picas'
    };
    const rank = card.slice(0, -1);
    const suit = card.slice(-1);
    return `${rankNames[rank]} de ${suitNames[suit]}`;
}

function generateReveals(card, position, cardName) {
    const reveals = [];
    const today = new Date();
    const dayOfMonth = today.getDate();

    if (document.getElementById('dateReveal') && document.getElementById('dateReveal').checked) {
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const dateStr = `${dayOfMonth} de ${months[today.getMonth()]}`;
        
        reveals.push({
            icon: '📅',
            title: 'Revelación por Fecha',
            description: `Hoy es ${dateStr}`,
            number: `Posición ${position}`,
            instruction: position === dayOfMonth 
                ? `¡La carta está en la posición ${position} - Cuenta ${dayOfMonth} cartas!`
                : `Desde arriba: ${position} cartas | Desde abajo: ${53 - position} cartas | Hoy: día ${dayOfMonth}`,
            hasTimer: false
        });
    }

    if (document.getElementById('spellingReveal') && document.getElementById('spellingReveal').checked) {
        const letterCount = cardName.replace(/\s/g, '').length;
        reveals.push({
            icon: '🔤',
            title: 'Revelación por Deletreo',
            description: 'Deletrea el nombre de la carta',
            number: `${letterCount} letras`,
            instruction: `"${cardName}" tiene ${letterCount} letras. ¡Cuenta una carta por letra!`,
            hasTimer: true,
            timerSeconds: letterCount
        });
    }

    reveals.push({
        icon: '📍',
        title: 'Posición Directa',
        description: 'Cuenta desde arriba o abajo',
        number: `#${position}`,
        instruction: `Desde arriba: ${position} | Desde abajo: ${53 - position}`,
        hasTimer: false
    });

    const luckyNumbers = [7, 13, 21];
    for (const lucky of luckyNumbers) {
        if (Math.abs(position - lucky) <= 2) {
            reveals.push({
                icon: '🎲',
                title: 'Número de la Suerte',
                description: `Cerca del número ${lucky}`,
                number: `Posición ${position}`,
                instruction: `"Piensa en un número de la suerte... ¿como el ${lucky}?" ¡La carta está en ${position}!`,
                hasTimer: false
            });
            break;
        }
    }

    return reveals.slice(0, 3);
}

// Settings
function changeStack() {
    const selector = document.getElementById('stackType');
    if (selector) {
        state.currentStack = selector.value;
        saveState();
        updateStackDisplay();
        updateHomeStackDisplay();
        showNotification(`Stack cambiado a ${state.currentStack}`);
    }
}
function changeStopMode() {
    const selector = document.getElementById('stopMode');
    if (selector) {
        state.stopMode = parseInt(selector.value);
        saveState();
        showNotification(`Modo detener: ${state.stopMode}`);
    }
}

// Edit Static Outs
function showEditOuts() {
    const container = document.getElementById('outsEditor');
    if (!container) return;
    
    let html = '';
    
    // Posiciones 1-26 (boca arriba)
    html += '<h3 style="margin-top: 0; margin-bottom: 16px;">Posiciones 1-26 (Boca Arriba)</h3>';
    for (let i = 1; i <= 26; i++) {
        const currentValue = state.customStaticOuts[i] || defaultStaticOuts[i] || '';
        html += `
            <div id="outItem_${i}" style="
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                position: relative;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="font-size: 15px;">Posición ${i}</strong>
                    <button onclick="toggleEditOut(${i})" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 4px 8px;
                    ">✏️</button>
                </div>
                <div id="outDisplay_${i}" style="font-size: 14px; opacity: 0.9; line-height: 1.5;">
                    ${currentValue}
                </div>
                <div id="outEdit_${i}" style="display: none;">
                    <textarea 
                        id="outInput_${i}" 
                        style="
                            width: 100%;
                            min-height: 60px;
                            padding: 12px;
                            border: 2px solid rgba(255,255,255,0.3);
                            border-radius: 8px;
                            background: rgba(0,0,0,0.3);
                            color: white;
                            font-size: 14px;
                            resize: vertical;
                            margin-bottom: 8px;
                        "
                    >${currentValue}</textarea>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="saveOut(${i})" style="
                            flex: 1;
                            padding: 10px;
                            background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        ">✓ Guardar</button>
                        <button onclick="cancelEditOut(${i})" style="
                            flex: 1;
                            padding: 10px;
                            background: rgba(255,255,255,0.1);
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        ">✕ Cancelar</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Posiciones especiales (boca abajo)
    html += '<h3 style="margin-top: 30px; margin-bottom: 16px;">Posiciones Especiales (Boca Abajo)</h3>';
    const specialPositions = [43, 44];
    for (const pos of specialPositions) {
        const currentValue = state.customStaticOuts[pos] || defaultStaticOuts[pos] || '';
        html += `
            <div id="outItem_${pos}" style="
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                position: relative;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="font-size: 15px;">Posición ${pos} (${53 - pos} boca abajo)</strong>
                    <button onclick="toggleEditOut(${pos})" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 4px 8px;
                    ">✏️</button>
                </div>
                <div id="outDisplay_${pos}" style="font-size: 14px; opacity: 0.9; line-height: 1.5;">
                    ${currentValue}
                </div>
                <div id="outEdit_${pos}" style="display: none;">
                    <textarea 
                        id="outInput_${pos}" 
                        style="
                            width: 100%;
                            min-height: 60px;
                            padding: 12px;
                            border: 2px solid rgba(255,255,255,0.3);
                            border-radius: 8px;
                            background: rgba(0,0,0,0.3);
                            color: white;
                            font-size: 14px;
                            resize: vertical;
                            margin-bottom: 8px;
                        "
                    >${currentValue}</textarea>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="saveOut(${pos})" style="
                            flex: 1;
                            padding: 10px;
                            background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        ">✓ Guardar</button>
                        <button onclick="cancelEditOut(${pos})" style="
                            flex: 1;
                            padding: 10px;
                            background: rgba(255,255,255,0.1);
                            border: 1px solid rgba(255,255,255,0.2);
                            border-radius: 8px;
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        ">✕ Cancelar</button>
                    </div>
                </div>
            </div>
        `;
    }
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function updateStaticOut(position) {
    const input = document.getElementById(`out_${position}`);
    if (input) {
        state.customStaticOuts[position] = input.value;
        saveState();
        showNotification(`Posición ${position} actualizada`);
    }
}

function resetStaticOuts() {
    if (confirm('¿Restaurar todas las Static Outs a sus valores por defecto?')) {
        state.customStaticOuts = { ...defaultStaticOuts };
        saveState();
        showEditOuts();
        showNotification('Static Outs restauradas');
    }
}

// Funciones para editor mejorado
function toggleEditOut(position) {
    const display = document.getElementById(`outDisplay_${position}`);
    const edit = document.getElementById(`outEdit_${position}`);
    
    if (display && edit) {
        display.style.display = 'none';
        edit.style.display = 'block';
    }
}

function saveOut(position) {
    const input = document.getElementById(`outInput_${position}`);
    const value = input.value.trim();
    
    if (value) {
        state.customStaticOuts[position] = value;
        saveState();
        
        // Actualizar display
        document.getElementById(`outDisplay_${position}`).textContent = value;
        cancelEditOut(position);
        
        showNotification('Out guardado');
    }
}

function cancelEditOut(position) {
    const display = document.getElementById(`outDisplay_${position}`);
    const edit = document.getElementById(`outEdit_${position}`);
    
    if (display && edit) {
        display.style.display = 'block';
        edit.style.display = 'none';
    }
}

// Toggle doble click
function toggleDoubleClick() {
    const checkbox = document.getElementById('doubleClickEnabled');
    if (checkbox) {
        state.doubleClickEnabled = checkbox.checked;
        saveState();
        showNotification(checkbox.checked ? 'Doble click activado' : 'Doble click desactivado');
    }
}

// Calculadora de Stack
let tempRank = null;
let tempCards = [];

function addRank(rank) {
    tempRank = rank;
    // Marcar visualmente
    document.querySelectorAll('.calc-btn').forEach(btn => {
        if (btn.textContent === rank) {
            btn.classList.add('selected');
            setTimeout(() => btn.classList.remove('selected'), 300);
        }
    });
}

function addSuit(suit) {
    if (!tempRank) {
        showNotification('⚠️ Primero elige un rango');
        return;
    }
    
    const card = tempRank + suit;
    tempCards.push(card);
    tempRank = null;
    
    updateStackDisplay();
}

function updateStackDisplay() {
    const display = document.getElementById('stackCards');
    const counter = document.getElementById('stackCount');
    
    if (tempCards.length === 0) {
        display.innerHTML = '<span style="opacity: 0.5;">Click rango + palo...</span>';
    } else {
        display.textContent = tempCards.join(' ');
    }
    
    counter.textContent = tempCards.length + ' / 52';
}

function deleteCard() {
    tempCards.pop();
    updateStackDisplay();
}

function saveNewStack() {
    const nameInput = document.getElementById('newStackName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('⚠️ Escribe un nombre');
        return;
    }
    
    if (tempCards.length !== 52) {
        showNotification('⚠️ Necesitas 52 cartas (tienes ' + tempCards.length + ')');
        return;
    }
    
    const stackId = 'custom_' + Date.now();
    
    if (!state.customStacks) {
        state.customStacks = {};
    }
    
    // Convertir cartas a formato stack
    const stackArray = tempCards.map(card => {
        const suit = card.slice(-1);
        const rank = card.slice(0, -1);
        return { rank, suit };
    });
    
    state.customStacks[stackId] = {
        name: name,
        cards: stackArray,
        createdAt: new Date().toISOString()
    };
    
    stacks[stackId] = stackArray;
    state.currentStack = stackId;
    
    saveState();
    updateStackSelector();
    
    // Limpiar
    tempCards = [];
    tempRank = null;
    nameInput.value = '';
    updateStackDisplay();
    
    showNotification('✅ Stack "' + name + '" creado');
}

function updateStackSelector() {
    const select = document.getElementById('stackType');
    if (!select) return;
    
    // Limpiar opciones actuales
    select.innerHTML = `
        <option value="mnemonica">Mnemonica (Tamariz)</option>
        <option value="aronson">Aronson Stack</option>
        <option value="eight-kings">Eight Kings</option>
        <option value="si-stebbins">Si Stebbins</option>
    `;
    
    // Añadir custom stacks
    if (state.customStacks) {
        Object.keys(state.customStacks).forEach(id => {
            const stack = state.customStacks[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = stack.name;
            select.appendChild(option);
        });
    }
    
    select.value = state.currentStack;
}

// Crear Stack (funciones antiguas - por si acaso)
function showCreateStackPopup() {
    document.getElementById('createStackPopup').style.display = 'flex';
    document.getElementById('newStackName').value = '';
    setTimeout(() => {
        document.getElementById('newStackName').focus();
    }, 100);
}

function closeCreateStackPopup() {
    document.getElementById('createStackPopup').style.display = 'none';
}

function createNewStack() {
    const nameInput = document.getElementById('newStackName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('⚠️ Escribe un nombre para el stack');
        return;
    }
    
    // Crear stack vacío
    const stackId = 'custom_' + Date.now();
    
    if (!state.customStacks) {
        state.customStacks = {};
    }
    
    state.customStacks[stackId] = {
        name: name,
        cards: [], // Stack vacío por ahora
        createdAt: new Date().toISOString()
    };
    
    // Añadir al objeto stacks global
    stacks[stackId] = [];
    
    // Cambiar a este stack
    state.currentStack = stackId;
    
    saveState();
    updateStackSelector();
    
    showNotification(`✅ Stack "${name}" creado`);
    closeCreateStackPopup();
}

// Actualizar adelantar opción
function updateAdelantarOpcion() {
    const select = document.getElementById('adelantarOpcion');
    if (!select) return;
    
    const value = select.value;
    
    if (value === 'disabled') {
        state.dynamicOutsConfig.sumaMinutos.adelantarSi = 0;
        state.dynamicOutsConfig.sumaMinutos.adelantarMinutos = 0;
    } else if (value.startsWith('manual')) {
        const mins = value === 'manual90' ? 1.5 : parseInt(value.replace('manual', ''));
        state.dynamicOutsConfig.sumaMinutos.adelantarSi = 0;
        state.dynamicOutsConfig.sumaMinutos.adelantarMinutos = mins;
    } else {
        const segs = parseInt(value);
        state.dynamicOutsConfig.sumaMinutos.adelantarSi = segs;
        state.dynamicOutsConfig.sumaMinutos.adelantarMinutos = 0;
    }
    
    saveState();
    showNotification('Configuración actualizada');
}

// Dynamic Outs Configuration
function toggleDynamicOut(outName) {
    const checkbox = document.getElementById(`dyn${outName.charAt(0).toUpperCase() + outName.slice(1)}`);
    if (checkbox && state.dynamicOutsConfig[outName]) {
        state.dynamicOutsConfig[outName].enabled = checkbox.checked;
        saveState();
        showNotification(`${outName}: ${checkbox.checked ? 'activada' : 'desactivada'}`);
    }
}

function updateDynamicConfig(outName, property, value) {
    if (state.dynamicOutsConfig[outName]) {
        state.dynamicOutsConfig[outName][property] = parseInt(value);
        saveState();
        showNotification(`Configuración actualizada`);
    }
}

function loadDynamicOutsConfig() {
    try {
        console.log('loadDynamicOutsConfig called');
        // Cargar checkboxes
        const sumaMinutosCheck = document.getElementById('dynSumaMinutos');
        const letrasNombreCheck = document.getElementById('dynLetrasNombre');
        const sumaFechaCheck = document.getElementById('dynSumaFecha');
        
        if (sumaMinutosCheck) sumaMinutosCheck.checked = state.dynamicOutsConfig.sumaMinutos.enabled;
        if (letrasNombreCheck) letrasNombreCheck.checked = state.dynamicOutsConfig.letrasNombre.enabled;
        if (sumaFechaCheck) sumaFechaCheck.checked = state.dynamicOutsConfig.sumaFecha.enabled;
        
        // Cargar valores
        const adelantarSi = document.getElementById('adelantarSi');
        const adelantarMinutos = document.getElementById('adelantarMinutos');
        
        if (adelantarSi) adelantarSi.value = state.dynamicOutsConfig.sumaMinutos.adelantarSi;
        if (adelantarMinutos) adelantarMinutos.value = state.dynamicOutsConfig.sumaMinutos.adelantarMinutos;
        
        console.log('loadDynamicOutsConfig completed');
    } catch (error) {
        console.error('Error in loadDynamicOutsConfig:', error);
    }
}

function updateHomeStackDisplay() {
    const stackNames = {
        'mnemonica': 'Mnemonica',
        'aronson': 'Aronson',
        'eight-kings': 'Eight Kings',
        'si-stebbins': 'Si Stebbins'
    };
    
    const el = document.getElementById('stackNameHome');
    if (el) {
        el.textContent = stackNames[state.currentStack] || state.currentStack;
    }
}

// Utilities
function showNotification(message) {
    const notif = document.getElementById('notification');
    if (notif) {
        notif.textContent = message;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 3000);
    }
}

function vibrate(pattern) {
    if ('vibrate' in navigator) {
        const vibrationOn = document.getElementById('vibrationOn');
        if (!vibrationOn || vibrationOn.checked) {
            navigator.vibrate(pattern);
        }
    }
}

function saveState() {
    try {
        localStorage.setItem('maximState', JSON.stringify(state));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('maximState');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(state, data);
            state.timer.interval = null;
            state.timer.isRunning = false;
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

function updateStackDisplay() {
    console.log('updateStackDisplay called');
    const stackList = document.getElementById('stackCardsList');
    const stackName = document.getElementById('currentStackName');
    
    console.log('stackList found:', !!stackList);
    console.log('current stack:', state.currentStack);
    
    if (!stackList) {
        console.error('stackCardsList element not found!');
        return;
    }
    
    const currentStack = stacks[state.currentStack];
    console.log('currentStack data:', currentStack ? currentStack.length + ' cards' : 'NULL');
    
    const stackNames = {
        'mnemonica': 'Mnemonica (Tamariz)',
        'aronson': 'Aronson Stack',
        'eight-kings': 'Eight Kings',
        'si-stebbins': 'Si Stebbins'
    };
    
    if (stackName) {
        stackName.textContent = stackNames[state.currentStack] || 'Stack Desconocido';
    }
    
    if (!currentStack) {
        console.error('Current stack is null!');
        return;
    }
    
    stackList.innerHTML = currentStack.map((card, index) => `
        <div style="
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            padding: 10px 5px;
            text-align: center;
            font-size: 12px;
        ">
            <div style="font-weight: 600; margin-bottom: 3px;">${index + 1}</div>
            <div style="font-size: 18px;">${card}</div>
        </div>
    `).join('');
    
    console.log('Stack display updated successfully');
}

// ============================================
// SISTEMA DE OUTS
// ============================================

// Dynamic Outs Functions
function checkSumaMinutos(position) {
    if (!state.dynamicOutsConfig.sumaMinutos.enabled) return null;
    
    const now = new Date();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    
    let willAdvance = false;
    let advanceText = '';
    
    // PRIORIDAD: Opción A > Opción B
    // Opción A: Si faltan menos de X segundos → adelantar 1 minuto (automático)
    const secondsUntilNext = 60 - seconds;
    if (state.dynamicOutsConfig.sumaMinutos.adelantarSi > 0 && secondsUntilNext < state.dynamicOutsConfig.sumaMinutos.adelantarSi) {
        minutes += 1;
        if (minutes >= 60) minutes -= 60;
        willAdvance = true;
        advanceText = 'En 1 min';
    }
    // Opción B: Adelantar X minutos (manual, siempre que X > 0) - SOLO si A no se activó
    else if (state.dynamicOutsConfig.sumaMinutos.adelantarMinutos > 0) {
        minutes += state.dynamicOutsConfig.sumaMinutos.adelantarMinutos;
        if (minutes >= 60) minutes -= 60;
        willAdvance = true;
        advanceText = `En ${state.dynamicOutsConfig.sumaMinutos.adelantarMinutos} min`;
    }
    
    const digit1 = Math.floor(minutes / 10);
    const digit2 = minutes % 10;
    const suma = digit1 + digit2;
    
    if (position === suma) {
        return {
            name: "Suma de Minutos",
            text: willAdvance ? 
                `${advanceText}, la hora sumará ${suma}` :
                `La hora suma ${suma}`,
            position: suma,
            fromBottom: false
        };
    }
    
    const posFromBottom = 53 - position;
    if (posFromBottom === suma) {
        return {
            name: "Suma de Minutos",
            text: willAdvance ?
                `${advanceText}, la hora sumará ${suma}` :
                `La hora suma ${suma}`,
            position: posFromBottom,
            fromBottom: true
        };
    }
    
    return null;
}

function checkLetrasNombre(position, currentStack) {
    if (!state.dynamicOutsConfig.letrasNombre.enabled) return null;
    
    const stack = stacks[currentStack];
    
    for (const card of stack) {
        const cardName = getCardName(card);
        const variants = [cardName, cardName.replace(' de ', ' ')];
        
        for (const variant of variants) {
            const letterCount = variant.replace(/\s/g, '').length;
            if (letterCount === position) {
                return {
                    name: "Letras del Nombre",
                    text: `Deletrea "${variant}"`,
                    position: position,
                    fromBottom: false
                };
            }
        }
    }
    
    const posFromBottom = 53 - position;
    for (const card of stack) {
        const cardName = getCardName(card);
        const variants = [cardName, cardName.replace(' de ', ' ')];
        
        for (const variant of variants) {
            const letterCount = variant.replace(/\s/g, '').length;
            if (letterCount === posFromBottom) {
                return {
                    name: "Letras del Nombre",
                    text: `Deletrea "${variant}"`,
                    position: posFromBottom,
                    fromBottom: true
                };
            }
        }
    }
    
    return null;
}

function checkSumaFecha(position) {
    if (!state.dynamicOutsConfig.sumaFecha.enabled) return null;
    
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const allDigits = String(day) + String(month) + String(year);
    const sumaTotal = allDigits.split('').reduce((acc, d) => acc + parseInt(d), 0);
    
    if (position === sumaTotal) {
        return {
            name: "Suma de Fecha",
            text: `La fecha suma ${sumaTotal}`,
            position: position,
            fromBottom: false
        };
    }
    
    const posFromBottom = 53 - position;
    if (posFromBottom === sumaTotal) {
        return {
            name: "Suma de Fecha",
            text: `La fecha suma ${sumaTotal}`,
            position: posFromBottom,
            fromBottom: true
        };
    }
    
    return null;
}

function findBestOut(targetPosition, currentStack) {
    // Buscar Dynamic Outs primero
    const dynamicOuts = [
        checkSumaMinutos(targetPosition),
        checkLetrasNombre(targetPosition, currentStack),
        checkSumaFecha(targetPosition)
    ].filter(out => out !== null);
    
    if (dynamicOuts.length > 0) {
        return dynamicOuts[0];
    }
    
    // Si no hay dynamic, usar static
    const staticText = defaultStaticOuts[targetPosition] || state.customStaticOuts[targetPosition] || `Posición ${targetPosition}`;
    const isFromBottom = targetPosition > 26;
    
    console.log('Static Text encontrado:', staticText);
    
    return {
        name: "Static Out",
        text: staticText,
        position: targetPosition,
        fromBottom: isFromBottom,
        isStatic: true
    };
}

// Static Outs por defecto (editables por usuario)
const defaultStaticOuts = {
    1: "Da vuelta la carta de arriba",
    2: "Quema la carta de arriba y abajo. Da vuelta la de arriba",
    3: "Quema DOS cartas de arriba y abajo. Da vuelta la de arriba",
    4: "Deletrea ASES",
    5: "Deletrea MAGIA",
    6: "Deletrea MAGIA!",
    7: "Piensa un número entre 1-10 O di que 7 es tu número de suerte",
    8: "Deletrea MISTERIO",
    9: "Han estado mezclando por 9 segundos",
    10: "Deletrea CARTASUERTE",
    11: "Deletrea ABRACADABRA",
    12: "Deletrea ABRACADABRA!",
    13: "Número de mala suerte 13",
    14: "Número de mala suerte 13!",
    15: "Deletrea COMOLOHAZHECHO",
    16: "Deletrea ESTASERAMICARTA",
    17: "Los cronometraste desde 17 segundos",
    18: "Forzaje 20-30!",
    19: "Forzaje 20-30",
    20: "Deletrea CREOQUEESTAESMICARTA",
    21: "Deletrea CREOQUEESTAESMICARTA!",
    22: "Deletrea INCOMPRENSIBILIDADES!",
    23: "El poder del número 23, conocido como 'el enigma 23'",
    24: "El poder del número 23, conocido como 'el enigma 23'!",
    25: "El temporizador marcó 25 segundos",
    26: "El temporizador marcó 26 segundos",
    43: "Forzaje 10-20",
    44: "Forzaje 10-20!"
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('MAXIM: DOM loaded');
    
    loadState();
    
    // Cargar Static Outs (usar defaults si no hay custom)
    if (!state.customStaticOuts || Object.keys(state.customStaticOuts).length === 0) {
        state.customStaticOuts = { ...defaultStaticOuts };
    }
    
    const stackType = document.getElementById('stackType');
    if (stackType) {
        stackType.value = state.currentStack;
    }
    
    const stopMode = document.getElementById('stopMode');
    if (stopMode) {
        stopMode.value = state.stopMode || 1;
    }
    
    // Inicializar checkboxes y selects de ajustes
    const doubleClickCheckbox = document.getElementById('doubleClickEnabled');
    if (doubleClickCheckbox) {
        doubleClickCheckbox.checked = state.doubleClickEnabled !== false;
    }
    
    // Inicializar select de adelantar minutos
    const adelantarSelect = document.getElementById('adelantarOpcion');
    if (adelantarSelect && state.dynamicOutsConfig?.sumaMinutos) {
        const config = state.dynamicOutsConfig.sumaMinutos;
        if (config.adelantarSi > 0) {
            adelantarSelect.value = config.adelantarSi.toString();
        } else if (config.adelantarMinutos > 0) {
            adelantarSelect.value = 'manual' + config.adelantarMinutos;
        } else {
            adelantarSelect.value = 'disabled';
        }
    }
    
    updateStackDisplay();
    updateHomeStackDisplay();
    
    console.log('MAXIM: Initialized');
});

// Service Worker - DESACTIVADO TEMPORALMENTE
// Descomenta cuando esté en producción y funcionando correctamente
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}
*/

console.log('MAXIM: app.js loaded');
console.log('========================================');
console.log('State initialized:', state);
console.log('showScreen function available:', typeof showScreen);
console.log('========================================');
