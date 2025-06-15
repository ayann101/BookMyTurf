// Get Firestore from global scope
const db = window.db;

import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const slotContainer = document.getElementById("slots");
const totalPriceEl = document.getElementById("totalPrice");
const bookingForm = document.getElementById("bookingForm");

const allSlots = Array.from({ length: 24 }, (_, i) => `${i}:00`);
let selectedSlots = [];
const pricePerHour = 700;

// Load and display all time slots
function renderSlots() {
  slotContainer.innerHTML = "";
  allSlots.forEach((time) => {
    const slot = document.createElement("div");
    slot.className = "slot available";
    slot.innerText = time;
    slot.dataset.time = time;
    slotContainer.appendChild(slot);
  });
}

function updateTotalPrice() {
  totalPriceEl.textContent = `Total: ₹${selectedSlots.length * pricePerHour}`;
}

function toggleSlot(slotEl) {
  if (slotEl.classList.contains("booked")) return;
  const time = slotEl.dataset.time;
  if (selectedSlots.includes(time)) {
    selectedSlots = selectedSlots.filter(t => t !== time);
    slotEl.classList.remove("selected");
  } else {
    selectedSlots.push(time);
    slotEl.classList.add("selected");
  }
  updateTotalPrice();
}

slotContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("slot")) {
    toggleSlot(e.target);
  }
});

// Load already booked slots from Firestore
async function loadBookedSlots() {
  const turf = document.getElementById("turf").value;
  if (!turf) return;

  const q = query(collection(db, "bookings"), where("turf", "==", turf));
  const snapshot = await getDocs(q);

  const booked = new Set();
  snapshot.forEach(doc => {
    doc.data().slots.forEach(slot => booked.add(slot));
  });

  document.querySelectorAll(".slot").forEach(el => {
    if (booked.has(el.dataset.time)) {
      el.classList.remove("available", "selected");
      el.classList.add("booked");
    } else {
      el.classList.remove("booked", "selected");
      el.classList.add("available");
    }
  });

  selectedSlots = [];
  updateTotalPrice();
}

document.getElementById("turf").addEventListener("change", loadBookedSlots);

// Submit Booking
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const turf = document.getElementById("turf").value;

  if (!name || !phone || !turf || selectedSlots.length === 0) {
    alert("Please fill all fields and select slots.");
    return;
  }

  try {
    await addDoc(collection(db, "bookings"), {
      name,
      phone,
      turf,
      slots: selectedSlots,
      timestamp: new Date().toISOString()
    });

    alert("Booking confirmed! Please complete payment.");
    loadBookedSlots();
  } catch (err) {
    console.error("Error booking:", err);
    alert("Booking failed. Try again.");
  }
});

// Initialize
renderSlots();
