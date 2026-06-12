create database if not exists unibite;
use unibite;

create table user (
userID int auto_increment primary key,
name_lastname varchar(45) not null,
email varchar(100) not null unique,
points int not null default 5,
role enum('student','admin') not null default 'student'
);
ALTER TABLE user
RENAME TO users;
create table listing (
listingID int auto_increment primary key,
cook_id int not null,
title varchar(100) not null,
descreption text,
pickUP_point varchar(300) not null,
pickUP_time datetime not null,
status enum('active','inactive','deleted') not null default 'active',
created_at timestamp default current_timestamp,
expire_at datetime not null,
portions_total int not null,
portions_available int not null,

foreign key (cook_id) references user(userID),

check (portions_total > 0),
check (portions_available >= 0),
check (portions_total >= portions_available)
);
ALTER TABLE listing
RENAME COLUMN descreption TO description;
ALTER TABLE listing
RENAME TO listings;
ALTER TABLE listings
RENAME COLUMN expire_at TO expires_at;

create table request (
requestID int auto_increment primary key,
listing_id int not null,
consumer_id int not null,
status enum('pending','approved','rejected','picked_up','no_show') not null default 'pending',
created_at timestamp default current_timestamp,
pickedUP_at timestamp null,

foreign key (listing_id) references listing(listingID),
foreign key (consumer_id) references user(userID)
);
ALTER TABLE request
RENAME TO requests;

create table rating (
ratingID int auto_increment primary key,
request_id int not null,
stars int not null,
descreption text,
created_at timestamp default current_timestamp,

foreign key (request_id) references request(requestID),

check (stars between 1 and 5)
);
ALTER TABLE rating
RENAME COLUMN descreption TO description;
ALTER TABLE rating
RENAME TO ratings;

create table allergen (
allergenID int auto_increment primary key,
name varchar(45) not null unique
);
ALTER TABLE allergen
RENAME TO allergens;

 create table allergenListing (
 listing_id int not null,
 allergen_id int not null,
 
 primary key (listing_id,allergen_id),
 
 foreign key (listing_id) references listing(listingID),
 foreign key (allergen_id) references allergen(allergenID)
 );
 
ALTER TABLE users
ADD COLUMN password_hash VARCHAR(255) NOT NULL;

ALTER TABLE requests
ADD COLUMN rating_penalty_applied TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE listing_allergens (
  listing_id INT NOT NULL,
  allergen_id INT NOT NULL,
  PRIMARY KEY (listing_id, allergen_id),
  FOREIGN KEY (listing_id) REFERENCES listings(listingID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (allergen_id) REFERENCES allergens(allergenID)
    ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE users
ADD COLUMN bio TEXT NULL,
ADD COLUMN profile_image VARCHAR(255) NULL;

ALTER TABLE listings
ADD COLUMN image VARCHAR(255) NULL;

ALTER TABLE listings
ADD COLUMN pickup_lat DECIMAL(10,8) NULL,
ADD COLUMN pickup_lng DECIMAL(11,8) NULL;

CREATE TABLE notifications (
  notificationID INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  actor_id INT NULL,
  request_id INT NULL,
  listing_id INT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(userID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(userID)
    ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (request_id) REFERENCES requests(requestID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(listingID)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE messages (
  messageID INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NULL,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES requests(requestID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(userID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(userID)
    ON DELETE CASCADE ON UPDATE CASCADE
);
