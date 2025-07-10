import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  where,
  query,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { db } from './firebase-config.js';

// DOM elements
const tabs = document.querySelectorAll(".admin-tab");
const cards = document.querySelectorAll(".admin-card");
const turfDropdowns = document.querySelectorAll("#filterTurf, #slotTurf, #priceTurf");
const turfAddForm = document.getElementById("turfAddForm");
const priceInput = document.getElementById("priceInput");
const slotContainer = document.getElementById("slotContainer");
const slotDatePicker = document.getElementById("slotDatePicker");
const slotDateValue = document.getElementById("slotDateValue");
const modeSelect = document.getElementById("slotActionMode");

// ✅ Tab Switching
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active-tab"));
    cards.forEach(c => c.style.display = "none");
    tab.classList.add("active-tab");
    cards[i].style.display = "block";
  });
});

// ✅ Load Turf Dropdowns
async function loadTurfs() {
  const snap = await getDocs(collection(db, "turfs"));
  turfDropdowns.forEach(drop => {
    drop.innerHTML = `<option value="">-- Select Turf --</option>`;
  });
  snap.forEach(docSnap => {
    const t = docSnap.data();
    turfDropdowns.forEach(drop => {
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = t.name;
      drop.appendChild(opt);
    });
  });
}

// ✅ Add Turf
turfAddForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("newTurfName").value.trim();
  const price = parseInt(document.getElementById("newTurfPrice").value.trim());
  if (!name || isNaN(price)) return alert("⚠️ Fill all fields");

  await addDoc(collection(db, "turfs"), { name, price });
  alert("✅ Turf Added!");
  turfAddForm.reset();
  loadTurfs();
});

// ✅ Update Price
window.updatePrice = async function () {
  const turfId = document.getElementById("priceTurf").value;
  const price = parseInt(priceInput.value);
  if (!turfId || isNaN(price)) return alert("⚠️ Select turf and price");
  await updateDoc(doc(db, "turfs", turfId), { price });
  alert("✅ Price Updated");
};

// ✅ Load Bookings
window.loadBookings = async function () {
  const turfId = document.getElementById("filterTurf").value;
  const date = document.getElementById("filterDate").value;
  const tbody = document.querySelector("#bookingTable tbody");
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "bookings"));
  snap.forEach(docSnap => {
    const b = docSnap.data();
    if ((turfId === "" || b.turf === turfId) && (!date || b.date === date)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.name}</td>
        <td>${b.phone || "-"}</td>
        <td>${b.turf}</td>
        <td>${b.date}</td>
        <td>${(b.slots || []).join(", ")}</td>
        <td>${b.slots?.length || 0} hr</td>
        <td><span class="status ${b.status}">${b.status || "pending"}</span></td>
        <td>${b.code || "-"}</td>
        <td>
          <button class="action confirm" onclick="confirmBooking('${docSnap.id}')">✅</button>
          <button class="action reject" onclick="rejectBooking('${docSnap.id}')">❌</button>
        </td>`;
      tbody.appendChild(tr);
    }
  });

  listenToSlotChanges();
};

window.confirmBooking = async function (id) {
  await updateDoc(doc(db, "bookings", id), { status: "confirmed" });
  loadBookings();
};

window.rejectBooking = async function (id) {
  await updateDoc(doc(db, "bookings", id), { status: "rejected" });
  loadBookings();
};

// ✅ PVR-style Label
function getSlotLabel(hour) {
  if (hour >= 6 && hour < 12) return "🌞 Subah";
  if (hour >= 12 && hour < 16) return "☀️ Dopahar";
  if (hour >= 16 && hour < 20) return "🌇 Shaam";
  if (hour >= 20) return "🌃 Raat";
  return "🌌 Mid Night";
}

// ✅ Render Date Slider
function renderDateSlider() {
  const today = new Date();
  slotDatePicker.innerHTML = "";
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);
    const value = date.toISOString().split("T")[0];
    const dayShort = date.toLocaleDateString("en-US", { weekday: "short" });
    const monthShort = date.toLocaleDateString("en-US", { month: "short" });

    const div = document.createElement("div");
    div.className = "date-box";
    div.innerText = `${monthShort} ${date.getDate()} ${dayShort}`;
    div.dataset.value = value;

    div.addEventListener("click", () => {
      document.querySelectorAll(".date-box").forEach(b => b.classList.remove("selected"));
      div.classList.add("selected");
      slotDateValue.value = value;
      listenToSlotChanges();
    });

    slotDatePicker.appendChild(div);
  }
}

// ✅ Render Slot Grid (PVR style)
function renderSlotGrid(disabled, booked, pending) {
  slotContainer.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const div = document.createElement("div");
    div.className = "slot";
    div.dataset.time = i;

    const label = getSlotLabel(i);
    const timeStr = `${(i % 12 || 12)}:00 ${i >= 12 ? "PM" : "AM"}`;

    div.innerHTML = `
      <div class="slot-label">${label}</div>
      <div class="slot-time">${timeStr}</div>
      <div class="slot-status">Available</div>
    `;

    if (booked.includes(i.toString())) {
      div.classList.add("booked");
      div.querySelector(".slot-status").innerText = "Booked";
    } else if (pending.includes(i.toString())) {
      div.classList.add("pending");
      div.querySelector(".slot-status").innerText = "Pending";
    } else if (disabled.includes(i)) {
      div.classList.add("unavailable");
      div.querySelector(".slot-status").innerText = "Unavailable";
    } else {
      div.classList.add("available");
    }

    div.addEventListener("click", () => handleSlotClick(i));
    slotContainer.appendChild(div);
  }
}

// ✅ Handle Clicks in Admin Slot Grid
async function handleSlotClick(hour) {
  const turf = document.getElementById("slotTurf").value;
  const date = slotDateValue.value;
  if (!turf || !date) return;

  const mode = modeSelect.value;
  const slotStr = hour.toString();

  if (mode === "unavailable") {
    const docRef = doc(db, "disabledSlots", `${turf}_${date}`);
    const disableSnap = await getDoc(docRef);
    const slots = disableSnap.exists() ? disableSnap.data().slots || [] : [];

    let updated;
    if (slots.includes(hour)) {
      updated = slots.filter(s => s !== hour);
    } else {
      updated = [...slots, hour];
    }

    await setDoc(docRef, { turf, date, slots: updated }, { merge: true });
  }

  else if (mode === "booked") {
    const q = query(
      collection(db, "bookings"),
      where("turf", "==", turf),
      where("date", "==", date),
      where("slots", "array-contains", slotStr),
      where("name", "==", "Admin Manual")
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      for (const docSnap of snapshot.docs) {
        await updateDoc(doc(db, "bookings", docSnap.id), {
          status: "cancelled"
        });
      }
    } else {
      await addDoc(collection(db, "bookings"), {
        name: "Admin Manual",
        phone: "0000000000",
        turf,
        date,
        slots: [slotStr],
        status: "confirmed",
        timestamp: new Date().toISOString()
      });
    }
  }

  listenToSlotChanges(); // ✅ refresh instantly
}

// ✅ Real-time Slot Listener
function listenToSlotChanges() {
  const turf = document.getElementById("slotTurf").value;
  const date = slotDateValue.value;
  if (!turf || !date) return;

  const disableRef = doc(db, "disabledSlots", `${turf}_${date}`);
  onSnapshot(disableRef, async (snap) => {
    const disabled = snap.exists() ? snap.data().slots || [] : [];

    const snap2 = await getDocs(collection(db, "bookings"));
    const booked = [], pending = [];

    snap2.forEach(doc => {
      const d = doc.data();
      if (d.turf === turf && d.date === date) {
        if (d.status === "confirmed") booked.push(...(d.slots || []));
        else if (d.status === "pending") pending.push(...(d.slots || []));
      }
    });

    renderSlotGrid(disabled, booked, pending);
  });
}

// ✅ Init
window.onload = () => {
  loadTurfs();
  renderDateSlider();
  loadBookings();
  document.getElementById("slotTurf").addEventListener("change", listenToSlotChanges);
};
