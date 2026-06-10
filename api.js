(function () {
    const DEFAULT_BASE = "http://localhost:3000";

    function getBaseUrl() {
        return DEFAULT_BASE;
    }

    async function request(path, method = "GET", data = null) {
        const options = {
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };

        if (data !== null && data !== undefined) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(getBaseUrl() + path, options);

        let result = null;

        try {
            result = await response.json();
        } catch (error) {
            result = null;
        }

        if (!response.ok) {
            throw new Error(result?.message || "Request failed");
        }

        return result;
    }

    function getCurrentUsername() {
        return sessionStorage.getItem("CURRENT_USER") || "";
    }

    function getCurrentUserId() {
        const saved = sessionStorage.getItem("CURRENT_USER_ID");

        if (saved) {
            return Number(saved);
        }

        return null;
    }

    function setCurrentUserId(id) {
        if (id !== null && id !== undefined) {
            sessionStorage.setItem("CURRENT_USER_ID", String(id));
        }
    }

    const ListingsAPI = {
        getAll: function () {
            return request("/listings");
        },

        getById: function (id) {
            return request("/listings/" + id);
        },

        create: function (data) {
            return request("/listings", "POST", data);
        },

        update: function (id, data) {
            return request("/listings/" + id, "PATCH", data);
        },

        remove: function (id, cookId) {
            return request("/listings/" + id, "DELETE", {
                cook_id: cookId
            });
        }
    };

    const RequestsAPI = {
        create: function (data) {
            return request("/requests", "POST", data);
        },

        getForCook: function (cookId) {
            return request("/requests/cook/" + cookId);
        },

        getForConsumer: function (consumerId) {
            return request("/requests/consumer/" + consumerId);
        },

        approve: function (id) {
            return request("/requests/" + id + "/approve", "PATCH");
        },

        reject: function (id) {
            return request("/requests/" + id + "/reject", "PATCH");
        },

        pickedUp: function (id) {
            return request("/requests/" + id + "/picked-up", "PATCH");
        },

        noShow: function (id) {
            return request("/requests/" + id + "/no-show", "PATCH");
        }
    };

    const RatingsAPI = {
        create: function (data) {
            return request("/ratings", "POST", data);
        }
    };

    const UsersAPI = {
        login: function (data) {
            return request("/users/login", "POST", data);
        },

        register: function (data) {
            return request("/users/register", "POST", data);
        },

        points: function (id) {
            return request("/users/" + id + "/points");
        },

        updateProfile: function (id, data) {
            return request("/users/" + id + "/profile", "PATCH", data);
},
    };

    const AdminAPI = {
        monthlyPortions: function () {
            return request("/admin/stats/monthly-portions");
        },

        topDonor: function () {
            return request("/admin/leaderboard/top-donor");
        },

        topRatedMeals: function () {
            return request("/admin/leaderboard/top-rated-meals");
        }
    };

    function mapListingToMeal(listing) {
        const id = listing.listingID ?? listing.listing_id ?? listing.id;

        const available = Number(
            listing.portions_available ??
            listing.quantity ??
            listing.portions_total ??
            0
        );

        const total = Number(
            listing.portions_total ??
            available ??
            1
        );

        const createdAt = listing.created_at
            ? new Date(listing.created_at).getTime()
            : Date.now();

        const pickupPoint =
            listing.pickUP_point ||
            listing.pickup_point ||
            listing.pickupLocation ||
            "";

        const pickupTime =
            listing.pickUP_time ||
            listing.pickup_time ||
            listing.pickupTime ||
            "";

        // για πραγματικο χαρτη
        // Αν το backend επιστρεφει pickup_lat και pickup_lng, το meal object
        // θα μπορουσε να κραταει πραγματικες συντεταγμενες απο τη βαση:
        // const backendCoords =
        //     listing.pickup_lat !== null && listing.pickup_lng !== null
        //         ? [Number(listing.pickup_lat), Number(listing.pickup_lng)]
        //         : null;

        return {
            id: id,
            backendId: id,
            cookId: listing.cook_id ?? listing.cookId,
            title: listing.title || "Untitled meal",
            desc: listing.description || listing.desc || "",
            category: listing.category || "Lunch",
            quantity: available,
            totalQuantity: total,
            pickupLocation: pickupPoint,
            pickupTime: formatPickupTime(pickupTime),
            pickupRawTime: pickupTime,
            allergens: Array.isArray(listing.allergens) ? listing.allergens : [],
            image: listing.image || listing.photo || "",
            user: listing.cook_name || listing.user || (listing.cook_id ? "Cook #" + listing.cook_id : "Unknown"),
            status: listing.status || "active",
            ts: listing.ts || createdAt,
            expiresAt: listing.expires_at || listing.expiresAt || null
            // για πραγματικο χαρτη
            // coords: backendCoords
        };
    }

    function mapMealToListing(meal, cookId) {
        const pickupTime = normalizePickupTime(meal.pickupTime);

        return {
            cook_id: Number(cookId),
            title: meal.title,
            description: meal.desc,
            pickup_point: meal.pickupLocation,
            pickup_time: pickupTime,
            pickUP_point: meal.pickupLocation,
            pickUP_time: pickupTime,
            portions_total: Number(meal.quantity || 1)
            // για πραγματικο χαρτη
            // pickup_lat: meal.coords?.[0] ?? null,
            // pickup_lng: meal.coords?.[1] ?? null
        };
    }

    function normalizePickupTime(value) {
        const text = String(value || "").trim();

        if (!text) {
            return "";
        }

        if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
            return text.replace("T", " ");
        }

        if (/^\d{1,2}:\d{2}$/.test(text)) {
            const today = new Date().toISOString().slice(0, 10);
            return today + " " + text + ":00";
        }

        return text;
    }

    function formatPickupTime(value) {
        if (!value) {
            return "";
        }

        const text = String(value);

        if (text.includes("T")) {
            return text.replace("T", " ").slice(0, 16);
        }

        return text.slice(0, 16);
    }

    window.UniBiteAPI = {
        request: request,
        getBaseUrl: getBaseUrl,
        getCurrentUserId: getCurrentUserId,
        setCurrentUserId: setCurrentUserId,
        ListingsAPI: ListingsAPI,
        RequestsAPI: RequestsAPI,
        RatingsAPI: RatingsAPI,
        UsersAPI: UsersAPI,
        AdminAPI: AdminAPI,
        mapListingToMeal: mapListingToMeal,
        mapMealToListing: mapMealToListing,
        normalizePickupTime: normalizePickupTime
    };
})();
