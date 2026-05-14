// ../js/upload.js

function initUpload() {

    const form =
        document.getElementById("upload-form");

    const imageInput =
        document.getElementById("meal-image");

    const preview =
        document.getElementById("image-preview");

    let imageBase64 = "";
    const editMealId = localStorage.getItem("editMealId");

    if (editMealId) {
        loadExistingMeal(editMealId);
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

        if (!title || !desc) {

            alert("Please fill all fields.");

            return;
        }

        let meals =
            JSON.parse(localStorage.getItem("meals") || "[]");

        const mealData = {
            id: editMealId || `meal_${Date.now()}`,
            title,
            desc,
            category,
            image: imageBase64,
            user: window.CURRENT_USER,
            status: "available",
            ts: Date.now()
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

        alert(editMealId ? "Meal updated." : "Meal uploaded.");

        window.location.href = "profile.html";
    });

    function loadExistingMeal(id) {
        const meals = JSON.parse(localStorage.getItem("meals") || "[]");
        const meal = meals.find(m => String(m.id) === String(id));
        if (!meal) return;

        document.getElementById("meal-title").value = meal.title || "";
        document.getElementById("meal-desc").value = meal.desc || "";
        document.getElementById("meal-category").value = meal.category || "Breakfast";
        imageBase64 = meal.image || "";
        if (meal.image) {
            preview.src = meal.image;
            preview.style.display = "block";
        }

        const submitButton = form.querySelector("button[type=submit]");
        if (submitButton) {
            submitButton.textContent = "Update Meal";
        }
    }
}

window.initUpload = initUpload;