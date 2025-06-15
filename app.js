const turfSelect = document.getElementById("turfSelect");
const slotContainer = document.getElementById("slotContainer");
const bookingForm = document.getElementById("bookingForm");
const startTimeInput = document.getElementById("startTime");
const durationInput = document.getElementById("duration");
const totalCostElement = document.getElementById("totalCost");
const dateInput = document.getElementById("date");

let selectedStart = null;
let bookedSlots = [];

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

// Firebase Setup
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

dateInput.addEventListener("change", loadSlots);
turfSelect.addEventListener("change", loadSlots);
durationInput.addEventListener("input", highlightSlots);

// Load booked slots
async function loadSlots() {
  slotContainer.innerHTML = "";
  selectedStart = null;
  const turf = turfSelect.value;
  const date = dateInput.value;
  if (!turf || !date) return;

  const snapshot = await db.collection("bookings")
    .where("turf", "==", turf)
    .where("date", "==", date)
    .get();

  bookedSlots = [];
  snapshot.forEach(doc => {
    const { time, duration } = doc.data();
    const start = parseInt(time.split(":")[0]);
    for (let i = 0; i < duration; i++) {
      bookedSlots.push(start + i);
    }
  });

  renderSlots();
}

function renderSlots() {
  slotContainer.innerHTML = "";
  HOURS.forEach(hour => {
    const isBooked = bookedSlots.includes(hour);
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.hour = hour;
    slot.innerText = formatHour(hour);

    if (isBooked) {
      slot.classList.add("booked");
    } else {
      slot.classList.add("available");
      slot.addEventListener("click", () => selectSlot(hour));
    }

    slotContainer.appendChild(slot);
  });
}

function selectSlot(hour) {
  const duration = parseInt(durationInput.value) || 1;

  // Check for overlap
  for (let i = 0; i < duration; i++) {
    if (bookedSlots.includes(hour + i)) {
      alert("Some selected hours are already booked!");
      return;
    }
  }

  selectedStart = hour;
  highlightSlots();
}

function highlightSlots() {
  const duration = parseInt(durationInput.value) || 1;
  const slots = document.querySelectorAll(".slot");
  slots.forEach(slot => {
    const hr = parseInt(slot.dataset.hour);
    slot.classList.remove("selected");

    if (selectedStart !== null &&
        hr >= selectedStart &&
        hr < selectedStart + duration &&
        !bookedSlots.includes(hr)) {
      slot.classList.add("selected");
    }
  });

  // Cost
  totalCostElement.innerText = "₹" + (duration * 700);
  startTimeInput.value = selectedStart !== null ? formatHour(selectedStart) : "";
}

// Format 0 -> 12 AM, 13 -> 1 PM etc.
function formatHour(h) {
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${suffix}`;
}

// Save Booking
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const turf = turfSelect.value;
  const date = dateInput.value;
  const duration = parseInt(durationInput.value);
  const time = startTimeInput.value;

  if (!selectedStart || !duration || !turf || !date || !time) {
    alert("Fill all fields and select slot.");
    return;
  }

  const bookingId = Date.now().toString();

  await db.collection("bookings").doc(bookingId).set({
    name, email, turf, date, time: `${selectedStart}:00`, duration
  });

  alert("Booking confirmed! Please proceed to UPI payment.");
  loadSlots();
});
