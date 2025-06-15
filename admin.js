firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const tableBody = document.querySelector("#bookingTable tbody");
const filterTurf = document.getElementById("filterTurf");
const filterDate = document.getElementById("filterDate");

async function loadBookings() {
  tableBody.innerHTML = "";
  let query = db.collection("bookings");

  const turf = filterTurf.value;
  const date = filterDate.value;

  if (turf !== "all") {
    query = query.where("turf", "==", turf);
  }

  if (date) {
    query = query.where("date", "==", date);
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${data.name}</td>
      <td>${data.email}</td>
      <td>${data.turf.replace(/-/g, " ")}</td>
      <td>${data.date}</td>
      <td>${data.time}</td>
      <td>${data.duration} hr</td>
    `;
    tableBody.appendChild(row);
  });
}

window.onload = loadBookings;
