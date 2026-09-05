const API_URL = "http://localhost:5000";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const created = params.get("created");

const detail = document.querySelector("#publicationDetail");

async function loadPublication() {
  try {
    const res = await fetch(`${API_URL}/api/publications/detail/${id}`);
    const publication = await res.json();

    if (!res.ok) {
      detail.innerHTML = `<p>${publication.message}</p>`;
      return;
    }

    detail.innerHTML = `
      ${publication.image ? `<img src="${API_URL}${publication.image}" class="detail-image" alt="${publication.titre}">` : ""}

      <span class="badge">${publication.badge || publication.type}</span>
      <h2>${publication.titre}</h2>

      <p><strong>Type :</strong> ${publication.type}</p>
      <p><strong>Ville :</strong> ${publication.ville || "Non précisée"}</p>
      <p><strong>Prix :</strong> ${publication.prix || "Non précisé"}</p>
      <p>${publication.description}</p>

      ${
        created === "true"
          ? `
            <div class="success-box">
              <h3>Publication ajoutée avec succès</h3>
              <p>Voulez-vous ajouter un nouveau contenu ?</p>
              <a href="admin/dashboard.html" class="btn">Ajouter une autre publication</a>
            </div>
          `
          : ""
      }

      <br>

      <a href="${publication.type}.html" class="btn">Voir la catégorie</a>
    `;
  } catch {
    detail.innerHTML = "<p>Erreur lors du chargement.</p>";
  }
}

loadPublication();