const openLogin = document.querySelector("#loginButton")
const close = document.querySelector("#close-button")
const popup = document.querySelector("#loginPopup")


//Logic to close and open the login popup
openLogin.addEventListener("click", () => {
popup.classList.remove("hidden");
});

close.addEventListener("click", () => {
popup.classList.add("hidden")
});