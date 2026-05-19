// ../js/upload.js
// Upload page logic for creating or editing meal listings.
// It fills the form if editing an existing meal and saves new data
// to localStorage on submit.

function initUpload() {

    const form =
        document.getElementById("upload-form");

    const imageInput =
        document.getElementById("meal-image");

    const preview =
        document.getElementById("image-preview");

    const allergenSelect =
        document.getElementById("meal-allergens");
    
    const allergenOtherText =
        document.getElementById("meal-allergens-other");

    let imageBase64 = "";
    let existingMeal = null;
    const editMealId = localStorage.getItem("editMealId");
    
    // Toggle 'Other' allergens textarea when user selects 'other' option
    allergenSelect.addEventListener("change", function () {
        if (this.value === "other") {
            allergenOtherText.style.display = "inline-block";
        } else {
            allergenOtherText.style.display = "none";
            allergenOtherText.value = "";
        }
    });

    if (editMealId) {
        existingMeal = loadExistingMeal(editMealId);
    }

    imageInput.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {

            imageBase64 = reader.result;

            preview.src = reader.result;

            preview.style.display = "block";
        };

        reader.readAsDataURL(file);
    });

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const title =
            document.getElementById("meal-title")
            .value
            .trim();

        const desc =
            document.getElementById("meal-desc")
            .value
            .trim();

        const category =
            document.getElementById("meal-category")
            .value;

        const quantity = Number(
            document.getElementById("meal-quantity")
            .value
        );

        const pickupLocation =
            document.getElementById("meal-location")
            .value
            .trim();

        const pickupTime =
            document.getElementById("meal-time")
            .value
            .trim();

        // Collect allergens: either from select or custom textarea
        let allergensArray = [];
        const selectedAllergen = document.getElementById("meal-allergens").value;
        if (selectedAllergen === "other") {
            const customAllergens = document.getElementById("meal-allergens-other").value.trim();
            if (customAllergens) {
                allergensArray = customAllergens.split(",").map(a => a.trim()).filter(Boolean);
            }
        } else if (selectedAllergen) {
            allergensArray = [selectedAllergen];
        }

        if (!title || !desc || !pickupLocation || !pickupTime || quantity < 1) {
            showToast("Please fill all required fields and set a valid portions value.", "warning");
            return;
        }

        let meals =
            JSON.parse(localStorage.getItem("meals") || "[]");

        const mealData = {
            id: editMealId || `meal_${Date.now()}`,
            title,
            desc,
            category,
            quantity,
            pickupLocation,
            pickupTime,
            allergens: allergensArray,
            image: imageBase64,
            user: window.CURRENT_USER,
            status: existingMeal ? existingMeal.status : "available",
            ts: existingMeal ? existingMeal.ts : Date.now()
        };

        if (editMealId) {
            meals = meals.map(m => String(m.id) === String(editMealId) ? mealData : m);
            localStorage.removeItem("editMealId");
        } else {
            meals.push(mealData);
        }

        localStorage.setItem(
            "meals",
            JSON.stringify(meals)
        );

        showToast(editMealId ? "Meal updated." : "Meal uploaded.", "success");

        window.location.href = "profile.html";
    });

    function loadExistingMeal(id) {
        const meals = JSON.parse(localStorage.getItem("meals") || "[]");
        const meal = meals.find(m => String(m.id) === String(id));
        if (!meal) return;

        document.getElementById("meal-title").value = meal.title || "";
        document.getElementById("meal-desc").value = meal.desc || "";
        document.getElementById("meal-category").value = meal.category || "Breakfast";
        document.getElementById("meal-quantity").value = meal.quantity || 1;
        document.getElementById("meal-location").value = meal.pickupLocation || "";
        document.getElementById("meal-time").value = meal.pickupTime || "";
        
        // Restore allergens: if matches a predefined allergen, use select; otherwise use 'other' + textarea
        if (meal.allergens && meal.allergens.length > 0) {
            const allergensList = ["dairy", "nuts", "gluten", "soy", "shellfish", "eggs", "fish", "sesame"];
            const firstAllergen = meal.allergens[0];
            if (allergensList.includes(firstAllergen)) {
                allergenSelect.value = firstAllergen;
            } else {
                allergenSelect.value = "other";
                allergenOtherText.value = meal.allergens.join(", ");
                allergenOtherText.style.display = "inline-block";
            }
        }
        
        imageBase64 = meal.image || "";
        if (meal.image) {
            preview.src = meal.image;
            preview.style.display = "block";
        }

        const submitButton = form.querySelector("button[type=submit]");
        if (submitButton) {
            submitButton.textContent = "Update Meal";
        }

        return meal;
    }
}

window.initUpload = initUpload;