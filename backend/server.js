const db = require("./db");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// τεστ
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    res.json({
      message: "Database connected",
      result: rows[0].result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Database connection failed"
    });
  }
});

// εμφανιση αγγελιων στον browser 
app.get("/listings", async (req, res) => {
  try {
    // Αυτόματος υπολογισμός status
    await db.query(`
      UPDATE listings
      SET status =
        CASE
          WHEN status = 'deleted' THEN 'deleted'
          WHEN expires_at <= NOW() THEN 'deleted'
          WHEN portions_available = 0 THEN 'inactive'
          ELSE 'active'
        END
    `);

    // Εμφανίζουμε active + inactive, όχι deleted
    const [rows] = await db.query(`
      SELECT *
      FROM listings
      WHERE status != 'deleted'
      ORDER BY created_at DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching listings"
    });
  }
});

// εμφάνιση μίας συγκεκριμένης αγγελίας
app.get("/listings/:id", async (req, res) => {
  try {
    const listingId = req.params.id;

    const [rows] = await db.query(
      `
      SELECT
        l.listingID AS id,
        l.listingID,
        l.title,
        l.description,
        l.description AS \`desc\`,
        l.cook_id,
        l.cook_id AS cookId,
        u.name_lastname AS user,
        l.portions_total,
        l.portions_available,
        l.portions_available AS quantity,
        l.pickUP_point,
        l.pickUP_point AS pickupLocation,
        l.pickUP_point AS pickUp_point,
        l.pickUP_point AS pickUP_point,
        l.pickUP_time,
        l.pickUP_time AS pickupTime,
        l.pickUP_time AS pickUp_time,
        l.pickUP_time AS pickUP_time,
        l.status,
        l.expires_at,
        l.expires_at AS expiresAt,
        l.created_at,
        UNIX_TIMESTAMP(l.created_at) * 1000 AS ts
      FROM listings l
      JOIN users u ON l.cook_id = u.userID
      WHERE l.listingID = ?
        AND l.status != 'deleted'
      `,
      [listingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching listing"
    });
  }
});

// προσθήκη αγγελίας
app.post("/listings", async (req, res) => {
  try {
    const {
      cook_id,
      title,
      description,
      pickUP_point,
      pickUP_time,
      portions_total
    } = req.body;

// ελέγχουμε αν υπάρχουν επαρκή δεδομένα
    if (!cook_id || !title || !pickup_point || !pickup_time || !portions_total) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }
// οι μερίδες που προσφέρονται πρέπει να είναι >=1
    if (portions_total <= 0) {
      return res.status(400).json({
        message: "Portions must be greater than 0"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO listings (
        cook_id,
        title,
        description,
        pickUP_point,
        pickUP_time,
        portions_total,
        portions_available,
        expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))
      `,
      [
        cook_id,
        title,
        description,
        pickUP_point,
        pickUP_time,
        portions_total,
        portions_total
      ]
    );

    res.status(201).json({
      message: "Listing created",
      listing_id: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating listing"
    });
  }
});

// επεξεργασία αγγελίας
app.patch("/listings/:id", async (req, res) => {
  try {
    const listingId = req.params.id;

    const {
      cook_id,
      title,
      description,
      pickUP_point,
      pickUP_time,
      portions_total
    } = req.body;

// πρεπει να δωθει ο μαγειρας που επεξεργαζεται την αγγελια
    if (!cook_id) {
      return res.status(400).json({
        message: "cook_id is required"
      });
    }

    const [listings] = await db.query(
      `
      SELECT *
      FROM listings
      WHERE listingID = ?
      `,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    const listing = listings[0];

// ελεγχος ιδιοκτησιας της αγγελιας 
    if (listing.cook_id !== cook_id) {
      return res.status(403).json({
        message: "You can edit only your own listings"
      });
    }

    await db.query(
      `
       UPDATE listings
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        pickUP_point = COALESCE(?, pickUP_point),
        pickUP_time = COALESCE(?, pickUP_time),
        portions_total = COALESCE(?, portions_total)
      WHERE listingID = ?
      `,
      [
        title,
        description,
        pickUP_point,
        pickUP_time,
        portions_total,
        listingId
      ]
    );


    res.json({
      message: "Listing updated successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error updating listing"
    });
  }
});

// χειροκινητη διαγραφη αγγελιας
app.delete("/listings/:id", async (req, res) => {
  try {

    const listingId = req.params.id;
    const { cook_id } = req.body;

    if (!cook_id) {
      return res.status(400).json({
        message: "cook_id is required"
      });
    }

    const [listings] = await db.query(
      `
      SELECT *
      FROM listings
      WHERE listingID = ?
      `,
      [listingId]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    const listing = listings[0];

    if (Number(listing.cook_id) !== Number(cook_id))  {
      return res.status(403).json({
        message: "You can delete only your own listings"
      });
    }

    await db.query(
      `
      UPDATE listings
      SET status = 'deleted'
      WHERE listingID = ?
      `,
      [listingId]
    );

    res.json({
      message: "Listing deleted successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error deleting listing"
    });

  }
});

// αιτημα
app.post("/requests", async (req, res) => {
  try {
    const { listing_id, consumer_id } = req.body;

    if (!listing_id || !consumer_id) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    // Έλεγχος χρήστη και πόντων
    const [users] = await db.query(
      "SELECT * FROM users WHERE userID = ?",
      [consumer_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (users[0].points < 1) {
      return res.status(400).json({
        message: "Not enough points"
      });
    }

    // Έλεγχος αγγελίας
    const [listings] = await db.query(
      `
      SELECT *
      FROM listings
      WHERE listingID = ?
        AND expires_at > NOW()
      `,
      [listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        message: "Listing not found or expired"
      });
    }
    
    const listing = listings[0];

    if (Number(listing.cook_id) === Number(consumer_id)) {
      return res.status(400).json({
        message: "You cannot request your own listing"
       });
    }

    if (listing.portions_available <= 0) {
      return res.status(400).json({
        message: "No portions available"
      });
    }

    const [existingRequests] = await db.query(
    `
    SELECT *
    FROM requests
    WHERE listing_id = ?
    AND consumer_id = ?
    AND status IN ('pending', 'approved')
    `,
    [listing_id, consumer_id]
    );

    if (existingRequests.length > 0) {
      return res.status(400).json({
        message: "You have already requested this listing"
      });
    }

    // Δημιουργία αιτήματος
    const [result] = await db.query(
      `
      INSERT INTO requests (
        listing_id,
        consumer_id,
        status
      )
      VALUES (?, ?, 'pending')
      `,
      [listing_id, consumer_id]
    );

    res.status(201).json({
      message: "Request created",
      requestID: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating request"
    });
  }
});

// εμφανιση αιτηματων μαγειρα
app.get("/requests/cook/:cookId", async (req, res) => {
  try {
    const cookId = req.params.cookId;

    const [rows] = await db.query(
      `
      SELECT
        r.requestID,
        r.status,
        r.created_at,
        r.pickedUp_at,

        l.listingID,
        l.title,

        l.pickUP_point,
        l.pickUP_time,
        l.pickUP_point AS pickUp_point,
        l.pickUP_time AS pickUp_time,

        u.userID AS consumer_id,
        u.name_lastname AS consumer_name,
        u.email AS consumer_email
      FROM requests r
      JOIN listings l ON r.listing_id = l.listingID
      JOIN users u ON r.consumer_id = u.userID
      WHERE l.cook_id = ?
      ORDER BY r.created_at DESC
      `,
      [cookId]
    );

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching cook requests"
    });
  }
});

// εγκριση αιτηματος
app.patch("/requests/:id/approve", async (req, res) => {
  try {
    const requestId = req.params.id;

    // Βρες το request
    const [requests] = await db.query(
      `
      SELECT *
      FROM requests
      WHERE requestID = ?
      `,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    const request = requests[0];

    // Πρέπει να είναι pending
    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Only pending requests can be approved"
      });
    }

    // Βρες την αγγελία
    const [listings] = await db.query(
      `
      SELECT *
      FROM listings
      WHERE listingID = ?
      `,
      [request.listing_id]
    );

    if (listings.length === 0) {
      return res.status(404).json({
        message: "Listing not found"
      });
    }

    const listing = listings[0];

    // Έλεγχος διαθέσιμων μερίδων
    if (listing.portions_available <= 0) {
      return res.status(400).json({
        message: "No portions available"
      });
    }

    // Κάνε approve το request
    await db.query(
      `
      UPDATE requests
      SET status = 'approved'
      WHERE requestID = ?
      `,
      [requestId]
    );

    // Μείωσε τις διαθέσιμες μερίδες
    await db.query(
      `
      UPDATE listings
      SET portions_available = portions_available - 1
      WHERE listingID = ?
      `,
      [request.listing_id]
    );

    res.json({
      message: "Request approved successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error approving request"
    });
  }
});

// απορριψη αιτηματος
app.patch("/requests/:id/reject", async (req, res) => {
  try {
    const requestId = req.params.id;

    const [requests] = await db.query(
      `
      SELECT *
      FROM requests
      WHERE requestID = ?
      `,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    const request = requests[0];

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Only pending requests can be rejected"
      });
    }

    await db.query(
      `
      UPDATE requests
      SET status = 'rejected'
      WHERE requestID = ?
      `,
      [requestId]
    );

    res.json({
      message: "Request rejected successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error rejecting request"
    });
  }
});

// παραλαβη αιτηματος
app.patch("/requests/:id/picked-up", async (req, res) => {
  try {
    const requestId = req.params.id;

    const [requests] = await db.query(
      `
      SELECT *
      FROM requests
      WHERE requestID = ?
      `,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    const request = requests[0];

    if (request.status !== "approved") {
      return res.status(400).json({
        message: "Only approved requests can be marked as picked up"
      });
    }

    await db.query(
      `
      UPDATE requests
      SET status = 'picked_up',
          pickedUp_at = NOW()
      WHERE requestID = ?
      `,
      [requestId]
    );

    // Αφαίρεση 1 πόντου από τον καταναλωτή
    await db.query(
    `
    UPDATE users
    SET points = GREATEST(points - 1, 0)
    WHERE userID = ?
    `,
    [request.consumer_id]
    );

    res.json({
      message: "Request marked as picked up successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error marking request as picked up"
    });
  }
});

// μη παραλαβη αιτηματος
app.patch("/requests/:id/no-show", async (req, res) => {
  try {
    const requestId = req.params.id;

    const [requests] = await db.query(
      `
      SELECT *
      FROM requests
      WHERE requestID = ?
      `,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    const request = requests[0];

    if (request.status !== "approved") {
      return res.status(400).json({
        message: "Only approved requests can be marked as no-show"
      });
    }

    await db.query(
      `
      UPDATE requests
      SET status = 'no_show'
      WHERE requestID = ?
      `,
      [requestId]
    );

    await db.query(
      `
      UPDATE users
      SET points = GREATEST(points - 1, 0)
      WHERE userID = ?
      `,
      [request.consumer_id]
    );

    res.json({
      message: "Request marked as no-show and consumer lost 1 point"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error marking request as no-show"
    });
  }
});

// αξιολογηση γευματος
app.post("/ratings", async (req, res) => {
  try {
    const { request_id, reviewer_id, stars, description } = req.body;

    if (!request_id || !reviewer_id || !stars) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    if (stars < 1 || stars > 5) {
      return res.status(400).json({
        message: "Stars must be between 1 and 5"
      });
    }

    const [requests] = await db.query(
      `
      SELECT *
      FROM requests
      WHERE requestID = ?
      `,
      [request_id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Request not found"
      });
    }

    const request = requests[0];

    if (Number(request.consumer_id) !== Number(reviewer_id)) {
      return res.status(403).json({
        message: "Only the consumer can rate this request"
      });
    }

    if (request.status !== "picked_up") {
      return res.status(400).json({
        message: "Only picked up requests can be rated"
      });
    }

    const [existingRatings] = await db.query(
      `
      SELECT *
      FROM ratings
      WHERE request_id = ?
      `,
      [request_id]
    );

    if (existingRatings.length > 0) {
      return res.status(400).json({
        message: "This request has already been rated"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO ratings (
        request_id,
        stars,
        description
      )
      VALUES (?, ?, ?)
      `,
      [request_id, stars, description || null]
    );

    const [listingRows] = await db.query(
      `
      SELECT l.cook_id
      FROM requests r
      JOIN listings l ON r.listing_id = l.listingID
      WHERE r.requestID = ?
      `,
      [request_id]
    );

    if (listingRows.length === 0) {
      return res.status(404).json({
        message: "Listing for this request not found"
      });
    }

    const cookId = listingRows[0].cook_id;

    let pointsToAdd = 1;

    if (stars > 3) {
      pointsToAdd = 2;
    }

    await db.query(
      `
      UPDATE users
      SET points = points + ?
      WHERE userID = ?
      `,
      [pointsToAdd, cookId]
    );

    res.status(201).json({
      message: "Rating created successfully",
      rating_id: result.insertId,
      cook_points_added: pointsToAdd
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating rating"
    });
  }
});

// προβολη ποντων
app.get("/users/:id/points", async (req, res) => {
  try {
    const userId = req.params.id;

    const [rows] = await db.query(
      `
      SELECT
        userID,
        name_lastname,
        points
      FROM users
      WHERE userID = ?
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      user_id: rows[0].userID,
      name: rows[0].name_lastname,
      points: rows[0].points
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching user points"
    });
  }
});

// προβολη στατιστικων admin
app.get("/admin/stats/monthly-portions", async (req, res) => {
  try {

    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total_portions_shared
      FROM requests
      WHERE status = 'picked_up'
      AND pickedUp_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
      `
    );

    res.json({
      total_portions_shared_last_month:
        rows[0].total_portions_shared
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error fetching monthly statistics"
    });

  }
});

//LEADERBOARD
//Top-donor
app.get("/admin/leaderboard/top-donor", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.userID,
        u.name_lastname,
        COUNT(r.requestID) AS portions_shared
      FROM users u
      JOIN listings l ON u.userID = l.cook_id
      JOIN requests r ON l.listingID = r.listing_id
      WHERE r.status = 'picked_up'
      GROUP BY u.userID, u.name_lastname
      ORDER BY portions_shared DESC
      LIMIT 1
    `);

    res.json(rows[0] || {
      message: "No completed shares yet"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching top donor"
    });
  }
});

//top-rated-meals
app.get("/admin/leaderboard/top-rated-meals", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        l.listingID,
        l.title,
        u.name_lastname AS cook_name,
        AVG(rt.stars) AS average_rating,
        COUNT(rt.ratingID) AS total_ratings
      FROM ratings rt
      JOIN requests r ON rt.request_id = r.requestID
      JOIN listings l ON r.listing_id = l.listingID
      JOIN users u ON l.cook_id = u.userID
      GROUP BY l.listingID, l.title, u.name_lastname
      ORDER BY average_rating DESC, total_ratings DESC
      LIMIT 5
    `);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching top rated meals"
    });
  }
});

//new user
app.post("/users/register", async (req, res) => {
  try {
    const { name_lastname, email } = req.body;

    if (!name_lastname || !email) {
      return res.status(400).json({
        message: "Name and email are required"
      });
    }

    const [existingUsers] = await db.query(
      `
      SELECT *
      FROM users
      WHERE email = ?
      `,
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO users (
        name_lastname,
        email,
        points,
        role
      )
      VALUES (?, ?, 5, 'student')
      `,
      [name_lastname, email]
    );

    res.status(201).json({
      message: "User registered successfully",
      user_id: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error registering user"
    });
  }
});
