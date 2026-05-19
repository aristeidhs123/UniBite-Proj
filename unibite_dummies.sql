use unibite;
INSERT INTO user (
    name_lastname,
    email,
    points,
    role
)
VALUES
('Maria Tzavara', 'maria@test.com', 8, 'student'),
('Nikos Papadopoulos', 'nikos@test.com', 4, 'student'),
('Eleni Georgiou', 'eleni@test.com', 10, 'student'),
('Admin User', 'admin@test.com', 0, 'admin');

INSERT INTO listings (
    cook_id,
    title,
    description,
    pickup_point,
    pickup_time,
    portions_total,
    portions_available,
    expires_at
)
VALUES
(
    1,
    'Μακαρόνια με κιμά',
    'Σπιτικό φαγητό με φρέσκο κιμά και τυρί.',
    'Εστία Α - Κτίριο 2',
    '2026-05-05 14:00:00',
    3,
    2,
    DATE_ADD(NOW(), INTERVAL 48 HOUR)
),
( 2,
    'Κοτόπουλο με ρύζι',
    'Ψητό κοτόπουλο με λαχανικά και ρύζι.',
    'Πανεπιστήμιο - Κυλικείο',
    '2026-05-05 16:30:00',
    2,
    2,
    DATE_ADD(NOW(), INTERVAL 48 HOUR)
),
(
    3,
    'Παστίτσιο',
    'Παραδοσιακό παστίτσιο φούρνου.',
    'Εστία Β - Ισόγειο',
    '2026-05-06 13:00:00',
    5,
    4,
    DATE_ADD(NOW(), INTERVAL 48 HOUR)
);

INSERT INTO request (
    listing_id,
    consumer_id,
    status,
    pickedUP_at
)
VALUES
(
    1,
    2,
    'approved',
    '2026-05-05 14:10:00'
),
(
    1,
    3,
    'pending',
    NULL
),
(
    3,
    1,
    'picked_up',
    '2026-05-06 13:15:00'
);

INSERT INTO rating (
    request_id,
    stars,
    description
)
VALUES
(
    3,
    5,
    'Πολύ νόστιμο και χορταστικό!'
);

INSERT INTO allergen (name)
VALUES
('gluten'),
('eggs'),
('milk'),
('nuts'),
('soybeans');

INSERT INTO allergenlisting (
    listing_id,
    allergen_id
)
VALUES
(1, 1), -- gluten
(1, 3), -- milk
(3, 1), -- gluten
(3, 2), -- eggs
(3, 3); -- milk
