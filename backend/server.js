const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("./db");
const multer = require("multer");

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3000;

const uploadPath = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

app.use("/uploads", express.static(uploadPath));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(String(password || ""))
    .digest("hex");
}

const frontendPath = path.join(__dirname, "../unibite_frontend6");
const frontendHtmlPath = path.join(frontendPath, "html");
app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));
app.use(express.static(frontendHtmlPath));

app.get("/", function (req, res) {
  const homePath = path.join(frontendHtmlPath, "home.html");
  const indexPath = path.join(frontendHtmlPath, "index.html");

  if (fs.existsSync(homePath)) {
    return res.sendFile(homePath);
  }

  return res.sendFile(indexPath);
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

app.get("/listings", async (req, res) => {
  try {
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

    const [rows] = await db.query(`
      SELECT
        l.listingID AS id,
        l.listingID,
        l.title,
        l.description,
        l.description AS \`desc\`,
        l.pickup_lat,
        l.pickup_lng,
        l.image,
        l.cook_id,
        l.cook_id AS cookId,
        u.name_lastname AS user,
        u.name_lastname AS cook_name,
        l.portions_total,
        l.portions_available,
        l.portions_available AS quantity,
        l.pickUP_point,
        l.pickUP_point AS pickup_point,
        l.pickUP_point AS pickupLocation,
        l.pickUP_time,
        l.pickUP_time AS pickup_time,
        l.pickUP_time AS pickupTime,
        l.status,
        l.expires_at,
        l.expires_at AS expiresAt,
        l.created_at,
        UNIX_TIMESTAMP(l.created_at) * 1000 AS ts
        ,
        COALESCE(
        JSON_ARRAYAGG(a.name),
        JSON_ARRAY()
        ) AS allergens
      FROM listings l
        JOIN users u ON l.cook_id = u.userID
        LEFT JOIN listing_allergens la ON la.listing_id = l.listingID
        LEFT JOIN allergens a ON a.allergenID = la.allergen_id
        WHERE l.status != 'deleted'
        GROUP BY l.listingID
        ORDER BY l.created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error fetching listings"
    });
  }
});

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
        l.pickup_lat,
        l.pickup_lng,
        l.image,
        l.cook_id,
        l.cook_id AS cookId,
        u.name_lastname AS user,
        u.name_lastname AS cook_name,
        l.portions_total,
        l.portions_available,
        l.portions_available AS quantity,
        l.pickUP_point,
        l.pickUP_point AS pickup_point,
        l.pickUP_point AS pickupLocation,
        l.pickUP_point AS pickUp_point,
        l.pickUP_point AS pickUP_point,
        l.pickUP_time,
        l.pickUP_time AS pickup_time,
        l.pickUP_time AS pickupTime,
        l.pickUP_time AS pickUp_time,
        l.pickUP_time AS pickUP_time,
        l.status,
        l.expires_at,
        l.expires_at AS expiresAt,
        l.created_at,
        UNIX_TIMESTAMP(l.created_at) * 1000 AS ts,
        COALESCE(
          JSON_ARRAYAGG(a.name),
          JSON_ARRAY()
        ) AS allergens
      FROM listings l
      JOIN users u ON l.cook_id = u.userID
      LEFT JOIN listing_allergens la ON la.listing_id = l.listingID
      LEFT JOIN allergens a ON a.allergenID = la.allergen_id
      WHERE l.listingID = ?
        AND l.status != 'deleted'
      GROUP BY l.listingID
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

app.post("/listings", async (req, res) => {
  try {
    const {
      cook_id,
      title,
      description,
      portions_total,
      allergens,
      pickup_lat,
      pickup_lng,
      image
    } = req.body;

    const pickupPoint =
      req.body.pickup_point ||
      req.body.pickUP_point ||
      req.body.pickUp_point;

    const pickupTime =
      req.body.pickup_time ||
      req.body.pickUP_time ||
      req.body.pickUp_time;

    if (!cook_id || !title || !pickupPoint || !pickupTime || !portions_total) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    if (Number(portions_total) <= 0) {
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
    expires_at,
    pickup_lat,
    pickup_lng,
    image
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR), ?, ?, ?)
  `,
  [
    cook_id,
    title,
    description || "",
    pickupPoint,
    pickupTime,
    portions_total,
    portions_total,
    pickup_lat || null,
    pickup_lng || null,
    image || null
  ]
);

    const listingId = result.insertId;
    if (Array.isArray(allergens) && allergens.length > 0) {
      for (const allergenName of allergens) {
        const cleanName = String(allergenName).trim();

    if (!cleanName) {
      continue;
    }

    const [existing] = await db.query(
      `
      SELECT allergenID
      FROM allergens
      WHERE LOWER(name) = LOWER(?)
      `,
      [cleanName]
    );

    let allergenId;

    if (existing.length > 0) {
      allergenId = existing[0].allergenID;
    } else {
      const [insertAllergen] = await db.query(
        `
        INSERT INTO allergens (name)
        VALUES (?)
        `,
        [cleanName]
      );

      allergenId = insertAllergen.insertId;
    }

    await db.query(
      `
      INSERT IGNORE INTO listing_allergens (
        listing_id,
        allergen_id
      )
      VALUES (?, ?)
      `,
      [listingId, allergenId]
    );
  }
}
    res.status(201).json({
      message: "Listing created",
      listing_id: listingId,
      listingID: listingId
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error creating listing"
    });
  }
});

app.patch("/listings/:id", async (req, res) => {
  try {
    const listingId = req.params.id;

    const {
      cook_id,
      title,
      description,
      portions_total,
      allergens,
      pickup_lat,
      pickup_lng,
      image
    } = req.body;

    const pickupPoint =
      req.body.pickup_point ||
      req.body.pickUP_point ||
      req.body.pickUp_point;

    const pickupTime =
      req.body.pickup_time ||
      req.body.pickUP_time ||
      req.body.pickUp_time;

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

    if (Number(listing.cook_id) !== Number(cook_id)) {
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
      portions_total = COALESCE(?, portions_total),
      pickup_lat = COALESCE(?, pickup_lat),
      pickup_lng = COALESCE(?, pickup_lng),
      image = COALESCE(?, image)
      WHERE listingID = ?
      `,
      [
        title,
        description,
        pickupPoint,
        pickupTime,
        portions_total,
        pickup_lat || null,
        pickup_lng || null,
        image || null,
        listingId
      ]
    );

    if (Array.isArray(allergens)) {
  await db.query(
    `
    DELETE FROM listing_allergens
    WHERE listing_id = ?
    `,
    [listingId]
  );

  for (const allergenName of allergens) {
    const cleanName = String(allergenName).trim();

    if (!cleanName) {
      continue;
    }

    const [existing] = await db.query(
      `
      SELECT allergenID
      FROM allergens
      WHERE LOWER(name) = LOWER(?)
      `,
      [cleanName]
    );

    let allergenId;

    if (existing.length > 0) {
      allergenId = existing[0].allergenID;
    } else {
      const [insertAllergen] = await db.query(
        `
        INSERT INTO allergens (name)
        VALUES (?)
        `,
        [cleanName]
      );

      allergenId = insertAllergen.insertId;
    }

    await db.query(
      `
      INSERT IGNORE INTO listing_allergens (
        listing_id,
        allergen_id
      )
      VALUES (?, ?)
      `,
      [listingId, allergenId]
    );
  }
}

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

    if (Number(listing.cook_id) !== Number(cook_id)) {
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

app.post("/requests", async (req, res) => {
  try {
    const { listing_id, consumer_id } = req.body;

    if (!listing_id || !consumer_id) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

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
        l.pickUP_point AS pickup_point,
        l.pickUP_time AS pickup_time,
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

app.get("/requests/consumer/:consumerId", async (req, res) => {
  try {
    const consumerId = req.params.consumerId;

    await applyExpiredRatingPenalties(consumerId);

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
        l.pickUP_point AS pickup_point,
        l.pickUP_time AS pickup_time,
        u.userID AS cook_id,
        u.name_lastname AS cook_name,
        u.email AS cook_email,
        rt.ratingID,
        rt.stars,
        rt.description AS rating_description
      FROM requests r
      JOIN listings l ON r.listing_id = l.listingID
      JOIN users u ON l.cook_id = u.userID
      LEFT JOIN ratings rt ON rt.request_id = r.requestID
      WHERE r.consumer_id = ?
      ORDER BY r.created_at DESC
      `,
      [consumerId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error fetching consumer requests"
    });
  }
});

app.patch("/requests/:id/approve", async (req, res) => {
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
        message: "Only pending requests can be approved"
      });
    }

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

    if (listing.portions_available <= 0) {
      return res.status(400).json({
        message: "No portions available"
      });
    }

    await db.query(
      `
      UPDATE requests
      SET status = 'approved'
      WHERE requestID = ?
      `,
      [requestId]
    );

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

app.get("/users/:id/points", async (req, res) => {
  try {

    const userId = req.params.id;
    
    await applyExpiredRatingPenalties(req.params.id);

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

app.patch("/users/:id/profile", async (req, res) => {
  try {
    const userId = req.params.id;

    const {
      name_lastname,
      email,
      bio,
      profile_image
    } = req.body;

    const [users] = await db.query(
      `
      SELECT *
      FROM users
      WHERE userID = ?
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (email) {
      const [existingEmail] = await db.query(
        `
        SELECT *
        FROM users
        WHERE email = ?
          AND userID != ?
        `,
        [email, userId]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({
          message: "Email already exists"
        });
      }
    }

    await db.query(
      `
      UPDATE users
      SET
        name_lastname = COALESCE(?, name_lastname),
        email = COALESCE(?, email),
        bio = COALESCE(?, bio),
        profile_image = COALESCE(?, profile_image)
      WHERE userID = ?
      `,
      [
        name_lastname || null,
        email || null,
        bio || null,
        profile_image || null,
        userId
      ]
    );

    const [updatedRows] = await db.query(
      `
      SELECT
        userID,
        name_lastname,
        email,
        points,
        role,
        bio,
        profile_image
      FROM users
      WHERE userID = ?
      `,
      [userId]
    );

    res.json({
      message: "Profile updated successfully",
      user: updatedRows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error updating profile"
    });
  }
});
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
      total_portions_shared_last_month: rows[0].total_portions_shared
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error fetching monthly statistics"
    });
  }
});

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

app.post("/users/register", async (req, res) => {
  try {
    const { name_lastname, email, password } = req.body;

    if (!name_lastname || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
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
        password_hash,
        points,
        role
      )
      VALUES (?, ?, ?, 5, 'student')
      `,
      [name_lastname, email, hashPassword(password)]
    );

    res.status(201).json({
      message: "User registered successfully",
      user_id: result.insertId,
      userID: result.insertId,
      name_lastname,
      email,
      points: 5,
      role: "student"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error registering user"
    });
  }
});

app.post("/users/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email/name and password are required"
      });
    }

    const normalizedIdentifier = String(identifier).trim().replace(/^@/, "");
    const [rows] = await db.query(
      `
      SELECT
        userID,
        name_lastname,
        email,
        points,
        role,
        password_hash
      FROM users
      WHERE email = ?
        OR LOWER(name_lastname) = LOWER(?)
        OR LOWER(REPLACE(name_lastname, ' ', '')) = LOWER(REPLACE(?, ' ', ''))
      LIMIT 1
      `,
      [normalizedIdentifier, normalizedIdentifier, normalizedIdentifier]
    );

    if (rows.length === 0 || rows[0].password_hash !== hashPassword(password)) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const user = rows[0];

    res.json({
      message: "Login successful",
      user: {
        userID: user.userID,
        user_id: user.userID,
        name_lastname: user.name_lastname,
        email: user.email,
        points: user.points,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error logging in"
    });
  }
});

app.post("/upload/listing-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded"
      });
    }

    res.status(201).json({
      message: "Image uploaded successfully",
      image: "/uploads/" + req.file.filename
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error uploading image"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

async function applyExpiredRatingPenalties(userId = null) {
  const params = [];

  let userFilter = "";

  if (userId !== null && userId !== undefined) {
    userFilter = "AND r.consumer_id = ?";
    params.push(userId);
  }

  const [expiredRequests] = await db.query(
    `
    SELECT
      r.requestID,
      r.consumer_id
    FROM requests r
    LEFT JOIN ratings rt ON rt.request_id = r.requestID
    WHERE r.status = 'picked_up'
      AND r.pickedUp_at IS NOT NULL
      AND r.rating_penalty_applied = 0
      AND rt.ratingID IS NULL
      AND r.pickedUp_at <= DATE_SUB(NOW(), INTERVAL 48 HOUR)
      ${userFilter}
    `,
    params
  );

  for (const request of expiredRequests) {
    await db.query(
      `
      UPDATE users
      SET points = GREATEST(points - 1, 0)
      WHERE userID = ?
      `,
      [request.consumer_id]
    );

    await db.query(
      `
      UPDATE requests
      SET rating_penalty_applied = 1
      WHERE requestID = ?
      `,
      [request.requestID]
    );
  }

  return expiredRequests.length;
}
