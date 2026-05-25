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

    const allergenDropdown = document.getElementById("meal-allergens-dropdown");
    const allergenBtn = document.getElementById("meal-allergens-btn");
    const allergenOtherText = document.getElementById("meal-allergens-other");
    const allergenOtherCheckbox = document.getElementById("meal-allergens-other-checkbox");

    let imageBase64 = "";
    let existingMeal = null;
    const editMealId = localStorage.getItem("editMealId");
    
    // Dropdown toggle for allergens button
    if (allergenBtn && allergenDropdown) {
        allergenBtn.addEventListener("click", () => {
            const expanded = allergenBtn.getAttribute("aria-expanded") === "true";
            allergenBtn.setAttribute("aria-expanded", String(!expanded));
            allergenDropdown.classList.toggle("hidden", expanded);
        });
        document.addEventListener("click", (e) => {
            if (!allergenBtn.contains(e.target) && !allergenDropdown.contains(e.target)) {
                allergenBtn.setAttribute("aria-expanded", "false");
                allergenDropdown.classList.add("hidden");
            }
        });
    }

    // Toggle 'Other' allergens textarea when the 'other' checkbox is checked
    if (allergenOtherCheckbox) {
        allergenOtherCheckbox.addEventListener("change", function () {
            if (this.checked) {
                allergenOtherText.style.display = "inline-block";
            } else {
                allergenOtherText.style.display = "none";
                allergenOtherText.value = "";
            }
        });
    }

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

        // Collect allergens from dropdown checkboxes and optional 'other' textarea
        let allergensArray = [];
        const checkedBoxes = Array.from(document.querySelectorAll("#meal-allergens-dropdown input[type=checkbox]:checked")).map(cb => cb.value);
        const includesOther = checkedBoxes.includes("other");
        allergensArray = checkedBoxes.filter(v => v !== "other");
        if (includesOther) {
            const customAllergens = (document.getElementById("meal-allergens-other").value || "").trim();
            if (customAllergens) {
                allergensArray = allergensArray.concat(customAllergens.split(",").map(a => a.trim()).filter(Boolean));
            }
        }

        if (!title || !desc || !pickupLocation || !pickupTime || quantity < 1) {
            showToast("Please fill all required fields and set a valid portions value.", "warning");
            return;
        }

        let meals =
            mealService.getAll();

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
        const meals = mealService.getAll();
        const meal = meals.find(m => String(m.id) === String(id));
        if (!meal) return;

        document.getElementById("meal-title").value = meal.title || "";
        document.getElementById("meal-desc").value = meal.desc || "";
        document.getElementById("meal-category").value = meal.category || "Breakfast";
        document.getElementById("meal-quantity").value = meal.quantity || 1;
        document.getElementById("meal-location").value = meal.pickupLocation || "";
        document.getElementById("meal-time").value = meal.pickupTime || "";
        
        // Restore allergens: check matching checkboxes, or put others into 'other' textarea
        if (meal.allergens && meal.allergens.length > 0) {
            const checkboxMap = {};
            const boxes = Array.from(document.querySelectorAll('#meal-allergens-dropdown input[type=checkbox]'));
            boxes.forEach(b => checkboxMap[String(b.value).toLowerCase()] = b);

            const others = [];
            meal.allergens.forEach(a => {
                const v = String(a || "").toLowerCase();
                if (checkboxMap[v]) {
                    checkboxMap[v].checked = true;
                } else if (v) {
                    others.push(a);
                }
            });

            if (others.length) {
                if (checkboxMap['other']) checkboxMap['other'].checked = true;
                allergenOtherText.value = others.join(", ");
                allergenOtherText.style.display = "inline-block";
            }

            // update button label
            const selected = boxes.filter(b => b.checked).map(b => b.value).concat(others);
            const btn = document.getElementById('meal-allergens-btn');
            if (btn) {
                if (!selected.length) btn.textContent = 'Select allergens ▾';
                else if (selected.length === 1) btn.textContent = selected[0] + ' ▾';
                else btn.textContent = selected.length + ' selected ▾';
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