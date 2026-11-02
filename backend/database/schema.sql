/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.16-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: income_tax_system
-- ------------------------------------------------------
-- Server version	10.11.16-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `expense_types`
--

DROP TABLE IF EXISTS `expense_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_types` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `expense_code` varchar(50) NOT NULL,
  `expense_name` varchar(150) NOT NULL,
  `expense_category` enum('BUSINESS','PERSONAL') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_code` (`expense_code`),
  KEY `idx_expense_types_cat_status` (`expense_category`,`status`),
  KEY `idx_expense_types_dates` (`effective_from`,`effective_to`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `expense_type_id` int(10) unsigned NOT NULL,
  `expense_type` varchar(150) NOT NULL,
  `expense_category` enum('BUSINESS','PERSONAL') NOT NULL,
  `is_tax_deductible` tinyint(1) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `expense_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_expenses_type` (`expense_type_id`),
  KEY `idx_expenses_user_date` (`user_id`,`expense_date`),
  KEY `idx_expenses_deductible` (`user_id`,`expense_category`,`is_tax_deductible`,`expense_date`),
  CONSTRAINT `fk_expenses_type` FOREIGN KEY (`expense_type_id`) REFERENCES `expense_types` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_expenses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `income`
--

DROP TABLE IF EXISTS `income`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `income` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `income_type` varchar(50) NOT NULL,
  `source_name` varchar(150) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `income_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_income_user_date` (`user_id`,`income_date`),
  KEY `idx_income_user_type` (`user_id`,`income_type`),
  CONSTRAINT `fk_income_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `income_exemption_rules`
--

DROP TABLE IF EXISTS `income_exemption_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `income_exemption_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `income_type` varchar(50) NOT NULL,
  `exemption_code` varchar(50) NOT NULL,
  `exemption_name` varchar(150) NOT NULL,
  `calculation_type` enum('ONE_THIRD','PERCENTAGE','FIXED','ACTUAL') NOT NULL DEFAULT 'PERCENTAGE',
  `exemption_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `max_exemption_amount` decimal(15,2) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_income_exemption_year_code` (`tax_year`,`exemption_code`),
  KEY `idx_income_exemption_lookup` (`tax_year`,`income_type`,`status`),
  CONSTRAINT `fk_income_exemption_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `minimum_tax_rules`
--

DROP TABLE IF EXISTS `minimum_tax_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `minimum_tax_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `rule_type` varchar(30) NOT NULL DEFAULT 'AREA_BASED',
  `area_code` varchar(50) NOT NULL,
  `area_name` varchar(150) NOT NULL,
  `minimum_tax_amount` decimal(15,2) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_minimum_tax_year_area` (`tax_year`,`area_code`),
  KEY `idx_min_tax_rules_lookup` (`tax_year`,`area_code`,`status`),
  CONSTRAINT `fk_min_tax_rules_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refund_requests`
--

DROP TABLE IF EXISTS `refund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_requests` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `tax_return_id` int(10) unsigned NOT NULL,
  `tax_calculation_id` int(10) unsigned NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL,
  `account_holder_name` varchar(150) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `bank_account_number` varchar(50) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` text DEFAULT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_refund_user` (`user_id`),
  KEY `idx_refund_return` (`tax_return_id`),
  KEY `idx_refund_status` (`status`),
  KEY `fk_refund_calculation` (`tax_calculation_id`),
  KEY `fk_refund_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_refund_calculation` FOREIGN KEY (`tax_calculation_id`) REFERENCES `tax_calculations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refund_return` FOREIGN KEY (`tax_return_id`) REFERENCES `tax_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refund_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_refund_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `salary_exemption_rules`
--

DROP TABLE IF EXISTS `salary_exemption_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_exemption_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `calculation_type` enum('ONE_THIRD','PERCENTAGE','FIXED') NOT NULL DEFAULT 'ONE_THIRD',
  `exemption_percentage` decimal(5,2) NOT NULL DEFAULT 33.33,
  `max_exemption_amount` decimal(15,2) NOT NULL DEFAULT 500000.00,
  `description` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_salary_exemption_tax_year` (`tax_year`),
  KEY `idx_salary_exemption_lookup` (`tax_year`,`status`),
  CONSTRAINT `fk_sal_exemption_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `surcharge_rules`
--

DROP TABLE IF EXISTS `surcharge_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `surcharge_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `rule_name` varchar(150) NOT NULL,
  `minimum_wealth` decimal(18,2) NOT NULL DEFAULT 0.00,
  `maximum_wealth` decimal(18,2) DEFAULT NULL,
  `surcharge_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_surcharge_year_min_wealth` (`tax_year`,`minimum_wealth`),
  KEY `idx_surcharge_rules_lookup` (`tax_year`,`status`,`minimum_wealth`),
  CONSTRAINT `fk_surcharge_rules_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_calculation_details`
--

DROP TABLE IF EXISTS `tax_calculation_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_calculation_details` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_calculation_id` int(10) unsigned NOT NULL,
  `tax_rule_id` int(10) unsigned DEFAULT NULL,
  `slab_order` int(11) NOT NULL,
  `minimum_income` decimal(15,2) NOT NULL,
  `maximum_income` decimal(15,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `taxable_amount` decimal(15,2) NOT NULL,
  `calculated_tax` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_calc_details_rule` (`tax_rule_id`),
  KEY `idx_calc_details_calc` (`tax_calculation_id`,`slab_order`),
  CONSTRAINT `fk_calc_details_calc` FOREIGN KEY (`tax_calculation_id`) REFERENCES `tax_calculations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_calc_details_rule` FOREIGN KEY (`tax_rule_id`) REFERENCES `tax_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_calculations`
--

DROP TABLE IF EXISTS `tax_calculations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_calculations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `tax_year` varchar(20) NOT NULL,
  `category` varchar(50) NOT NULL,
  `total_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_deduction` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taxable_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `eligible_investment` decimal(15,2) NOT NULL DEFAULT 0.00,
  `gross_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_rebate` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_liability` decimal(15,2) NOT NULL DEFAULT 0.00,
  `salary_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `salary_exemption` decimal(15,2) NOT NULL DEFAULT 0.00,
  `house_property_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `business_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `capital_gain_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `agriculture_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `other_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `minimum_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `minimum_tax_rule_id` int(10) unsigned DEFAULT NULL,
  `net_wealth` decimal(18,2) NOT NULL DEFAULT 0.00,
  `surcharge_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `surcharge_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_tax_payable` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tds_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `advance_tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `final_payable` decimal(15,2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `filing_status` enum('DRAFT','SUBMITTED','VERIFIED') NOT NULL DEFAULT 'DRAFT',
  `calculated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_tax_calc_year` (`tax_year`),
  KEY `idx_tax_calc_user_year` (`user_id`,`tax_year`),
  KEY `idx_tax_calc_date` (`calculated_at`),
  KEY `fk_tax_calc_min_tax_rule` (`minimum_tax_rule_id`),
  CONSTRAINT `fk_tax_calc_min_tax_rule` FOREIGN KEY (`minimum_tax_rule_id`) REFERENCES `minimum_tax_rules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tax_calc_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tax_calculations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_credits`
--

DROP TABLE IF EXISTS `tax_credits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_credits` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `tax_year` varchar(10) NOT NULL,
  `tds_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `advance_tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `challan_number` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tax_credits_user_year` (`user_id`,`tax_year`),
  KEY `idx_tax_credits_year` (`tax_year`),
  CONSTRAINT `fk_tax_credits_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_deduction_rules`
--

DROP TABLE IF EXISTS `tax_deduction_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_deduction_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `deduction_code` varchar(50) NOT NULL,
  `deduction_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `income_type` varchar(50) DEFAULT NULL,
  `calculation_type` enum('FIXED','PERCENTAGE','LIMITED','ACTUAL') NOT NULL DEFAULT 'ACTUAL',
  `deduction_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `maximum_amount` decimal(15,2) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_deduction_rule_year_code` (`tax_year`,`deduction_code`),
  KEY `idx_deduction_rules_lookup` (`tax_year`,`status`,`effective_from`,`effective_to`),
  CONSTRAINT `fk_deduction_rules_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_deductions`
--

DROP TABLE IF EXISTS `tax_deductions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_deductions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `tax_year` varchar(20) NOT NULL,
  `deduction_code` varchar(50) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` text DEFAULT NULL,
  `deduction_date` date NOT NULL,
  `policy_sum_assured` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_tax_deductions_rule` (`tax_year`,`deduction_code`),
  KEY `idx_tax_deductions_lookup` (`user_id`,`tax_year`,`deduction_date`),
  KEY `idx_tax_deductions_code` (`deduction_code`),
  CONSTRAINT `fk_tax_deductions_rule` FOREIGN KEY (`tax_year`, `deduction_code`) REFERENCES `tax_deduction_rules` (`tax_year`, `deduction_code`) ON UPDATE CASCADE,
  CONSTRAINT `fk_tax_deductions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_rebate_rules`
--

DROP TABLE IF EXISTS `tax_rebate_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_rebate_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `rule_code` varchar(50) NOT NULL,
  `rule_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `calculation_type` enum('PERCENTAGE','FIXED','LIMIT') NOT NULL,
  `basis_type` varchar(50) NOT NULL,
  `rate` decimal(5,2) DEFAULT NULL,
  `fixed_amount` decimal(15,2) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rebate_rules_year_code` (`tax_year`,`rule_code`),
  KEY `idx_rebate_rules_lookup` (`tax_year`,`status`,`effective_from`),
  CONSTRAINT `fk_rebate_rules_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_return_acknowledgments`
--

DROP TABLE IF EXISTS `tax_return_acknowledgments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_return_acknowledgments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_return_id` int(10) unsigned NOT NULL,
  `acknowledgment_number` varchar(100) NOT NULL,
  `acknowledgment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `source` varchar(50) NOT NULL DEFAULT 'SYSTEM',
  `document_reference` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tax_return_acknowledgments_return` (`tax_return_id`),
  UNIQUE KEY `uq_tax_return_acknowledgments_number` (`acknowledgment_number`),
  CONSTRAINT `fk_tax_return_acknowledgments_return` FOREIGN KEY (`tax_return_id`) REFERENCES `tax_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_return_details`
--

DROP TABLE IF EXISTS `tax_return_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_return_details` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_return_id` int(10) unsigned NOT NULL,
  `section` varchar(50) NOT NULL,
  `income_type` varchar(50) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `metadata` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tax_return_details_return` (`tax_return_id`),
  KEY `idx_tax_return_details_section` (`tax_return_id`,`section`),
  CONSTRAINT `fk_tax_return_details_return` FOREIGN KEY (`tax_return_id`) REFERENCES `tax_returns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_return_status_history`
--

DROP TABLE IF EXISTS `tax_return_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_return_status_history` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_return_id` int(10) unsigned NOT NULL,
  `previous_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int(10) unsigned NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_tax_return_status_history_user` (`changed_by`),
  KEY `idx_tax_return_status_history_return` (`tax_return_id`),
  CONSTRAINT `fk_tax_return_status_history_return` FOREIGN KEY (`tax_return_id`) REFERENCES `tax_returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tax_return_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_returns`
--

DROP TABLE IF EXISTS `tax_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_returns` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `tax_calculation_id` int(10) unsigned NOT NULL,
  `tax_year` varchar(20) NOT NULL,
  `assessment_year` varchar(20) NOT NULL,
  `return_type` varchar(50) NOT NULL DEFAULT 'INDIVIDUAL_REGULAR',
  `return_status` enum('DRAFT','VALIDATED','PAID','FILED','SUBMITTED','ACKNOWLEDGED','REJECTED','AMENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `payment_status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_reference` varchar(100) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `total_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_exemption` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_deduction` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taxable_income` decimal(15,2) NOT NULL DEFAULT 0.00,
  `gross_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_rebate` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_liability` decimal(15,2) NOT NULL DEFAULT 0.00,
  `minimum_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payable_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `net_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `surcharge_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_tax_payable` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tds_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `advance_tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_tax_returns_calculation` (`tax_calculation_id`),
  KEY `idx_tax_returns_user_year` (`user_id`,`tax_year`),
  KEY `idx_tax_returns_status` (`return_status`),
  CONSTRAINT `fk_tax_returns_calculation` FOREIGN KEY (`tax_calculation_id`) REFERENCES `tax_calculations` (`id`),
  CONSTRAINT `fk_tax_returns_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_rules`
--

DROP TABLE IF EXISTS `tax_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_rules` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `minimum_income` decimal(15,2) NOT NULL,
  `maximum_income` decimal(15,2) DEFAULT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `fixed_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tax_rules_year_min_income` (`tax_year`,`minimum_income`),
  KEY `idx_tax_rules_lookup` (`tax_year`,`status`,`minimum_income`),
  KEY `idx_tax_rules_dates` (`effective_from`,`effective_to`),
  CONSTRAINT `fk_tax_rules_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_thresholds`
--

DROP TABLE IF EXISTS `tax_thresholds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_thresholds` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `category` varchar(50) NOT NULL,
  `tax_free_threshold` decimal(15,2) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_thresholds_year_category` (`tax_year`,`category`),
  KEY `idx_tax_thresholds_lookup` (`tax_year`,`category`,`status`),
  CONSTRAINT `fk_tax_thresholds_year` FOREIGN KEY (`tax_year`) REFERENCES `tax_years` (`tax_year`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tax_years`
--

DROP TABLE IF EXISTS `tax_years`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tax_years` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tax_year` varchar(20) NOT NULL,
  `income_year` varchar(20) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `is_current` tinyint(1) NOT NULL DEFAULT 0,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tax_year` (`tax_year`),
  KEY `idx_tax_years_status` (`status`,`is_current`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `taxpayer_profiles`
--

DROP TABLE IF EXISTS `taxpayer_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxpayer_profiles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `tin_number` varchar(12) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('MALE','FEMALE','THIRD_GENDER') DEFAULT NULL,
  `minimum_tax_area` varchar(50) NOT NULL DEFAULT 'OTHER_AREA',
  `is_new_taxpayer` tinyint(1) NOT NULL DEFAULT 0,
  `filing_history_status` enum('FIRST_TIME_FILER','PREVIOUS_FILER','UNAVAILABLE') NOT NULL DEFAULT 'UNAVAILABLE',
  `filing_history_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_physically_challenged` tinyint(1) NOT NULL DEFAULT 0,
  `disabled_child_dependents` int(10) unsigned NOT NULL DEFAULT 0,
  `is_freedom_fighter` tinyint(1) NOT NULL DEFAULT 0,
  `is_july_warrior` tinyint(1) NOT NULL DEFAULT 0,
  `net_wealth` decimal(18,2) NOT NULL DEFAULT 0.00,
  `has_multiple_motor_vehicles` tinyint(1) NOT NULL DEFAULT 0,
  `has_large_house_property` tinyint(1) NOT NULL DEFAULT 0,
  `tds_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `advance_tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `uk_taxpayer_profiles_tin` (`tin_number`),
  KEY `idx_taxpayer_profiles_area` (`minimum_tax_area`),
  CONSTRAINT `fk_taxpayer_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `nid` varchar(50) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `nid` (`nid`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_nid` (`nid`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=999994 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'income_tax_system'
--

--
-- Dumping routines for database 'income_tax_system'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02 22:18:06
