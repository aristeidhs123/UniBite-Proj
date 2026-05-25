// ../js/mealService.js
// Simple localStorage-backed meal data service for UniBite.
// Provides a centralized API for reading, writing, and querying meals.

(function () {
    const STORAGE_KEY = "meals";

    function parseMeals(value) {
        try {
            const parsed = JSON.parse(value || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error("Failed to parse meal data:", error);
            return [];
        }
    }

    function getAll() {
        return parseMeals(localStorage.getItem(STORAGE_KEY));
    }

    function getById(id) {
        if (id == null) return null;
        const meals = getAll();
        return meals.find(meal => String(meal.id) === String(id)) || null;
    }

    function saveAll(meals) {
        if (!Array.isArray(meals)) {
            throw new Error("mealService.saveAll expects an array");
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
    }

    function add(meal) {
        const meals = getAll();
        const next = Array.isArray(meals) ? meals.slice() : [];
        next.push(meal);
        saveAll(next);
        return meal;
    }

    function update(meal) {
        if (!meal || meal.id == null) {
            throw new Error("mealService.update expects a meal object with an id");
        }
        const meals = getAll();
        const updated = meals.map(existing => String(existing.id) === String(meal.id) ? { ...existing, ...meal } : existing);
        saveAll(updated);
        return getById(meal.id);
    }

    function remove(id) {
        const meals = getAll();
        const filtered = meals.filter(meal => String(meal.id) !== String(id));
        saveAll(filtered);
        return filtered;
    }

    window.mealService = {
        getAll,
        getById,
        saveAll,
        add,
        update,
        remove
    };
})();
