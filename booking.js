import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { db } from './firebase-config.js';

const slotContainer = document.getElementById("slotContainer");
const totalPriceEl = document.getElementById("totalPrice");
const hourInfo = document.getElementById("hourInfo");
const bookingForm = document.getElementById("bookingForm");

const pricePerHour = 700;
let selectedSlots = [];

function to12HourFormat(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${suffix}`;
}

function getDayNightTag(hour) {
  if (hour >= 6 && hour < 18) return "☀️ Day";
  return "🌙 Night";
}

const allSlots = Array.from({ length: 24 }, (_, i) => i);

function renderSlots() {
  slotContainer.innerHTML = "";
  allSlots.forEach((hr) => {
    const slot = document.createElement("div");
    slot.className = "slot available";
    slot.dataset.time = hr.toString();
    slot.innerText = `${to12HourFormat(hr)} — ${getDayNightTag(hr)}`;
    slotContainer.appendChild(slot);
  });
}

function updateTotal() {
  hourInfo.textContent = `⏱️ Selected Hours: ${selectedSlots.length}`;
  totalPriceEl.textContent = `💰 Total: ₹${selectedSlots.length * pricePerHour}`;
}

function toggleSlot(slotEl) {
  const time = parseInt(slotEl.dataset.time);
  if (slotEl.classList.contains("booked")) return;

  // Deselect if already selected
  if (slotEl.classList.contains("selected")) {
    slotEl.classList.remove("selected");
    selectedSlots = selectedSlots.filter(t => parseInt(t) !== time);
  } else {
    // If already selected some slot, allow only consecutive selection
    if (selectedSlots.length > 0) {
      const min = Math.min(...selectedSlots.map(Number));
      const max = Math.max(...selectedSlots.map(Number));
      if (time === max + 1 || time === min - 1) {
        selectedSlots.push(time.toString());
        slotEl.classList.add("selected");
      } else {
        alert("⚠️ Select consecutive hours only.");
      }
    } else {
      selectedSlots.push(time.toString());
      slotEl.classList.add("selected");
    }
  }
  selectedSlots = [...new Set(selectedSlots)].sort((a, b) => parseInt(a) - parseInt(b));
  updateTotal();
}

slotContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("slot")) {
    toggleSlot(e.target);
  }
});

async function loadBookedSlots() {
  const turf = document.getElementById("turf").value;
  const date = document.getElementById("date").value;
  if (!turf || !date) return;

  const q = query(
    collection(db, "bookings"),
    where("turf", "==", turf),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);

  const bookedSet = new Set();
  snapshot.forEach(doc => {
    const data = doc.data();
    (data.slots || []).forEach(slot => bookedSet.add(slot));
  });

  document.querySelectorAll(".slot").forEach(el => {
    const time = el.dataset.time;
    if (bookedSet.has(time)) {
      el.classList.remove("available", "selected");
      el.classList.add("booked");
    } else {
      el.classList.remove("booked", "selected");
      el.classList.add("available");
    }
  });

  selectedSlots = [];
  updateTotal();
}

document.getElementById("turf").addEventListener("change", loadBookedSlots);
document.getElementById("date").addEventListener("change", loadBookedSlots);

document.getElementById("phone").addEventListener("input", function () {
  this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
});

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const turf = document.getElementById("turf").value;
  const date = document.getElementById("date").value;

  if (!name || !phone || !turf || !date || selectedSlots.length === 0) {
    alert("⚠️ Please fill all fields and select at least 1 slot.");
    return;
  }

  try {
    await addDoc(collection(db, "bookings"), {
      name,
      phone,
      turf,
      date,
      slots: selectedSlots,
      timestamp: new Date().toISOString()
    });

    alert(`✅ Booking Confirmed!\nName: ${name}\nSlots: ${selectedSlots.join(", ")}\nTotal: ₹${selectedSlots.length * pricePerHour}\n\n📱 Please proceed with UPI payment.`);

    loadBookedSlots();
  } catch (err) {
    console.error("❌ Booking failed:", err);
    alert("❌ Error during booking. Please try again.");
  }
});

renderSlots();
