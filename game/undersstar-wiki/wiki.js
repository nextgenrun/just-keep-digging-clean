import { initializeWikiSearch } from "./search-ui.js?v=20260907-guide1";
const STRIPE_PUBLIC_KEY = "pk_live_51NxZUUB57hMeY0DPRGITnupp7gwyWGv7Xi1vhCNpdcmtR7eWzA5MCv2iIQrnQOQst7g7HEavjEEyCZPP9RJfjO2400DtEELg5E";
const CHECKOUT_ENDPOINT = "/_api/stripe-nextgen/create-checkout-session.php";
const MINIMUM_DONATION_EUR = 2;
const MAXIMUM_DONATION_EUR = 500;

const body = document.body;
const navToggle = document.querySelector("[data-nav-toggle]");
const wikiNav = document.querySelector("[data-wiki-nav]");
const sections = [...document.querySelectorAll(".wiki-section")];
const navLinks = [...document.querySelectorAll("[data-wiki-nav] a")];

function closeNavigation() {
  body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
}

navToggle?.addEventListener("click", () => {
  const nextOpen = !body.classList.contains("nav-open");
  body.classList.toggle("nav-open", nextOpen);
  navToggle.setAttribute("aria-expanded", String(nextOpen));
});

wikiNav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeNavigation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavigation();
});

const visibleSectionObserver = new IntersectionObserver((entries) => {
  const activeEntry = entries
    .filter((entry) => entry.isIntersecting && !entry.target.hidden)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!activeEntry) return;
  navLinks.forEach((link) => {
    const isCurrent = link.hash === `#${activeEntry.target.id}`;
    if (isCurrent) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}, { rootMargin: "-18% 0px -65% 0px", threshold: [0, .1, .5] });

sections.forEach((section) => visibleSectionObserver.observe(section));

let stripePromise = null;
function loadStripe() {
  if (window.Stripe) return Promise.resolve(window.Stripe(STRIPE_PUBLIC_KEY));
  if (stripePromise) return stripePromise;
  stripePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.addEventListener("load", () => {
      if (window.Stripe) resolve(window.Stripe(STRIPE_PUBLIC_KEY));
      else reject(new Error("Secure checkout could not initialize."));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Secure checkout could not load.")), { once: true });
    document.head.append(script);
  }).catch((error) => {
    stripePromise = null;
    throw error;
  });
  return stripePromise;
}

const donationForm = document.querySelector("[data-donation-form]");
const amountButtons = [...document.querySelectorAll("[data-donation-amount]")];
const customAmount = document.querySelector("[data-custom-amount]");
const donationStatus = document.querySelector("[data-donation-status]");
const donationSubmit = document.querySelector("[data-donation-submit]");
let selectedAmount = 10;

function setDonationStatus(message, isError = false) {
  if (!donationStatus) return;
  donationStatus.textContent = message;
  donationStatus.classList.toggle("error", isError);
}

function selectAmount(amount, sourceButton = null) {
  selectedAmount = Number(amount);
  amountButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button === sourceButton));
  });
  if (sourceButton && customAmount) customAmount.value = "";
  setDonationStatus(`Selected one-time contribution: €${selectedAmount.toFixed(2)}.`);
}

amountButtons.forEach((button) => {
  button.addEventListener("click", () => selectAmount(button.dataset.donationAmount, button));
});

customAmount?.addEventListener("input", () => {
  const amount = Number(customAmount.value);
  amountButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
  if (Number.isFinite(amount)) selectedAmount = amount;
});

donationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(selectedAmount);
  if (!Number.isFinite(amount) || amount < MINIMUM_DONATION_EUR || amount > MAXIMUM_DONATION_EUR) {
    setDonationStatus(`Choose an amount between €${MINIMUM_DONATION_EUR} and €${MAXIMUM_DONATION_EUR}.`, true);
    customAmount?.focus();
    return;
  }
  donationSubmit.disabled = true;
  donationSubmit.textContent = "Opening secure checkout…";
  setDonationStatus("Creating a secure Stripe Checkout session. No card data is entered here.");
  try {
    const stripe = await loadStripe();
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: "Support UNDERSTAR development",
        unit_amount: Math.round(amount * 100),
        currency: "eur",
        payment_mode: "payment",
      }),
    });
    const session = await response.json();
    if (!response.ok || !session.id) throw new Error(session.error || "Checkout session could not be created.");
    const result = await stripe.redirectToCheckout({ sessionId: session.id });
    if (result?.error) throw result.error;
  } catch (_error) {
    setDonationStatus("Secure checkout is temporarily unavailable. Please retry or contact info@nextgen.run.", true);
    donationSubmit.disabled = false;
    donationSubmit.textContent = "Continue to secure checkout";
  }
});

initializeWikiSearch();
