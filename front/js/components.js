document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
  loadFooter();
});

function loadHeader() {
  const headerContainer = document.getElementById("header-container");

  if (!headerContainer) return;

  fetch("components/header.html")
    .then((res) => res.text())
    .then((data) => {
      headerContainer.innerHTML = data;
      initMenu();
    });
}

function loadFooter() {
  const footerContainer = document.getElementById("footer-container");

  if (!footerContainer) return;

  fetch("components/footer.html")
    .then((res) => res.text())
    .then((data) => {
      footerContainer.innerHTML = data;

      const year = document.getElementById("year");
      if (year) {
        year.textContent = new Date().getFullYear();
      }
    });
}

function initMenu() {
  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (!menuBtn || !navLinks) return;

  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
}