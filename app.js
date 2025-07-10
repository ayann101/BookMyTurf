import { db } from './firebase-config.js';
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const turfList = document.getElementById("turfList");

async function loadTurfs() {
  const snap = await getDocs(collection(db, "turfs"));
  turfList.innerHTML = "";

  snap.forEach(doc => {
    const t = doc.data();
    const turfId = doc.id;

    const card = document.createElement("div");
    card.className = "turf-card";

    const img = document.createElement("img");
    img.src = t.image || "https://via.placeholder.com/400x200?text=Turf+Image";
    img.alt = t.name;
    img.className = "turf-image";

    const detail = document.createElement("div");
    detail.className = "turf-details";
    detail.innerHTML = `
      <h3>${t.name}</h3>
      <p>📍 ${t.location || "Not specified"}</p>
      <p>⭐ ${t.rating || "4.5"} | ₹${t.price || 700}/hr</p>
    `;

    const actions = document.createElement("div");
    actions.className = "turf-actions";

    const callBtn = document.createElement("button");
    callBtn.textContent = "📞 Call";
    callBtn.className = "call-btn";
    callBtn.onclick = () => window.open(`tel:${t.phone || "9999999999"}`);

    const bookBtn = document.createElement("button");
    bookBtn.textContent = "🎟️ Book Now";
    bookBtn.className = "book-btn";
    bookBtn.onclick = () => {
      localStorage.setItem("selectedTurf", turfId);
      window.location.href = "booking.html";
    };

    actions.appendChild(callBtn);
    actions.appendChild(bookBtn);

    card.appendChild(img);
    card.appendChild(detail);
    card.appendChild(actions);

    turfList.appendChild(card);
  });
}

loadTurfs();
