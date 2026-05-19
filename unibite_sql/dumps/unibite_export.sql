-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: unibite
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `allergenlisting`
--

DROP TABLE IF EXISTS `allergenlisting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergenlisting` (
  `listing_id` int NOT NULL,
  `allergen_id` int NOT NULL,
  PRIMARY KEY (`listing_id`,`allergen_id`),
  KEY `allergen_id` (`allergen_id`),
  CONSTRAINT `allergenlisting_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`listingID`),
  CONSTRAINT `allergenlisting_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`allergenID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergenlisting`
--

LOCK TABLES `allergenlisting` WRITE;
/*!40000 ALTER TABLE `allergenlisting` DISABLE KEYS */;
INSERT INTO `allergenlisting` VALUES (1,1),(3,1),(3,2),(1,3),(3,3);
/*!40000 ALTER TABLE `allergenlisting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `allergens`
--

DROP TABLE IF EXISTS `allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergens` (
  `allergenID` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`allergenID`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergens`
--

LOCK TABLES `allergens` WRITE;
/*!40000 ALTER TABLE `allergens` DISABLE KEYS */;
INSERT INTO `allergens` VALUES (2,'eggs'),(1,'gluten'),(3,'milk'),(4,'nuts'),(5,'soybeans');
/*!40000 ALTER TABLE `allergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `listings` (
  `listingID` int NOT NULL AUTO_INCREMENT,
  `cook_id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text,
  `pickUP_point` varchar(300) NOT NULL,
  `pickUP_time` datetime NOT NULL,
  `status` enum('active','inactive','deleted') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `portions_total` int NOT NULL,
  `portions_available` int NOT NULL,
  PRIMARY KEY (`listingID`),
  KEY `cook_id` (`cook_id`),
  CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`cook_id`) REFERENCES `users` (`userID`),
  CONSTRAINT `listings_chk_1` CHECK ((`portions_total` > 0)),
  CONSTRAINT `listings_chk_2` CHECK ((`portions_available` >= 0)),
  CONSTRAINT `listings_chk_3` CHECK ((`portions_total` >= `portions_available`))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listings`
--

LOCK TABLES `listings` WRITE;
/*!40000 ALTER TABLE `listings` DISABLE KEYS */;
INSERT INTO `listings` VALUES (1,1,'Μακαρόνια με κιμά updated','Νέα περιγραφή','Εστία Α - Κτίριο 2','2026-05-05 14:00:00','deleted','2026-05-16 11:38:13','2026-05-18 14:38:13',3,0),(2,2,'Κοτόπουλο με ρύζι','Ψητό κοτόπουλο με λαχανικά και ρύζι.','Πανεπιστήμιο - Κυλικείο','2026-05-05 16:30:00','deleted','2026-05-16 11:38:13','2026-05-18 14:38:13',2,2),(3,3,'Παστίτσιο','Παραδοσιακό παστίτσιο φούρνου.','Εστία Β - Ισόγειο','2026-05-06 13:00:00','deleted','2026-05-16 11:38:13','2026-05-18 14:38:13',5,3),(4,1,'Μακαρόνια με κιμά','Σπιτικό φαγητό με φρέσκο κιμά και τυρί.','Εστία Α - Κτίριο 2','2026-05-05 14:00:00','deleted','2026-05-16 12:11:03','2026-05-18 15:11:03',3,2),(5,2,'Κοτόπουλο με ρύζι','Ψητό κοτόπουλο με λαχανικά και ρύζι.','Πανεπιστήμιο - Κυλικείο','2026-05-05 16:30:00','deleted','2026-05-16 12:11:03','2026-05-18 15:11:03',2,2),(6,3,'Παστίτσιο','Παραδοσιακό παστίτσιο φούρνου.','Εστία Β - Ισόγειο','2026-05-06 13:00:00','deleted','2026-05-16 12:11:03','2026-05-18 15:11:03',5,4),(7,1,'Μακαρόνια με κιμά','Σπιτικό φαγητό με φρέσκο κιμά και τυρί.','Εστία Α - Κτίριο 2','2026-05-05 14:00:00','deleted','2026-05-16 12:35:03','2026-05-18 15:35:03',3,2),(8,2,'Κοτόπουλο με ρύζι','Ψητό κοτόπουλο με λαχανικά και ρύζι.','Πανεπιστήμιο - Κυλικείο','2026-05-05 16:30:00','deleted','2026-05-16 12:35:03','2026-05-18 15:35:03',2,2),(9,3,'Παστίτσιο','Παραδοσιακό παστίτσιο φούρνου.','Εστία Β - Ισόγειο','2026-05-06 13:00:00','deleted','2026-05-16 12:35:03','2026-05-18 15:35:03',5,4),(10,1,'Φακές','Σπιτικές φακές με ψωμί','Εστία Α','2026-05-05 15:00:00','deleted','2026-05-16 12:36:05','2026-05-18 15:36:05',2,2),(11,2,'Γιουβέτσι με χυλοπίτες','Κομμάτια κοκκινιστού μοσχαριού με χυλοπίτες μαγειρεμένα στον φούρνο','Πλατεία Γεωργίου','2026-05-19 20:00:00','active','2026-05-19 09:55:12','2026-05-21 12:55:12',6,4);
/*!40000 ALTER TABLE `listings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `ratingID` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `stars` int NOT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ratingID`),
  KEY `request_id` (`request_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`requestID`),
  CONSTRAINT `ratings_chk_1` CHECK ((`stars` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
INSERT INTO `ratings` VALUES (1,3,5,'Πολύ νόστιμο και χορταστικό!','2026-05-16 11:40:27'),(2,1,5,'Πολύ νόστιμο φαγητό!','2026-05-16 13:45:33'),(3,4,5,'Πολύ νόστιμο φαγητό!','2026-05-16 13:56:43'),(4,5,5,'Πολύ ωραίο φαγητό!','2026-05-16 14:04:24'),(5,7,3,'Καλή προσπάθεια αλλα του έλειπε αλατι.','2026-05-19 10:01:10'),(6,8,3,'Καλή προσπάθεια αλλα του έλειπε αλατι.','2026-05-19 10:06:59');
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requests`
--

DROP TABLE IF EXISTS `requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `requests` (
  `requestID` int NOT NULL AUTO_INCREMENT,
  `listing_id` int NOT NULL,
  `consumer_id` int NOT NULL,
  `status` enum('pending','approved','rejected','picked_up','no_show') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `pickedUP_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`requestID`),
  KEY `listing_id` (`listing_id`),
  KEY `consumer_id` (`consumer_id`),
  CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`listingID`),
  CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`consumer_id`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requests`
--

LOCK TABLES `requests` WRITE;
/*!40000 ALTER TABLE `requests` DISABLE KEYS */;
INSERT INTO `requests` VALUES (1,1,2,'picked_up','2026-05-16 11:39:20','2026-05-16 13:33:18'),(2,1,3,'rejected','2026-05-16 11:39:20',NULL),(3,3,1,'picked_up','2026-05-16 11:39:20','2026-05-06 10:15:00'),(4,1,2,'picked_up','2026-05-16 12:56:54','2026-05-16 13:33:12'),(5,1,3,'picked_up','2026-05-16 14:01:28','2026-05-16 14:03:23'),(6,3,2,'no_show','2026-05-17 11:57:48',NULL),(7,11,1,'picked_up','2026-05-19 09:57:00','2026-05-19 10:00:05'),(8,11,3,'picked_up','2026-05-19 10:06:31','2026-05-19 10:06:50');
/*!40000 ALTER TABLE `requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `userID` int NOT NULL AUTO_INCREMENT,
  `name_lastname` varchar(45) NOT NULL,
  `email` varchar(100) NOT NULL,
  `points` int NOT NULL DEFAULT '5',
  `role` enum('student','admin') NOT NULL DEFAULT 'student',
  PRIMARY KEY (`userID`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Maria Tzavara','maria@test.com',8,'student'),(2,'Nikos Papadopoulos','nikos@test.com',4,'student'),(3,'Eleni Georgiou','eleni@test.com',10,'student'),(4,'Admin User','admin@test.com',0,'admin'),(9,'Kostas Ioannou','kostas@test.com',5,'student');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-19 15:17:38
