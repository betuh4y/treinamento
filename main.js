// CAMINHO CORRETO PARA SUA ESTRUTURA: VAZIO
const MODEL_BASE_PATH = ""; 

let model, webcam, maxPredictions;

let canetas = 0;
let erros = 0;

// --- VARIÁVEIS DE TEMPORIZADOR PARA CANETA ---
let canetaStartTime = 0;
let hasPenBeenCounted = false; 

// --- VARIÁVEIS DE TEMPORIZADOR PARA ERRO ---
let erroStartTime = 0;
let hasErrorBeenCounted = false; 

const requiredDuration = 5000; // 5 segundos

async function startCamera() {
    document.getElementById("status").innerText = "Carregando IA...";

    const modelURL = MODEL_BASE_PATH + "model.json"; 
    const metadataURL = MODEL_BASE_PATH + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        webcam = new tmImage.Webcam(320, 240, false); 
        await webcam.setup(); 
        await webcam.play();
        
        document.getElementById("webcam-container").appendChild(webcam.canvas);

        window.requestAnimationFrame(loop);

        document.getElementById("status").innerText = "Sistema ativo";
    } catch (e) {
        document.getElementById("status").innerText = "ERRO FATAL: Falha ao carregar modelo. (Verifique F12)";
        console.error("ERRO DE CARREGAMENTO:", e);
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (!webcam.canvas) return; 
    
    const prediction = await model.predict(webcam.canvas);

    let melhor = prediction[0];
    for (let p of prediction) {
        if (p.probability > melhor.probability) melhor = p;
    }

    const classe = melhor.className;
    const prob = melhor.probability;
    const threshold_counting = 0.96; // ⭐ NOVO LIMITE: 96%
    const threshold_reset = 0.80;      // Limite para liberar o contador

    // Exibe a porcentagem na tela
    document.getElementById("label-container").innerHTML =
        `${classe} — ${Math.round(prob * 100)}%`;

    
    // --- LÓGICA DE CONTROLE DE TEMPO ---

    const currentTime = Date.now();
    const isReadyToCount = (prob >= threshold_counting);
    const isErrorClass = (classe !== "Caneta" && classe !== "Nada");

    // =======================================================
    // 1. TEMPORIZADOR DA CANETA (5 SEGUNDOS a 96%+)
    // =======================================================
    if (classe === "Caneta" && isReadyToCount) {
        if (canetaStartTime === 0) {
            canetaStartTime = currentTime; // Inicia o temporizador
        }
        
        // CONTA se 5s se passaram E ainda não foi contada
        if (currentTime - canetaStartTime >= requiredDuration && !hasPenBeenCounted) {
            canetas++;
            document.getElementById("canetas").innerText = canetas;
            hasPenBeenCounted = true; // Trava
            canetaStartTime = 0; // Reseta o temporizador
        }
    } else {
        // RESET da caneta: Libera a próxima contagem APENAS se a confiança cair muito (abaixo de 80%) ou se for Nada
        canetaStartTime = 0; 
        if (prob < threshold_reset || classe === "Nada") {
             hasPenBeenCounted = false; 
        }
    }

    // =======================================================
    // 2. TEMPORIZADOR DE ERRO (5 SEGUNDOS a 96%+)
    // =======================================================
    if (isErrorClass && isReadyToCount) {
        if (erroStartTime === 0) {
            erroStartTime = currentTime; 
        }
        
        if (currentTime - erroStartTime >= requiredDuration && !hasErrorBeenCounted) {
            erros++;
            document.getElementById("erros").innerText = erros;
            hasErrorBeenCounted = true; 
            erroStartTime = 0; 
        }
    } else {
        // RESET do erro
        erroStartTime = 0; 
        if (prob < threshold_reset || classe === "Nada") {
            hasErrorBeenCounted = false; 
        }
    }
}

startCamera();