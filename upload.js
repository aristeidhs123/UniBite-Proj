let uploadMap = null;
let uploadMarker = null;
let selectedPickupCoords = null;

async function initUpload() {
    const form = document.getElementById("upload-form");
    const imageInput = document.getElementById("meal-image");
    const preview = document.getElementById("image-preview");
    const allergenDropdown = document.getElementById("meal-allergens-dropdown");
    const allergenBtn = document.getElementById("meal-allergens-btn");
    const allergenOtherText = document.getElementById("meal-allergens-other");
    const allergenOtherCheckbox = document.getElementById("meal-allergens-other-checkbox");

    if (!form) return;

    let imageBase64 = "";
    let selectedImageFile = null;
    let existingMeal = null;
    const editMealId = sessionStorage.getItem("editMealId");

    setupAllergenDropdown(allergenBtn, allergenDropdown, allergenOtherCheckbox, allergenOtherText,);
    
    initUploadMap();

    if (editMealId) {
        existingMeal = await loadExistingMeal(editMealId);
    }

    if (imageInput && preview) {
        imageInput.addEventListener("change", function () {
            const file = this.files[0];
            if (!file) return;

            selectedImageFile = file;

            const reader = new FileReader();
            reader.onload = function () {
                imageBase64 = reader.result;
                preview.src = reader.result;
                preview.style.display = "block";
            };
            reader.readAsDataURL(file);
        });
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        let uploadedImagePath = imageBase64;
        if (selectedImageFile) {
            const formData = new FormData();
            formData.append("image", selectedImageFile);
            
            const response = await fetch("http://localhost:3000/upload/listing-image", {
                method: "POST",
                body: formData
            });
            
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || "Could not upload image.");
        }

    uploadedImagePath = "http://localhost:3000" + result.image;
    }

    const mealData = collectMealFormData(editMealId, existingMeal, uploadedImagePath);

        if (!mealData.title || !mealData.desc || !mealData.pickupLocation || !mealData.pickupTime || Number(mealData.quantity) < 1) {
            showToast("Please fill all required fields and set a valid portions value.", "warning");
            return;
        }

        const cookId = window.UniBiteAPI?.getCurrentUserId ? window.UniBiteAPI.getCurrentUserId() : 1;
        const submitButton = form.querySelector("button[type=submit]");
        if (submitButton) submitButton.disabled = true;

        try {
            await mealService.saveRemote(mealData, cookId);
            sessionStorage.removeItem("editMealId");
            showToast(editMealId ? "Meal updated." : "Meal uploaded.", "success");
            setTimeout(() => window.location.href = "index.html", 500);
        } catch (error) {
            showToast(error.message || "Could not save meal to backend.", "error");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

    async function loadExistingMeal(id) {
        let meal = null;

        try {
            meal = await mealService.getByIdRemote(id);
        } catch (error) {
            showToast(error.message || "Could not load meal from backend.", "error");
            return null;
        }

        if (!meal) return null;

        document.getElementById("meal-title").value = meal.title || "";
        document.getElementById("meal-desc").value = meal.desc || "";
        document.getElementById("meal-category").value = meal.category || "Breakfast";
        document.getElementById("meal-quantity").value = meal.quantity || 1;
        document.getElementById("meal-location").value = meal.pickupLocation || "";
        document.getElementById("meal-time").value = meal.pickupRawTime || meal.pickupTime || "";

        restoreAllergens(meal.allergens || []);

        imageBase64 = meal.image || "";
        if (meal.image && preview) {
            preview.src = meal.image;
            preview.style.display = "block";
        }

        const submitButton = form.querySelector("button[type=submit]");
        if (submitButton) submitButton.textContent = "Update Meal";

        return meal;
    }
}

function collectMealFormData(editMealId, existingMeal, imageBase64) {
    const allergens = collectAllergens();

    const pickupCoords = selectedPickupCoords || existingMeal?.coords || null;

    return {
        id: editMealId || "meal_" + Date.now(),
        backendId: existingMeal?.backendId,
        title: document.getElementById("meal-title").value.trim(),
        desc: document.getElementById("meal-desc").value.trim(),
        category: document.getElementById("meal-category").value,
        quantity: Number(document.getElementById("meal-quantity").value),
        pickupLocation: document.getElementById("meal-location").value.trim(),
        pickupTime: document.getElementById("meal-time").value.trim(),
        coords: pickupCoords,
        allergens,
        image: imageBase64 || existingMeal?.image || "",
        user: window.CURRENT_USER,
        status: existingMeal ? existingMeal.status : "available",
        ts: existingMeal ? existingMeal.ts : Date.now()
    };
}

function saveLocalMeal(meal, isEdit) {
    const meals = mealService.getAll();
    const updated = isEdit
        ? meals.map(item => String(item.id) === String(meal.id) ? meal : item)
        : meals.concat(meal);
    mealService.saveAll(updated);
}

function setupAllergenDropdown(btn, dropdown, otherCheckbox, otherText) {
    if (btn && dropdown) {
        btn.addEventListener("click", () => {
            const expanded = btn.getAttribute("aria-expanded") === "true";
            btn.setAttribute("aria-expanded", String(!expanded));
            dropdown.classList.toggle("hidden", expanded);
        });

        document.addEventListener("click", event => {
            if (!btn.contains(event.target) && !dropdown.contains(event.target)) {
                btn.setAttribute("aria-expanded", "false");
                dropdown.classList.add("hidden");
            }
        });
    }

    if (otherCheckbox && otherText) {
        otherCheckbox.addEventListener("change", function () {
            otherText.style.display = this.checked ? "inline-block" : "none";
            if (!this.checked) otherText.value = "";
        });
    }
}

function collectAllergens() {
    const checked = Array.from(document.querySelectorAll("#meal-allergens-dropdown input[type=checkbox]:checked"))
        .map(box => box.value);
    const allergens = checked.filter(value => value !== "other");

    if (checked.includes("other")) {
        const custom = (document.getElementById("meal-allergens-other")?.value || "").trim();
        if (custom) allergens.push(...custom.split(",").map(item => item.trim()).filter(Boolean));
    }

    return allergens;
}

function restoreAllergens(allergens) {
    const boxes = Array.from(document.querySelectorAll("#meal-allergens-dropdown input[type=checkbox]"));
    const knownValues = boxes.map(box => box.value.toLowerCase());
    const other = [];

    allergens.forEach(item => {
        const value = String(item).toLowerCase();
        const box = boxes.find(input => input.value.toLowerCase() === value);
        if (box) box.checked = true;
        else other.push(item);
    });

    if (other.length) {
        const otherBox = document.getElementById("meal-allergens-other-checkbox");
        const otherText = document.getElementById("meal-allergens-other");
        if (otherBox) otherBox.checked = true;
        if (otherText) {
            otherText.style.display = "inline-block";
            otherText.value = other.join(", ");
        }
    }
}

function initUploadMap() {
    const mapEl = document.getElementById("upload-map");

    if (!mapEl || typeof L === "undefined") {
        return;
    }

    const defaultCoords = [38.2466, 21.7345];

    uploadMap = L.map(mapEl).setView(defaultCoords, 15);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap"
        }
    ).addTo(uploadMap);

    uploadMap.on("click", function (e) {

        selectedPickupCoords = [
            e.latlng.lat,
            e.latlng.lng
        ];

        if (uploadMarker) {
            uploadMarker.setLatLng(e.latlng);
        } else {
            uploadMarker = L.marker(e.latlng).addTo(uploadMap);
        }

        const label =
            document.getElementById("pickup-coords-label");

        if (label) {
            label.textContent =
                "Selected: " +
                e.latlng.lat.toFixed(6) +
                ", " +
                e.latlng.lng.toFixed(6);
        }
    });
}
window.initUpload = initUpload;
