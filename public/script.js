const openLogin = document.querySelector("#loginButton")
const close = document.querySelector("#close-button")
const popup = document.querySelector("#loginPopup")


openLogin.addEventListener("click", () => {
popup.classList.remove("hidden");
});

close.addEventListener("click", () => {
popup.classList.add("hidden")
});