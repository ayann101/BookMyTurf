import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from './firebase-config.js';

const turfSelect = document.getElementById("turf");
const slotContainer = document.getElementById("slotContainer");
const totalPriceEl = document.getElementById("totalPrice");
const hourInfo = document.getElementById("hourInfo");
const bookingForm = document.getElementById("bookingForm");
const selectedDateInput = document.getElementById("selectedDate");
const qrContainer = document.getElementById("qrContainer");
const downloadQRBtn = document.getElementById("downloadQR");
const customDatePicker = document.getElementById("customDatePicker");
const proceedBtn = document.getElementById("proceedBtn");
const reviewSection = document.getElementById("reviewSection");

let selectedSlots = []; // array of {date, time}
const pricePerHour = 700;
const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ✅ Get label for time
function getSlotLabel(hour) {
  if (hour >= 6 && hour < 12) return "🌞 Subah";
  if (hour >= 12 && hour < 16) return "☀️ Dopahar";
  if (hour >= 16 && hour < 20) return "🌇 Shaam";
  if (hour >= 20) return "🌃 Raat";
  return "🌌 Midnight";
}

// ✅ Load Turf Dropdown
async function loadTurfOptions() {
  const snap = await getDocs(collection(db, "turfs"));
  turfSelect.innerHTML = `<option value="">-- Select Turf --</option>`;
  snap.forEach(docSnap => {
    const t = docSnap.data();
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = t.name;
    turfSelect.appendChild(opt);
  });

  const saved = localStorage.getItem("selectedTurf");
  if (saved) {
    turfSelect.value = saved;
    loadBookedSlots();
  }
}

// ✅ Render Horizontal Dates
function renderDates() {
  const today = new Date();
  customDatePicker.innerHTML = "";
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split("T")[0];
    const box = document.createElement("div");
    box.className = "date-box";
    box.dataset.value = value;
    box.innerText = `${months[d.getMonth()]} ${d.getDate()} ${days[d.getDay()]}`;
    box.addEventListener("click", () => {
      document.querySelectorAll(".date-box").forEach(b => b.classList.remove("selected"));
      box.classList.add("selected");
      selectedDateInput.value = value;
      localStorage.setItem("selectedDate", value);
      renderSlots(value);
      updateSlotStatuses(value);
      listenToSlotUpdates(value);
    });
    customDatePicker.appendChild(box);
  }

  const savedDate = localStorage.getItem("selectedDate");
  const match = [...customDatePicker.children].find(b => b.dataset.value === savedDate);
  if (match) match.click();
  else customDatePicker.firstChild?.click();
}

// ✅ Render 24 Slots for Given Date
function renderSlots(date) {
  slotContainer.innerHTML = "";
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const slotDateTime = new Date(`${date}T${i.toString().padStart(2, "0")}:00:00`);
    const wrapper = document.createElement("div");
    wrapper.className = "slot-wrapper";

    const div = document.createElement("div");
    div.className = "slot available";
    div.dataset.time = i.toString();
    div.dataset.date = date;
    div.innerHTML = `
      <div class="slot-label">${getSlotLabel(i)}</div>
      <div class="slot-time">${(i % 12 || 12)}:00 ${i >= 12 ? "PM" : "AM"}</div>
      <div class="slot-status">Available</div>
    `;

    if (slotDateTime <= now) {
      div.classList.remove("available");
      div.classList.add("booked");
      div.querySelector(".slot-status").innerText = "Booked";
      div.style.opacity = "0.4";
    }

    wrapper.appendChild(div);
    slotContainer.appendChild(wrapper);
  }

  // Re-apply selection state
  selectedSlots.forEach(s => {
    const match = document.querySelector(`.slot[data-date="${s.date}"][data-time="${s.time}"]`);
    if (match) {
      match.classList.add("selected");
      match.querySelector(".slot-status").innerText = "Selected";
    }
  });
}

// ✅ Slot Click
slotContainer.addEventListener("click", e => {
  const el = e.target.closest(".slot");
  if (!el || el.classList.contains("booked") || el.classList.contains("unavailable")) return;

  const date = el.dataset.date;
  const time = el.dataset.time;

  const key = `${date}-${time}`;
  const index = selectedSlots.findIndex(s => `${s.date}-${s.time}` === key);

  if (index !== -1) {
    selectedSlots.splice(index, 1);
    el.classList.remove("selected");
    el.querySelector(".slot-status").innerText = "Available";
  } else {
    selectedSlots.push({ date, time });
    el.classList.add("selected");
    el.querySelector(".slot-status").innerText = "Selected";
  }

  updateTotal();
});

// ✅ Total
function updateTotal() {
  hourInfo.innerText = `Selected Hours: ${selectedSlots.length}`;
  totalPriceEl.innerText = `Total: ₹${selectedSlots.length * pricePerHour}`;
}

// ✅ Update Status
async function updateSlotStatuses(date) {
  const turf = turfSelect.value;
  if (!turf || !date) return;

  const bookingSnap = await getDocs(query(collection(db, "bookings"), where("turf", "==", turf), where("date", "==", date)));
  const bookedSet = new Set();
  bookingSnap.forEach(d => (d.data().slots || []).forEach(s => bookedSet.add(s)));

  const disabledSnap = await getDoc(doc(db, "disabledSlots", `${turf}_${date}`));
  const disabledSet = new Set(disabledSnap.exists() ? disabledSnap.data().slots.map(s => s.toString()) : []);

  document.querySelectorAll(`.slot[data-date="${date}"]`).forEach(slot => {
    const t = slot.dataset.time;
    if (slot.classList.contains("selected")) return;

    slot.className = "slot available";
    slot.querySelector(".slot-status").innerText = "Available";

    if (bookedSet.has(t)) {
      slot.classList.remove("available");
      slot.classList.add("booked");
      slot.querySelector(".slot-status").innerText = "Booked";
    } else if (disabledSet.has(t)) {
      slot.classList.remove("available");
      slot.classList.add("unavailable");
      slot.querySelector(".slot-status").innerText = "Unavailable";
    }
  });
}

// ✅ Realtime Firestore
function listenToSlotUpdates(date) {
  const turf = turfSelect.value;
  if (!turf || !date) return;

  const disableRef = doc(db, "disabledSlots", `${turf}_${date}`);
  onSnapshot(disableRef, () => updateSlotStatuses(date));

  const bookingQ = query(collection(db, "bookings"), where("turf", "==", turf), where("date", "==", date));
  onSnapshot(bookingQ, () => updateSlotStatuses(date));
}

// ✅ Proceed to Review
proceedBtn.addEventListener("click", () => {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const turf = turfSelect.value;

  if (!name || !phone || !turf || selectedSlots.length === 0) {
    return alert("⚠️ कृपया सभी फ़ील्ड भरें और स्लॉट चुनें।");
  }

  const rSlots = selectedSlots
    .sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time)
    .map(s => `${s.date} - ${s.time}:00`)
    .join(", ");

  document.getElementById("rName").innerText = name;
  document.getElementById("rPhone").innerText = phone;
  document.getElementById("rTurf").innerText = turfSelect.options[turfSelect.selectedIndex].text;
  document.getElementById("rDate").innerText = "-";
  document.getElementById("rSlots").innerText = rSlots;
  document.getElementById("rTotal").innerText = selectedSlots.length * pricePerHour;

  localStorage.setItem("selectedTurf", turf);
  localStorage.setItem("selectedSlots", JSON.stringify(selectedSlots));

  reviewSection.style.display = "block";
});

// ✅ Final Submit
bookingForm.addEventListener("submit", async e => {
  e.preventDefault();
  const termsCheck = document.getElementById("termsCheck");
  if (!termsCheck.checked) return alert("⚠️ कृपया terms & conditions स्वीकार करें।");

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const turf = turfSelect.value;

  // Group slots by date
  const grouped = {};
  selectedSlots.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s.time);
  });

  try {
    for (const [date, slots] of Object.entries(grouped)) {
      await addDoc(collection(db, "bookings"), {
        name, phone, turf, date, slots,
        timestamp: new Date().toISOString()
      });
    }

    const allSlotStr = selectedSlots.map(s => `${s.date} - ${s.time}:00`).join(", ");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: `Name: ${name}\nTurf: ${turf}\nSlots: ${allSlotStr}`,
      width: 200, height: 200,
      colorDark: "#000", colorLight: "#fff",
      correctLevel: QRCode.CorrectLevel.H
    });

    const link = `https://wa.me/91${phone}?text=${encodeURIComponent(
      `✅ Booking Confirmed!\nName: ${name}\nTurf: ${turf}\nSlots: ${allSlotStr}\nTotal: ₹${selectedSlots.length * pricePerHour}`
    )}`;
    window.open(link, "_blank");
    alert("✅ Booking Confirmed!");

    downloadQRBtn.style.display = "inline-block";
    setTimeout(() => {
      const canvas = qrContainer.querySelector("canvas");
      if (canvas) {
        downloadQRBtn.onclick = () => {
          const a = document.createElement("a");
          a.href = canvas.toDataURL("image/png");
          a.download = `Booking_${name}.png`;
          a.click();
        };
      }
    }, 500);

    reviewSection.style.display = "none";
    selectedSlots = [];
    renderSlots(selectedDateInput.value);
    updateTotal();
  } catch (err) {
    console.error("❌ Booking Error:", err);
    alert("❌ Booking failed. Try again.");
  }
});

// ✅ Init
loadTurfOptions();
renderDates();
