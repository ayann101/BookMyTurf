import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import { db } from './firebase-config.js';

const turfForm = document.getElementById("turfForm");
const turfList = document.getElementById("turfList");

// ✅ Turf Add Form Submit
turfForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const location = document.getElementById("location").value.trim();
  const image = document.getElementById("imageUrl").value.trim();
  const logo = document.getElementById("logoUrl").value.trim();
  const rating = parseFloat(document.getElementById("rating").value.trim());

  if (!name || !location || !image || !logo || isNaN(rating)) {
    alert("⚠️ सभी फ़ील्ड्स को सही से भरें।");
    return;
  }

  try {
    await addDoc(collection(db, "turfs"), {
      name,
      location,
      image,
      logo,
      rating
    });

    alert("✅ Turf सफलतापूर्वक जोड़ा गया!");
    turfForm.reset();
    loadTurfs();
  } catch (error) {
    console.error("❌ Turf जोड़ने में त्रुटि:", error);
    alert("❌ Turf जोड़ने में समस्या आई।");
  }
});

// ✅ Turf Cards लोड करना
async function loadTurfs() {
  turfList.innerHTML = "<p>Loading turfs...</p>";

  const snap = await getDocs(collection(db, "turfs"));
  turfList.innerHTML = "";

  if (snap.empty) {
    turfList.innerHTML = "<p>कोई Turf नहीं मिला।</p>";
    return;
  }

  snap.forEach(docSnap => {
    const data = docSnap.data();

    const card = document.createElement("div");
    card.className = "turf-card";

    card.innerHTML = `
      <img src="${data.image}" alt="${data.name}" class="turf-img"/>
      <div class="turf-details">
        <img src="${data.logo}" alt="Logo" class="logo-img"/>
        <h3>${data.name}</h3>
        <p>📍 ${data.location}</p>
        <p>⭐ ${data.rating} / 5</p>
        <button class="delete-btn" data-id="${docSnap.id}">🗑️ Delete</button>
      </div>
    `;

    turfList.appendChild(card);
  });

  // ✅ Delete turf
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const confirmDelete = confirm("क्या आप इस turf को हटाना चाहते हैं?");
      if (confirmDelete) {
        try {
          await deleteDoc(doc(db, "turfs", id));
          alert("✅ Turf हटाया गया");
          loadTurfs();
        } catch (err) {
          console.error("❌ हटाने में त्रुटि:", err);
          alert("❌ Turf हटाया नहीं जा सका।");
        }
      }
    });
  });
}

window.onload = () => {
  loadTurfs();
};
