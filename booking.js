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
const selectedDateInput = document.getElementById("selectedDate");
const qrContainer = document.getElementById("qrContainer");
const downloadQRBtn = document.getElementById("downloadQR");

const pricePerHour = 700;
let selectedSlots = [];

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

function renderDates() {
  const today = new Date();
  const picker = document.getElementById("customDatePicker");
  picker.innerHTML = "";
  picker.style.display = "flex";
  picker.style.overflowX = "auto";
  picker.style.gap = "10px";
  picker.style.paddingBottom = "10px";

  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    const monthShort = months[date.getMonth()].slice(0, 3);
    const dayShort = days[date.getDay()].slice(0, 3);
    const display = `${monthShort} ${date.getDate()} ${dayShort}`;
    const value = date.toISOString().split("T")[0];

    const box = document.createElement("div");
    box.className = "date-box";
    box.innerText = display;
    box.dataset.value = value;

    box.addEventListener("click", () => {
      document.querySelectorAll(".date-box").forEach(b => b.classList.remove("selected"));
      box.classList.add("selected");
      selectedDateInput.value = value;
      loadBookedSlots();
    });

    picker.appendChild(box);
  }
}

function renderSlots() {
  slotContainer.innerHTML = "";
  const selectedDateStr = selectedDateInput.value;
  if (!selectedDateStr) return;

  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const slotDateTime = new Date(`${selectedDateStr}T${i.toString().padStart(2, "0")}:00:00`);

    const hour = i % 12 === 0 ? 12 : i % 12;
    const ampm = i >= 12 ? "PM" : "AM";
    const timeStr = `${hour.toString().padStart(2, '0')}:00 ${ampm}`;

    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.time = i.toString();
    slot.dataset.type = i < 18 ? "day" : "night";
    slot.innerText = timeStr;

    if (slotDateTime <= now) {
      slot.classList.add("booked");
      slot.style.opacity = 0.4;
      slot.style.cursor = "not-allowed";
    } else {
      slot.classList.add("available");
    }

    slotContainer.appendChild(slot);
  }
}

function updateTotal() {
  hourInfo.innerText = `Selected Hours: ${selectedSlots.length}`;
  totalPriceEl.innerText = `Total: ₹${selectedSlots.length * pricePerHour}`;
}

function toggleSlot(el) {
  const time = parseInt(el.dataset.time);
  if (el.classList.contains("booked")) return;

  if (el.classList.contains("selected")) {
    el.classList.remove("selected");
    selectedSlots = selectedSlots.filter(t => parseInt(t) !== time);
  } else {
    if (selectedSlots.length > 0) {
      const min = Math.min(...selectedSlots.map(Number));
      const max = Math.max(...selectedSlots.map(Number));
      if (time === max + 1 || time === min - 1) {
        selectedSlots.push(time.toString());
        el.classList.add("selected");
      } else {
        alert("Select consecutive slots only.");
      }
    } else {
      selectedSlots.push(time.toString());
      el.classList.add("selected");
    }
  }

  updateTotal();
}

slotContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("slot")) {
    toggleSlot(e.target);
  }
});

async function loadBookedSlots() {
  renderSlots();

  const turf = document.getElementById("turf").value;
  const date = selectedDateInput.value;
  if (!turf || !date) return;

  const q = query(collection(db, "bookings"), where("turf", "==", turf), where("date", "==", date));
  const snapshot = await getDocs(q);

  const booked = new Set();
  snapshot.forEach(doc => {
    (doc.data().slots || []).forEach(s => booked.add(s));
  });

  document.querySelectorAll(".slot").forEach(el => {
    const time = el.dataset.time;
    if (booked.has(time)) {
      el.classList.remove("available", "selected");
      el.classList.add("booked");
    }
  });

  selectedSlots = [];
  updateTotal();
}

document.getElementById("turf").addEventListener("change", loadBookedSlots);
document.getElementById("phone").addEventListener("input", function () {
  this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
});

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const turf = document.getElementById("turf").value;
  const date = selectedDateInput.value;

  if (!name || !phone || !turf || !date || selectedSlots.length === 0) {
    alert("Please fill all fields and select at least 1 slot.");
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

    alert(`\u2705 Booking Confirmed!\nName: ${name}\nSlots: ${selectedSlots.join(", ")}\nTotal: ₹${selectedSlots.length * pricePerHour}`);

    const qrText = `Name: ${name}\nPhone: ${phone}\nTurf: ${turf}\nDate: ${date}\nSlots: ${selectedSlots.join(", ")}`;
    qrContainer.innerHTML = "";
    const qr = new QRCode(qrContainer, {
      text: qrText,
      width: 200,
      height: 200,
      colorDark: "#000",
      colorLight: "#fff",
      correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
      const qrCanvas = qrContainer.querySelector("canvas");
      if (qrCanvas) {
        downloadQRBtn.style.display = "inline-block";
        downloadQRBtn.onclick = () => {
          const url = qrCanvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url;
          a.download = `Booking_QR_${name}_${date}.png`;
          a.click();
        };
      }
    }, 500);

    loadBookedSlots();
  } catch (err) {
    console.error("Booking failed:", err);
    alert("Error during booking. Please try again.");
  }
});

renderDates();
renderSlots();
