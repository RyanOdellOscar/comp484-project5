const QUIZ_LOCATIONS = [
  {
    name: "Oviatt Library",
    hint: "CSUN's main library where students study and borrow books.",
    lat: 34.23918,
    lng: -118.52962,
    radius: 100,
  },
  {
    name: "University Student Union",
    hint: "The student activity center with food, events, and services.",
    lat: 34.24308,
    lng: -118.52983,
    radius: 110,
  },
  {
    name: "Matadome",
    hint: "The red-roofed indoor stadium where CSUN plays basketball.",
    lat: 34.23618,
    lng: -118.52817,
    radius: 120,
  },
  {
    name: "Plaza del Sol",
    hint: "The central outdoor gathering space for campus events.",
    lat: 34.2388,
    lng: -118.52918,
    radius: 90,
  },
  {
    name: "Nordhoff Hall",
    hint: "A large classroom building near the heart of campus.",
    lat: 34.23856,
    lng: -118.52995,
    radius: 100,
  },
];

let map;
let currentQuestionIndex = 0;
let correctCount = 0;
let answerRecorded = false;
let targetCircle = null;
let userMarker = null;
let timerInterval = null;
let elapsedSeconds = 0;
let questions = [];

function initMap() {
  console.log("initMap called");
  const campusCenter = { lat: 34.23926, lng: -118.52902 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: campusCenter,
    zoom: 16.6,
    disableDefaultUI: true,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    gestureHandling: 'none',
  });

  map.addListener("click", handleMapDoubleClick);
  startGame();
}

function startGame() {
  console.log("startGame called");
  questions = shuffleArray(QUIZ_LOCATIONS).slice(0, 5);
  console.log("questions:", questions);
  currentQuestionIndex = 0;
  correctCount = 0;
  elapsedSeconds = 0;
  answerRecorded = false;
  clearMapMarkers();
  hideFinalCard();
  updateStatus();
  loadQuestion();
  startTimer();
  $("#next-button").prop("disabled", true).text("Next question");
}

function loadQuestion() {
  const question = questions[currentQuestionIndex];
  answerRecorded = false;
  clearMapMarkers();
  setFeedback("Double-click the map to submit your guess.", "normal");
  $("#location-name").text(question.name);
  $("#location-hint").text(question.hint);
  updateStatus();
}

function handleMapDoubleClick(event) {
  if (answerRecorded) {
    return;
  }

  const question = questions[currentQuestionIndex];
  const guessLat = event.latLng.lat();
  const guessLng = event.latLng.lng();
  const distance = computeDistanceMeters({ lat: guessLat, lng: guessLng }, question);
  const wasCorrect = distance <= question.radius;

  answerRecorded = true;
  correctCount += wasCorrect ? 1 : 0;
  showTargetArea(question, wasCorrect ? "#22c55e" : "#ef4444");
  placeUserMarker({ lat: guessLat, lng: guessLng }, wasCorrect ? "#2563eb" : "#7c3aed");

  if (wasCorrect) {
    setFeedback(
      `Great job! Your double-click was within ${Math.round(distance)} meters of ${question.name}.`,
      "success"
    );
  } else {
    setFeedback(
      `Not quite. The correct area is highlighted in red. Your guess was ${Math.round(distance)} meters away.`,
      "error"
    );
  }

  $("#next-button").prop("disabled", false);
  if (currentQuestionIndex === questions.length - 1) {
    $("#next-button").text("Show results");
  }
  updateStatus();
}

function showTargetArea(question, color) {
  clearTargetCircle();
  targetCircle = new google.maps.Circle({
    strokeColor: color,
    strokeOpacity: 0.95,
    strokeWeight: 3,
    fillColor: color,
    fillOpacity: 0.18,
    map,
    center: { lat: question.lat, lng: question.lng },
    radius: question.radius,
  });
}

function placeUserMarker(location, color) {
  if (userMarker) {
    userMarker.setMap(null);
  }
  userMarker = new google.maps.Marker({
    position: location,
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      scale: 9,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
    title: "Your answer",
  });
}

function updateStatus() {
  $("#question-count").text(`${currentQuestionIndex + 1} / ${questions.length}`);
  $("#score").text(correctCount);
  $("#timer").text(formatTime(elapsedSeconds));
}

function setFeedback(message, type) {
  const feedbackEl = $("#feedback");
  feedbackEl.text(message);
  feedbackEl.removeClass("success error normal");
  if (type === "success") {
    feedbackEl.addClass("success");
  } else if (type === "error") {
    feedbackEl.addClass("error");
  } else {
    feedbackEl.addClass("normal");
  }
}

function nextQuestion() {
  if (!answerRecorded) {
    return;
  }

  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex += 1;
    loadQuestion();
    $("#next-button").prop("disabled", true).text("Next question");
  } else {
    finishGame();
  }
}

function finishGame() {
  stopTimer();
  $("#location-name").text("Quiz complete!");
  $("#location-hint").text("Review your score and try again to beat your best time.");
  $("#final-summary").text(
    `You found ${correctCount} of ${questions.length} locations correctly in ${formatTime(elapsedSeconds)}.`
  );

  const best = loadBestScore();
  const isBest = isBestResult(correctCount, elapsedSeconds, best);
  if (isBest) {
    saveBestScore(correctCount, elapsedSeconds);
  }

  const finalBest = isBest ? { score: correctCount, time: elapsedSeconds } : best;
  $("#best-score").text(
    `Best score: ${finalBest.score} correct, fastest time ${formatTime(finalBest.time)}.`
  );
  showFinalCard();
}

function clearTargetCircle() {
  if (targetCircle) {
    targetCircle.setMap(null);
    targetCircle = null;
  }
}

function clearMapMarkers() {
  clearTargetCircle();
  if (userMarker) {
    userMarker.setMap(null);
    userMarker = null;
  }
}

function showFinalCard() {
  $("#final-card").removeClass("hidden");
}

function hideFinalCard() {
  $("#final-card").addClass("hidden");
}

function resetGame() {
  stopTimer();
  startGame();
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    $("#timer").text(formatTime(elapsedSeconds));
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function shuffleArray(array) {
  const copied = array.slice();
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function computeDistanceMeters(a, b) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371000;
  const lat1 = toRad(a.lat);
  const lon1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lon2 = toRad(b.lng);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function loadBestScore() {
  try {
    const stored = JSON.parse(localStorage.getItem("csun-map-quiz-best"));
    return stored || { score: 0, time: Number.MAX_SAFE_INTEGER };
  } catch (error) {
    return { score: 0, time: Number.MAX_SAFE_INTEGER };
  }
}

function saveBestScore(score, time) {
  localStorage.setItem(
    "csun-map-quiz-best",
    JSON.stringify({ score, time })
  );
}

function isBestResult(score, time, best) {
  if (score > best.score) {
    return true;
  }
  if (score === best.score && time < best.time) {
    return true;
  }
  return false;
}

$(document).ready(() => {
  $("#next-button").on("click", nextQuestion);
  $("#reset-button").on("click", resetGame);
  $("#play-again").on("click", () => {
    hideFinalCard();
    startGame();
  });
});

window.initMap = initMap;
