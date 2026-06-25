const API_URL = "http://192.168.1.120:5000";

function bindMenuToggle() {
  const menuBtn = document.querySelector("#menuBtn");
  const nav = document.querySelector("#navLinks");

  if (!menuBtn || !nav || menuBtn.dataset.menuBound === "true") {
    return;
  }

  menuBtn.dataset.menuBound = "true";
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("active");
  });
}

bindMenuToggle();

document.addEventListener("componentsLoaded", () => {
  bindMenuToggle();
});

const year = document.querySelector("#year");
if (year) {
  year.textContent = new Date().getFullYear();
}

function isAdmin() {
  return localStorage.getItem("adminToken") !== null;
}

function showNotification(message, type = "success") {
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.innerText = message;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.remove();
  }, 3000);
}



const contactForm = document.querySelector("#contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      nom: document.querySelector("#nom").value,
      email: document.querySelector("#email").value,
      categorie: document.querySelector("#categorie").value,
      message: document.querySelector("#message").value,
    };

    const res = await fetch(`${API_URL}/api/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok) {
      showNotification(result.message, "success");
      contactForm.reset();
    } else {
      showNotification(result.message, "error");
    }
  });
}

const newsletterForms = document.querySelectorAll(".newsletterForm");

newsletterForms.forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = form.querySelector("input").value;

    const res = await fetch(`${API_URL}/api/newsletter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const result = await res.json();

    if (res.ok) {
      showNotification(result.message, "success");
      form.reset();
    } else {
      showNotification(result.message, "error");
    }
  });
});

const publicationsContainer = document.querySelector("#publicationsContainer");

if (publicationsContainer) {
  const type = publicationsContainer.dataset.type;

  async function loadPublications() {
    const res = await fetch(`${API_URL}/api/publications/${type}`);
    const publications = await res.json();

    if (!publications.length) {
      publicationsContainer.innerHTML = `
        <div class="content-box">
          <p>Aucune publication pour le moment.</p>
          ${
            isAdmin()
              ? `<a href="admin/dashboard.html" class="btn">Ajouter une publication</a>`
              : ""
          }
        </div>
      `;
      return;
    }

    publicationsContainer.innerHTML =
  publications
    .map((pub) => {
      return `
        <div class="card publication-card">
        ${pub.image ? `<img src="${pub.image}" class="card-image" alt="${pub.titre}">` : ""}
          <span class="badge">${pub.badge || pub.type}</span>
          <h3>${pub.titre}</h3>
          ${pub.ville ? `<p><strong>Ville :</strong> ${pub.ville}</p>` : ""}
          ${pub.prix ? `<p><strong>Prix :</strong> ${pub.prix}</p>` : ""}
          <p>${pub.description}</p>

          <a href="publication.html?id=${pub._id}">Voir détail</a>

          ${
            isAdmin()
              ? `
              <div class="admin-card-actions">
                <a href="admin/dashboard.html?edit=${pub._id}" class="btn-small">Modifier</a>
                <button onclick="deletePublication('${pub._id}')" class="btn-small danger">Supprimer</button>
              </div>
            `
              : ""
          }
        </div>
      `;
    })
    .join("") +
  (isAdmin()
    ? `
      <div class="card add-publication-card">
        <h3>Ajouter une nouvelle publication</h3>
        <p>Créer une nouvelle publication dans cette catégorie.</p>
        <a href="admin/dashboard.html" class="btn">Ajouter</a>
      </div>
    `
    : "");
  }

  loadPublications();
}

async function deletePublication(id) {
  const token = localStorage.getItem("adminToken");

  if (!token) {
    showNotification("Vous devez être connecté en admin", "error");
    return;
  }

  

  const res = await fetch(`${API_URL}/api/admin/publications/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await res.json();

  if (res.ok) {
    showNotification(result.message, "success");
    setTimeout(() => window.location.reload(), 800);
  } else {
    showNotification(result.message, "error");
  }
}
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");

if (searchForm) {
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const keyword = searchInput.value.toLowerCase().trim();
    searchResults.innerHTML = "";

    if (!keyword) return;

    const types = ["actualite", "immobilier", "annonce", "emploi", "service"];
    let allPublications = [];

    for (const type of types) {
      const res = await fetch(`${API_URL}/api/publications/${type}`);
      const data = await res.json();
      allPublications = allPublications.concat(data);
    }

    const filtered = allPublications.filter((pub) => {
      return (
        pub.titre?.toLowerCase().includes(keyword) ||
        pub.description?.toLowerCase().includes(keyword) ||
        pub.ville?.toLowerCase().includes(keyword) ||
        pub.type?.toLowerCase().includes(keyword)
      );
    });

    if (!filtered.length) {
      searchResults.innerHTML = `<p>Aucun résultat trouvé.</p>`;
      return;
    }

    searchResults.innerHTML = filtered.map((pub) => `
      <div class="card">
        ${pub.image ? `<img src="${API_URL}${pub.image}" class="card-image">` : ""}
        <span class="badge">${pub.type}</span>
        <h3>${pub.titre}</h3>
        <p>${pub.description}</p>
        <a href="publication.html?id=${pub._id}">Voir détail</a>
      </div>
    `).join("");
  });
}
const cookieModal =
document.querySelector("#cookieModal");

if (cookieModal) {

  const cookieChoice =
  localStorage.getItem("cookieChoice");

  if (!cookieChoice) {

    cookieModal.classList.remove("hidden");
  }

  const acceptBtn =
  document.querySelector("#acceptCookies");

  const rejectBtn =
  document.querySelector("#rejectCookies");

  acceptBtn?.addEventListener("click", () => {

    localStorage.setItem(
      "cookieChoice",
      "accepted"
    );

    cookieModal.classList.add("hidden");
  });

  rejectBtn?.addEventListener("click", () => {

    localStorage.setItem(
      "cookieChoice",
      "rejected"
    );

    cookieModal.classList.add("hidden");
  });
}

const adminToken = localStorage.getItem("adminToken");
const isAdminMode = window.location.search.includes("admin=true");

if (adminToken && isAdminMode) {
  const adminReturnBar = document.createElement("div");

  adminReturnBar.className = "admin-return-bar";
  adminReturnBar.innerHTML = `
    <span>Mode administrateur</span>

    <div class="admin-return-actions">
      <a href="admin/dashboard.html">Retour au dashboard</a>
      <button id="publicLogoutBtn">Déconnexion</button>
    </div>
  `;

  document.body.prepend(adminReturnBar);

  const publicLogoutBtn = document.querySelector("#publicLogoutBtn");

  publicLogoutBtn.addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    window.location.href = "admin/login.html";
  });
}