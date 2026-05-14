// CSUN Campus Location Quiz - JavaScript Logic
// This file contains the game logic for an interactive map-based quiz
// Players must locate campus landmarks by double-clicking on a Google Map

// Quiz location data - defines all available campus locations
// Each location has a name, hint, coordinates, and acceptable radius
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
    name: "Citrus Hall",
    hint: "A residential hall on the east side of campus housing students.",
    lat: 34.2395,
    lng: -118.5274,
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
let mistakeMade = false;

function initMap() {
  console.log("initMap called");

  // Center the map on CSUN campus
  const campusCenter = { lat: 34.23926, lng: -118.52902 };

  // Create map with restricted controls and hidden labels
  map = new google.maps.Map(document.getElementById("map"), {
    center: campusCenter,
    zoom: 16.6,
    disableDefaultUI: true,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    gestureHandling: 'none',
    styles: [
      {
        elementType: "labels", // Hide all text labels on map
        stylers: [{ visibility: "off" }]
      }
    ]
  });

  // Add click listener to handle user guesses
  map.addListener("click", handleMapDoubleClick);

  // Start the quiz
  startGame();
}

// Initialize or reset the game state
function startGame() {
  console.log("startGame called");
  questions = shuffleArray(QUIZ_LOCATIONS).slice(0, 5);
  console.log("questions:", questions);

  // Reset all game state variables
  currentQuestionIndex = 0;
  correctCount = 0;
  elapsedSeconds = 0;
  answerRecorded = false;
  mistakeMade = false; // Reset mistake flag for new game

  // Clear any existing map markers
  clearMapMarkers();

  // Hide final results card
  hideFinalCard();

  // Update UI elements
  updateStatus();

  // Load first question
  loadQuestion();

  // Start the timer
  startTimer();

  // Reset next button state
  $("#next-button").prop("disabled", true).text("Next question");
}

// Load and display the current question
function loadQuestion() {
  const question = questions[currentQuestionIndex];

  // Reset answer state for new question
  answerRecorded = false;

  // Clear previous markers
  clearMapMarkers();

  // Set default feedback message
  setFeedback("Double-click the map to submit your guess.", "normal");
  if (mistakeMade) {
    $("#location-name").text(question.name);
  } else {
    $("#location-name").text("? ? ?");
  }

  // Display the hint
  $("#location-hint").text(question.hint);

  // Update status display
  updateStatus();
}

function handleMapDoubleClick(event) {
  // Prevent multiple answers for same question
  if (answerRecorded) {
    return;
  }

  const question = questions[currentQuestionIndex];

  // Get coordinates of user's click
  const guessLat = event.latLng.lat();
  const guessLng = event.latLng.lng();

  // Calculate distance from guess to correct location
  const distance = computeDistanceMeters({ lat: guessLat, lng: guessLng }, question);
  const wasCorrect = distance <= question.radius;

  // Record the answer
  answerRecorded = true;
  correctCount += wasCorrect ? 1 : 0;

  // If this is the first mistake, reveal location names for future questions
  if (!wasCorrect && !mistakeMade) {
    mistakeMade = true;
    $("#location-name").text(question.name);
  }

  // Show correct location area (green for correct, red for incorrect)
  showTargetArea(question, wasCorrect ? "#22c55e" : "#ef4444");

  // Place marker showing user's guess (blue for correct, purple for incorrect)
  placeUserMarker({ lat: guessLat, lng: guessLng }, wasCorrect ? "#2563eb" : "#7c3aed");

  // Provide feedback based on correctness
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

  // Enable next button
  $("#next-button").prop("disabled", false);

  // Change button text for final question
  if (currentQuestionIndex === questions.length - 1) {
    $("#next-button").text("Show results");
  }

  // Update status display
  updateStatus();
}

// Display the correct location area as a colored circle
function showTargetArea(question, color) {
  // Remove any existing target circle
  clearTargetCircle();

  // Create new circle showing acceptable area
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

// Place a marker showing where the user clicked
function placeUserMarker(location, color) {
  // Remove existing user marker
  if (userMarker) {
    userMarker.setMap(null);
  }

  // Create new marker with custom circle icon
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

// Update the status bar showing question count, score, and timer
function updateStatus() {
  $("#question-count").text(`${currentQuestionIndex + 1} / ${questions.length}`);
  $("#score").text(correctCount);
  $("#timer").text(formatTime(elapsedSeconds));
}

// Update the feedback message area with styling
function setFeedback(message, type) {
  const feedbackEl = $("#feedback");
  feedbackEl.text(message);

  // Remove existing styling classes
  feedbackEl.removeClass("success error normal");

  // Add appropriate styling class
  if (type === "success") {
    feedbackEl.addClass("success");
  } else if (type === "error") {
    feedbackEl.addClass("error");
  } else {
    feedbackEl.addClass("normal");
  }
}

// Advance to the next question or show results
function nextQuestion() {
  // Prevent advancing without answering current question
  if (!answerRecorded) {
    return;
  }

  // Check if there are more questions
  if (currentQuestionIndex < questions.length - 1) {
    // Load next question
    currentQuestionIndex += 1;
    loadQuestion();

    // Reset next button
    $("#next-button").prop("disabled", true).text("Next question");
  } else {
    // Quiz complete - show results
    finishGame();
  }
}

// Handle quiz completion and display final results
function finishGame() {
  // Stop the timer
  stopTimer();

  // Update display for completion
  $("#location-name").text("Quiz complete!");
  $("#location-hint").text("Review your score and try again to beat your best time.");

  // Show final summary
  $("#final-summary").text(
    `You found ${correctCount} of ${questions.length} locations correctly in ${formatTime(elapsedSeconds)}.`
  );

  // Check and update best score
  const best = loadBestScore();
  const isBest = isBestResult(correctCount, elapsedSeconds, best);
  if (isBest) {
    saveBestScore(correctCount, elapsedSeconds);
  }

  // Display best score
  const finalBest = isBest ? { score: correctCount, time: elapsedSeconds } : best;
  $("#best-score").text(
    `Best score: ${finalBest.score} correct, fastest time ${formatTime(finalBest.time)}.`
  );

  // Show final results card
  showFinalCard();
}

// Remove the target circle from the map
function clearTargetCircle() {
  if (targetCircle) {
    targetCircle.setMap(null);
    targetCircle = null;
  }
}

// Remove all markers and circles from the map
function clearMapMarkers() {
  clearTargetCircle();
  if (userMarker) {
    userMarker.setMap(null);
    userMarker = null;
  }
}

// Show the final results card
function showFinalCard() {
  $("#final-card").removeClass("hidden");
}

// Hide the final results card
function hideFinalCard() {
  $("#final-card").addClass("hidden");
}

// Reset and restart the game
function resetGame() {
  stopTimer();
  startGame();
}

// Start the game timer
function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    $("#timer").text(formatTime(elapsedSeconds));
  }, 1000);
}

// Stop the game timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Format seconds into MM:SS display
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

// Shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
  const copied = array.slice();
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

// Calculate distance between two coordinates using Haversine formula
function computeDistanceMeters(a, b) {
  // Convert degrees to radians
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const R = 6371000;
  const lat1 = toRad(a.lat);
  const lon1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lon2 = toRad(b.lng);

  // Calculate differences
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  // Haversine formula
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// Load best score from localStorage
function loadBestScore() {
  try {
    const stored = JSON.parse(localStorage.getItem("csun-map-quiz-best"));
    return stored || { score: 0, time: Number.MAX_SAFE_INTEGER };
  } catch (error) {
    // Return default if localStorage fails
    return { score: 0, time: Number.MAX_SAFE_INTEGER };
  }
}

// Save best score to localStorage
function saveBestScore(score, time) {
  localStorage.setItem(
    "csun-map-quiz-best",
    JSON.stringify({ score, time })
  );
}

// Check if current result is better than stored best
function isBestResult(score, time, best) {
  // Better if higher score, or same score with faster time
  if (score > best.score) {
    return true;
  }
  if (score === best.score && time < best.time) {
    return true;
  }
  return false;
}

// jQuery document ready - set up event listeners
$(document).ready(() => {
  // Next question button
  $("#next-button").on("click", nextQuestion);

  // Reset game button
  $("#reset-button").on("click", resetGame);

  // Play again button (in final results)
  $("#play-again").on("click", () => {
    hideFinalCard();
    startGame();
  });
});

// Make initMap function globally available for Google Maps API callback
window.initMap = initMap;
