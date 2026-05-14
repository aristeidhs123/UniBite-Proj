// ../js/listing.js

function getQueryParam(name) {

    const params =
        new URLSearchParams(window.location.search);

    return params.get(name);
}

function initListingPage() {

    const detail =
        document.getElementById("listing-detail");

    if (!detail) return;

    const listingId = getQueryParam("id");

    const meals =
        JSON.parse(localStorage.getItem("meals") || "[]");

    const meal = meals.find(m =>
        String(m.id) === String(listingId)
    );

    if (!meal) {

        detail.innerHTML =
            "<p>Listing not found.</p>";

        return;
    }

    const isOwner =
        normalizeUser(meal.user) ===
        normalizeUser(window.CURRENT_USER);

    detail.innerHTML = `

        <div class="listing">

            <h2>${escapeHtml(meal.title)}</h2>

            ${
                meal.image
                ?
                `<img src="${meal.image}"
                style="width:100%;max-width:350px;">`
                :
                ""
            }

            <p>${escapeHtml(meal.desc)}</p>

            <p>
                <strong>Cook:</strong>
                ${escapeHtml(meal.user)}
            </p>

            <p>
                <strong>Category:</strong>
                ${escapeHtml(meal.category)}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHtml(meal.status)}
            </p>

            ${
                !isOwner
                ?
                `<button id="request-btn"
                class="request-btn">
                    Request Meal
                </button>`
                :
                `<p>Your listing</p>`
            }

        </div>
    `;

    const requestBtn =
        document.getElementById("request-btn");

    if (requestBtn) {

        requestBtn.addEventListener("click", () => {

            createRequestForMeal(meal);
        });
    }
}

window.initListingPage = initListingPage;

document.addEventListener(
    "DOMContentLoaded",
    initListingPage
);