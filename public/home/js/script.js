/*
    about-section.js

    - Toggles the disclaimer “Read Important Disclaimer” on click.
    - Adds a “show” class to expand the disclaimer with a slide‐down effect.
    - Smoothly scrolls the disclaimer into view when expanded.
*/

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("toggleDisclaimer");
    const disclaimer = document.getElementById("disclaimerContent");

    toggleBtn.addEventListener("click", () => {
        if (disclaimer.classList.contains("show")) {
        disclaimer.classList.remove("show");
        toggleBtn.textContent = "Read Important Disclaimer";
        } else {
        disclaimer.classList.add("show");
        toggleBtn.textContent = "Hide Disclaimer";
        disclaimer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
});
