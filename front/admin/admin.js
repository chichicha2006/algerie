const API_URL = "http://localhost:5000";

const PUBLICATION_TYPES = ["actualite", "immobilier", "annonce", "emploi", "service"];

function getToken() {
  return localStorage.getItem("adminToken");
}

function protectAdminPage() {
  const isLoginPage = window.location.pathname.includes("login.html");
  const token = getToken();

  if (!isLoginPage && !token) {
    const currentPage = window.location.pathname.split("/").pop();
    window.location.href = `login.html?redirect=${currentPage}`;
    return;
  }

  if (isLoginPage && token) {
    const params = new URLSearchParams(window.location.search);
    const redirectPage = params.get("redirect") || "dashboard.html";
    window.location.href = redirectPage;
  }
}

protectAdminPage();

function showNotification(message, type = "success") {
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.innerText = message;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.classList.add("hide");
    setTimeout(() => notif.remove(), 300);
  }, 2500);
}

function formatDate(dateValue) {
  if (!dateValue) return "Date inconnue";
  return new Date(dateValue).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function fetchAllPublications() {
  let publications = [];

  for (const type of PUBLICATION_TYPES) {
    const res = await fetch(`${API_URL}/api/publications/${type}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      publications = publications.concat(data);
    }
  }

  return publications;
}

/* LOGIN */

const togglePassword = document.querySelector("#togglePassword");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const password = document.querySelector("#adminPassword");
    password.type = password.type === "password" ? "text" : "password";
  });
}

const loginForm = document.querySelector("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#adminEmail").value;
    const password = document.querySelector("#adminPassword").value;
    const loginBtn = document.querySelector("#loginBtn");

    loginBtn.disabled = true;
    loginBtn.innerText = "Connexion...";

    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (res.ok) {
        localStorage.setItem("adminToken", result.token);
        loginBtn.innerText = "Bienvenue ✓";
        showNotification("Connexion réussie", "success");

        setTimeout(() => {
  const params = new URLSearchParams(window.location.search);
  const redirectPage = params.get("redirect") || "dashboard.html";
  window.location.href = redirectPage;
}, 900);
      } else {
        loginBtn.disabled = false;
        loginBtn.innerText = "Se connecter";
        showNotification(result.message || "Erreur de connexion", "error");
      }
    } catch (error) {
      loginBtn.disabled = false;
      loginBtn.innerText = "Se connecter";
      showNotification("Impossible de contacter le serveur", "error");
    }
  });
}

/* LOGOUT */

const logoutBtn = document.querySelector("#logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logoutBtn.disabled = true;
    logoutBtn.innerText = "Déconnexion...";

    showNotification("À bientôt 👋", "success");

    document.body.classList.add("page-leave");

    setTimeout(() => {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
    }, 800);
  });
}

/* DASHBOARD STATS */

const adminStats = document.querySelector("#adminStats");

if (adminStats) {
  loadAdminStats();
}

async function loadAdminStats() {
  const token = getToken();

  try {
    const publications = await fetchAllPublications();

    const messagesRes = await fetch(`${API_URL}/api/admin/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const messages = await messagesRes.json();

    const newslettersRes = await fetch(`${API_URL}/api/admin/newsletters`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const newsletters = await newslettersRes.json();

    adminStats.innerHTML = `
      <div class="admin-stat-card">
        <span>📰</span>
        <h3>${publications.length}</h3>
        <p>Publications</p>
      </div>

      <div class="admin-stat-card">
        <span>📨</span>
        <h3>${Array.isArray(messages) ? messages.length : 0}</h3>
        <p>Messages reçus</p>
      </div>

      <div class="admin-stat-card">
        <span>📧</span>
        <h3>${Array.isArray(newsletters) ? newsletters.length : 0}</h3>
        <p>Abonnés newsletter</p>
      </div>

      <div class="admin-stat-card">
        <span>✅</span>
        <h3>En ligne</h3>
        <p>Statut du site</p>
      </div>
    `;
  } catch (error) {
    adminStats.innerHTML = "<p>Impossible de charger les statistiques.</p>";
  }
}

/* PUBLICATION FORM */

const publicationForm = document.querySelector("#publicationForm");
const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

if (publicationForm) {
  const token = getToken();

  const submitBtn = publicationForm.querySelector("button[type='submit']");
  const pageTitle = document.querySelector(".admin-panel h2");

  async function loadPublicationToEdit() {
    if (!editId) return;

    const res = await fetch(`${API_URL}/api/publications/detail/${editId}`);
    const pub = await res.json();

    if (!res.ok) {
      showNotification(pub.message || "Publication introuvable", "error");
      return;
    }

    document.querySelector("#type").value = pub.type || "actualite";
    document.querySelector("#badge").value = pub.badge || "";
    document.querySelector("#titre").value = pub.titre || "";
    document.querySelector("#ville").value = pub.ville || "";
    document.querySelector("#prix").value = pub.prix || "";
    document.querySelector("#description").value = pub.description || "";

    if (submitBtn) submitBtn.textContent = "Modifier la publication";
    if (pageTitle) pageTitle.textContent = "Modifier une publication";
  }

  loadPublicationToEdit();

  publicationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = editId ? "Modification..." : "Publication...";

    const formData = new FormData();

    formData.append("type", document.querySelector("#type").value);
    formData.append("badge", document.querySelector("#badge").value);
    formData.append("titre", document.querySelector("#titre").value);
    formData.append("ville", document.querySelector("#ville").value);
    formData.append("prix", document.querySelector("#prix").value);
    formData.append("description", document.querySelector("#description").value);

    const imageFile = document.querySelector("#image").files[0];

    if (imageFile) {
      formData.append("image", imageFile);
    }

    const url = editId
      ? `${API_URL}/api/admin/publications/${editId}`
      : `${API_URL}/api/admin/publications`;

    const method = editId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        showNotification(editId ? "Publication modifiée" : "Publication ajoutée", "success");

        const publicationId = result.publication?._id || editId;

        setTimeout(() => {
          window.location.assign(`../publication.html?id=${publicationId}&created=true`);
        }, 700);
      } else {
        submitBtn.disabled = false;
        submitBtn.innerText = editId ? "Modifier la publication" : "Publier";
        showNotification(result.message || "Erreur", "error");
      }
    } catch (error) {
      submitBtn.disabled = false;
      submitBtn.innerText = editId ? "Modifier la publication" : "Publier";
      showNotification("Erreur serveur", "error");
    }
  });
}

/* ADMIN PUBLICATIONS LIST */

const adminPublicationsList = document.querySelector("#adminPublicationsList");
const filterType = document.querySelector("#filterType");

if (adminPublicationsList) {
  loadAdminPublications();

  if (filterType) {
    filterType.addEventListener("change", () => {
      loadAdminPublications(filterType.value);
    });
  }
}

async function loadAdminPublications(type = "all") {
  adminPublicationsList.innerHTML = "<p>Chargement...</p>";

  let publications = [];

  try {
    if (type === "all") {
      publications = await fetchAllPublications();
    } else {
      const res = await fetch(`${API_URL}/api/publications/${type}`);
      publications = await res.json();
    }

    if (!Array.isArray(publications) || !publications.length) {
      adminPublicationsList.innerHTML = "<p>Aucune publication.</p>";
      return;
    }

    adminPublicationsList.innerHTML = publications
      .map((pub) => `
        <article class="admin-publication-card">
          ${pub.image ? `<img src="${API_URL}/uploads/${pub.image}" alt="${pub.titre}">` : ""}

          <div class="admin-card-body">
            <span class="badge">${pub.type || "Publication"}</span>
            <h3>${pub.titre || "Sans titre"}</h3>
            <p>${pub.description || ""}</p>

            <div class="admin-card-actions">
              <a href="../publication.html?id=${pub._id}" class="btn-small">Voir</a>
              <a href="dashboard.html?edit=${pub._id}" class="btn-small">Modifier</a>
              <button onclick="deleteAdminPublication('${pub._id}')" class="btn-small danger">Supprimer</button>
            </div>
          </div>
        </article>
      `)
      .join("");
  } catch (error) {
    adminPublicationsList.innerHTML = "<p>Erreur lors du chargement.</p>";
  }
}

async function deleteAdminPublication(id) {
  const token = getToken();

  if (!confirm("Supprimer cette publication ?")) return;

  const res = await fetch(`${API_URL}/api/admin/publications/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await res.json();

  if (res.ok) {
    showNotification(result.message || "Publication supprimée", "success");
    setTimeout(() => window.location.reload(), 700);
  } else {
    showNotification(result.message || "Erreur", "error");
  }
}

/* MESSAGES */

const messagesList = document.querySelector("#messagesList");

if (messagesList) {
  loadMessages();
}

async function loadMessages() {
  const token = getToken();

  try {
    const res = await fetch(`${API_URL}/api/admin/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const messages = await res.json();

    if (!Array.isArray(messages) || !messages.length) {
      messagesList.innerHTML = "<p>Aucun message reçu.</p>";
      return;
    }

    messagesList.innerHTML = messages.map((msg) => `
      <article class="message-card">
        <div class="message-card-header">
          <div>
            <span class="badge">${msg.categorie || "Contact"}</span>
            <h3>${msg.nom || "Nom inconnu"}</h3>
          </div>
          <small>${formatDate(msg.createdAt)}</small>
        </div>

        <p><strong>Email :</strong> ${msg.email || "Non renseigné"}</p>
        <p class="message-text">${msg.message || ""}</p>

        <button onclick="deleteMessage('${msg._id}')" class="btn-small danger">Supprimer</button>
      </article>
    `).join("");
  } catch (error) {
    messagesList.innerHTML = "<p>Impossible de charger les messages.</p>";
  }
}

async function deleteMessage(id) {
  const token = getToken();

  if (!confirm("Supprimer ce message ?")) return;

  const res = await fetch(`${API_URL}/api/admin/contacts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await res.json();
  showNotification(result.message || "Message supprimé", res.ok ? "success" : "error");

  if (res.ok) setTimeout(() => window.location.reload(), 600);
}

/* NEWSLETTER */

const newsletterList = document.querySelector("#newsletterList");
const newsletterCount = document.querySelector("#newsletterCount");

if (newsletterList) {
  loadNewsletter();
}

async function loadNewsletter() {
  const token = getToken();

  try {
    const res = await fetch(`${API_URL}/api/admin/newsletters`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const emails = await res.json();

    if (!Array.isArray(emails) || !emails.length) {
      if (newsletterCount) newsletterCount.innerHTML = "0 abonné";
      newsletterList.innerHTML = "<p>Aucun email inscrit.</p>";
      return;
    }

    if (newsletterCount) {
      newsletterCount.innerHTML = `${emails.length} abonné${emails.length > 1 ? "s" : ""}`;
    }

    newsletterList.innerHTML = emails.map((item) => `
      <article class="newsletter-card">
        <div>
          <h3>📧 ${item.email}</h3>
          <p>Inscrit le : ${formatDate(item.createdAt)}</p>
        </div>

        <button onclick="deleteNewsletter('${item._id}')" class="btn-small danger">Supprimer</button>
      </article>
    `).join("");
  } catch (error) {
    newsletterList.innerHTML = "<p>Impossible de charger la newsletter.</p>";
  }
}

async function deleteNewsletter(id) {
  const token = getToken();

  if (!confirm("Supprimer cet email ?")) return;

  const res = await fetch(`${API_URL}/api/admin/newsletters/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await res.json();
  showNotification(result.message || "Email supprimé", res.ok ? "success" : "error");

  if (res.ok) setTimeout(() => window.location.reload(), 600);
}