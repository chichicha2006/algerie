async function loadComponent(id, file) {
  const container = document.getElementById(id);

  if (!container) return;

  const response = await fetch(file);

  if (!response.ok) {
    console.error("Impossible de charger :", file);
    return;
  }

  const html = await response.text();
  container.innerHTML = html;
}

async function loadAllComponents() {
  await loadComponent("header-container", "components/header.html");
  await loadComponent("footer-container", "components/footer.html");

  document.dispatchEvent(new Event("componentsLoaded"));
}

loadAllComponents();