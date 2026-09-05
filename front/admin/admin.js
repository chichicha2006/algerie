const API_URL = "http://localhost:5000";

const PUBLICATION_TYPES = ["actualite", "immobilier", "annonce", "emploi", "service"];
const SESSION_ERROR = "ADMIN_SESSION_INVALID";

function getToken() {
  return localStorage.getItem("adminToken");
}

function clearAdminSession() {
  localStorage.removeItem("adminToken");
}

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "dashboard.html";
}

function isLoginPage() {
  return window.location.pathname.includes("login.html");
}

function redirectToLogin() {
  if (isLoginPage()) return;

  const currentPage = encodeURIComponent(getCurrentPage());
  window.location.href = `login.html?redirect=${currentPage}`;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
}

function isTokenInvalidOrExpired(token) {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;

  return Date.now() >= payload.exp * 1000;
}

function invalidateAdminSession() {
  clearAdminSession();
  redirectToLogin();
}

function protectAdminPage() {
  const token = getToken();

  if (!isLoginPage() && isTokenInvalidOrExpired(token)) {
    invalidateAdminSession();
    return false;
  }

  if (isLoginPage() && token) {
    if (isTokenInvalidOrExpired(token)) {
      clearAdminSession();
      return true;
    }

    const params = new URLSearchParams(window.location.search);
    const redirectPage = params.get("redirect") || "dashboard.html";
    window.location.href = redirectPage;
    return false;
  }

  return true;
}

const canUseAdminPage = protectAdminPage();

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getApiMessage(res, data, fallback) {
  if (data?.message) return data.message;
  if (res.status === 401) return "Email ou mot de passe incorrect";
  if (res.status >= 500) return "Erreur serveur. Réessayez plus tard.";
  return fallback;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(getApiMessage(res, data, "Erreur lors du chargement."));
  }

  if (data === null) {
    throw new Error("Réponse serveur invalide.");
  }

  return data;
}

async function fetchProtected(url, options = {}) {
  const token = getToken();

  if (isTokenInvalidOrExpired(token)) {
    invalidateAdminSession();
    throw new Error(SESSION_ERROR);
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    invalidateAdminSession();
    throw new Error(SESSION_ERROR);
  }

  return res;
}

async function fetchProtectedJson(url, options) {
  const res = await fetchProtected(url, options);
  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(getApiMessage(res, data, "Erreur lors du chargement."));
  }

  if (data === null) {
    throw new Error("Réponse serveur invalide.");
  }

  return data;
}

function isSessionError(error) {
  return error?.message === SESSION_ERROR;
}

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
    const data = await fetchJson(`${API_URL}/api/publications/${type}`);

    if (!Array.isArray(data)) {
      throw new Error("Réponse publications invalide.");
    }

    publications = publications.concat(data);
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

      const result = await parseJsonResponse(res);

      if (res.ok && result?.token) {
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
        showNotification(
          getApiMessage(res, result, "Réponse de connexion invalide."),
          "error"
        );
      }
    } catch (error) {
      loginBtn.disabled = false;
      loginBtn.innerText = "Se connecter";
      showNotification("Serveur inaccessible. Vérifiez que le backend est lancé.", "error");
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
      clearAdminSession();
      window.location.href = "login.html";
    }, 800);
  });
}

/* DASHBOARD STATS */

const adminStats = document.querySelector("#adminStats");

if (adminStats && canUseAdminPage) {
  loadAdminStats();
}

async function loadAdminStats() {
  try {
    const publications = await fetchAllPublications();
    const messages = await fetchProtectedJson(`${API_URL}/api/admin/contacts`);
    const newsletters = await fetchProtectedJson(`${API_URL}/api/admin/newsletters`);

    if (!Array.isArray(messages) || !Array.isArray(newsletters)) {
      throw new Error("Réponse admin invalide.");
    }

    adminStats.innerHTML = `
      <div class="admin-stat-card">
        <span>📰</span>
        <h3>${publications.length}</h3>
        <p>Publications</p>
      </div>

      <div class="admin-stat-card">
        <span>📨</span>
        <h3>${messages.length}</h3>
        <p>Messages reçus</p>
      </div>

      <div class="admin-stat-card">
        <span>📧</span>
        <h3>${newsletters.length}</h3>
        <p>Abonnés newsletter</p>
      </div>

      <div class="admin-stat-card">
        <span>✅</span>
        <h3>En ligne</h3>
        <p>Statut du site</p>
      </div>
    `;
  } catch (error) {
    if (isSessionError(error)) return;
    adminStats.innerHTML = "<p>Impossible de charger les statistiques.</p>";
  }
}

/* PUBLICATION FORM */

const publicationForm = document.querySelector("#publicationForm");
const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

if (publicationForm && canUseAdminPage) {
  const submitBtn = publicationForm.querySelector("button[type='submit']");
  const pageTitle = document.querySelector(".admin-panel h2");

  async function loadPublicationToEdit() {
    if (!editId) return;

    try {
      const pub = await fetchJson(`${API_URL}/api/publications/detail/${editId}`);

      document.querySelector("#type").value = pub.type || "actualite";
      document.querySelector("#badge").value = pub.badge || "";
      document.querySelector("#titre").value = pub.titre || "";
      document.querySelector("#ville").value = pub.ville || "";
      document.querySelector("#prix").value = pub.prix || "";
      document.querySelector("#description").value = pub.description || "";

      if (submitBtn) submitBtn.textContent = "Modifier la publication";
      if (pageTitle) pageTitle.textContent = "Modifier une publication";
    } catch (error) {
      showNotification(error.message || "Publication introuvable", "error");
    }
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
      const res = await fetchProtected(url, {
        method,
        body: formData,
      });

      const result = await parseJsonResponse(res);

      if (res.ok) {
        showNotification(editId ? "Publication modifiée" : "Publication ajoutée", "success");

        const publicationId = result?.publication?._id || editId;

        if (!publicationId) {
          submitBtn.disabled = false;
          submitBtn.innerText = editId ? "Modifier la publication" : "Publier";
          showNotification("Réponse serveur invalide.", "error");
          return;
        }

        setTimeout(() => {
          window.location.assign(`../publication.html?id=${publicationId}&created=true`);
        }, 700);
      } else {
        submitBtn.disabled = false;
        submitBtn.innerText = editId ? "Modifier la publication" : "Publier";
        showNotification(getApiMessage(res, result, "Erreur"), "error");
      }
    } catch (error) {
      if (isSessionError(error)) return;
      submitBtn.disabled = false;
      submitBtn.innerText = editId ? "Modifier la publication" : "Publier";
      showNotification(error.message || "Erreur serveur", "error");
    }
  });
}

/* ADMIN PUBLICATIONS LIST */

const adminPublicationsList = document.querySelector("#adminPublicationsList");
const filterType = document.querySelector("#filterType");

if (adminPublicationsList && canUseAdminPage) {
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
      publications = await fetchJson(`${API_URL}/api/publications/${type}`);
      if (!Array.isArray(publications)) {
        throw new Error("Réponse publications invalide.");
      }
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
  if (!confirm("Supprimer cette publication ?")) return;

  try {
    const res = await fetchProtected(`${API_URL}/api/admin/publications/${id}`, {
      method: "DELETE",
    });

    const result = await parseJsonResponse(res);

    if (res.ok) {
      showNotification(result?.message || "Publication supprimée", "success");
      setTimeout(() => window.location.reload(), 700);
    } else {
      showNotification(getApiMessage(res, result, "Erreur"), "error");
    }
  } catch (error) {
    if (isSessionError(error)) return;
    showNotification(error.message || "Erreur", "error");
  }
}

/* MESSAGES */

const messagesList = document.querySelector("#messagesList");

if (messagesList && canUseAdminPage) {
  loadMessages();
}

async function loadMessages() {
  try {
    const messages = await fetchProtectedJson(`${API_URL}/api/admin/contacts`);

    if (!Array.isArray(messages)) {
      throw new Error("Réponse messages invalide.");
    }

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
    if (isSessionError(error)) return;
    messagesList.innerHTML = "<p>Impossible de charger les messages.</p>";
  }
}

async function deleteMessage(id) {
  if (!confirm("Supprimer ce message ?")) return;

  try {
    const res = await fetchProtected(`${API_URL}/api/admin/contacts/${id}`, {
      method: "DELETE",
    });

    const result = await parseJsonResponse(res);
    showNotification(
      res.ok ? result?.message || "Message supprimé" : getApiMessage(res, result, "Erreur"),
      res.ok ? "success" : "error"
    );

    if (res.ok) setTimeout(() => window.location.reload(), 600);
  } catch (error) {
    if (isSessionError(error)) return;
    showNotification(error.message || "Erreur", "error");
  }
}

/* NEWSLETTER */

const newsletterList = document.querySelector("#newsletterList");
const newsletterCount = document.querySelector("#newsletterCount");

if (newsletterList && canUseAdminPage) {
  loadNewsletter();
}

async function loadNewsletter() {
  try {
    const emails = await fetchProtectedJson(`${API_URL}/api/admin/newsletters`);

    if (!Array.isArray(emails)) {
      throw new Error("Réponse newsletter invalide.");
    }

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
    if (isSessionError(error)) return;
    newsletterList.innerHTML = "<p>Impossible de charger la newsletter.</p>";
  }
}

async function deleteNewsletter(id) {
  if (!confirm("Supprimer cet email ?")) return;

  try {
    const res = await fetchProtected(`${API_URL}/api/admin/newsletters/${id}`, {
      method: "DELETE",
    });

    const result = await parseJsonResponse(res);
    showNotification(
      res.ok ? result?.message || "Email supprimé" : getApiMessage(res, result, "Erreur"),
      res.ok ? "success" : "error"
    );

    if (res.ok) setTimeout(() => window.location.reload(), 600);
  } catch (error) {
    if (isSessionError(error)) return;
    showNotification(error.message || "Erreur", "error");
  }
}
