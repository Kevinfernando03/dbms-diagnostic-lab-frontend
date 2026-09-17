-- =============================================================================
-- MERIDIAN DIAGNOSTICS LIS/LIMS - RELATIONAL DATABASE SCHEMA (MySQL 8.0+)
-- =============================================================================

-- Drop tables in reverse order of dependencies if re-executing
DROP TABLE IF EXISTS HasResult;
DROP TABLE IF EXISTS Report;
DROP TABLE IF EXISTS Sample;
DROP TABLE IF EXISTS OrderIncludesTest;
DROP TABLE IF EXISTS TestOrder;
DROP TABLE IF EXISTS PathologyTest;
DROP TABLE IF EXISTS RadiologyTest;
DROP TABLE IF EXISTS Test;
DROP TABLE IF EXISTS Doctor;
DROP TABLE IF EXISTS Patient_Contact;
DROP TABLE IF EXISTS Patient;
DROP TABLE IF EXISTS LabTechnician;
DROP TABLE IF EXISTS Pathologist;
DROP TABLE IF EXISTS LabStaff;
DROP TABLE IF EXISTS Laboratory;

-- -----------------------------------------------------------------------------
-- 1. PATIENT & PATIENT_CONTACT
-- -----------------------------------------------------------------------------
CREATE TABLE Patient (
    Patient_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    First_Name VARCHAR(60) NOT NULL,
    Last_Name VARCHAR(60) NOT NULL,
    DOB DATE NOT NULL,
    Gender ENUM('M', 'F', 'O') NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Patient_Contact (
    Patient_ID VARCHAR(20) NOT NULL,
    Contact_No VARCHAR(20) NOT NULL,
    PRIMARY KEY (Patient_ID, Contact_No),
    CONSTRAINT fk_contact_patient
        FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. DOCTOR (REFERRING PHYSICIAN)
-- -----------------------------------------------------------------------------
CREATE TABLE Doctor (
    Doctor_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Doctor_Name VARCHAR(100) NOT NULL,
    Specialization VARCHAR(100) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. TEST CATALOGUE (GENERALIZATION & SPECIALIZATION)
-- -----------------------------------------------------------------------------
CREATE TABLE Test (
    Test_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Test_Name VARCHAR(100) NOT NULL,
    Test_Category ENUM('Pathology', 'Radiology') NOT NULL,
    Price INT UNSIGNED NOT NULL,
    Unit VARCHAR(20) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PathologyTest (
    Test_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Specimen_Type ENUM('Blood', 'Serum', 'Urine', 'Tissue', 'Stool', 'Swab') NOT NULL,
    CONSTRAINT fk_pathology_test
        FOREIGN KEY (Test_ID) REFERENCES Test(Test_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE RadiologyTest (
    Test_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Imaging_Modality ENUM('X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Mammography') NOT NULL,
    CONSTRAINT fk_radiology_test
        FOREIGN KEY (Test_ID) REFERENCES Test(Test_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. LABORATORY (PROCESSING FACILITIES)
-- -----------------------------------------------------------------------------
CREATE TABLE Laboratory (
    Lab_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Lab_Name VARCHAR(100) NOT NULL,
    Location VARCHAR(100) NOT NULL,
    Contact_No VARCHAR(20) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. LAB STAFF (ISA HIERARCHY: TECHNICIAN & PATHOLOGIST)
-- -----------------------------------------------------------------------------
CREATE TABLE LabStaff (
    Staff_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Staff_Name VARCHAR(100) NOT NULL,
    Shift ENUM('Morning', 'Evening', 'Night', 'General') NOT NULL,
    Staff_Role ENUM('Technician', 'Pathologist') NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE LabTechnician (
    Tech_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Certification VARCHAR(100) NOT NULL,
    CONSTRAINT fk_tech_staff
        FOREIGN KEY (Tech_ID) REFERENCES LabStaff(Staff_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE Pathologist (
    Pathologist_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    License_No VARCHAR(50) NOT NULL,
    Qualification VARCHAR(100) NOT NULL,
    CONSTRAINT fk_pathologist_staff
        FOREIGN KEY (Pathologist_ID) REFERENCES LabStaff(Staff_ID)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. TEST ORDER & ORDER INCLUDES TEST
-- -----------------------------------------------------------------------------
CREATE TABLE TestOrder (
    Order_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Order_Date DATE NOT NULL,
    Patient_ID VARCHAR(20) NOT NULL,
    Doctor_ID VARCHAR(20) NULL,
    Status ENUM('Pending', 'Processing', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    Total_Price INT UNSIGNED NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_patient
        FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_order_doctor
        FOREIGN KEY (Doctor_ID) REFERENCES Doctor(Doctor_ID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE OrderIncludesTest (
    Order_ID VARCHAR(20) NOT NULL,
    Test_ID VARCHAR(20) NOT NULL,
    PRIMARY KEY (Order_ID, Test_ID),
    CONSTRAINT fk_oit_order
        FOREIGN KEY (Order_ID) REFERENCES TestOrder(Order_ID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_oit_test
        FOREIGN KEY (Test_ID) REFERENCES Test(Test_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. SAMPLE (SPECIMEN ACCESSIONING)
-- -----------------------------------------------------------------------------
CREATE TABLE Sample (
    Order_ID VARCHAR(20) NOT NULL,
    Sample_No VARCHAR(20) NOT NULL,
    Patient_ID VARCHAR(20) NOT NULL,
    Sample_Type ENUM('Whole Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Tissue', 'Swab') NOT NULL,
    Collection_DateTime DATETIME NOT NULL,
    Lab_ID VARCHAR(20) NOT NULL,
    Tech_ID VARCHAR(20) NOT NULL,
    Status ENUM('Collected', 'In Transit', 'Received', 'Rejected') NOT NULL DEFAULT 'Collected',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Order_ID, Sample_No),
    CONSTRAINT fk_sample_order
        FOREIGN KEY (Order_ID) REFERENCES TestOrder(Order_ID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sample_patient
        FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sample_lab
        FOREIGN KEY (Lab_ID) REFERENCES Laboratory(Lab_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_sample_tech
        FOREIGN KEY (Tech_ID) REFERENCES LabStaff(Staff_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. REPORT & HAS_RESULT
-- -----------------------------------------------------------------------------
CREATE TABLE Report (
    Report_ID VARCHAR(20) NOT NULL PRIMARY KEY,
    Order_ID VARCHAR(20) NOT NULL,
    Report_Date DATETIME NULL,
    Patient_ID VARCHAR(20) NOT NULL,
    Doctor_ID VARCHAR(20) NULL,
    Pathologist_ID VARCHAR(20) NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_order
        FOREIGN KEY (Order_ID) REFERENCES TestOrder(Order_ID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_report_patient
        FOREIGN KEY (Patient_ID) REFERENCES Patient(Patient_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_report_doctor
        FOREIGN KEY (Doctor_ID) REFERENCES Doctor(Doctor_ID)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_report_pathologist
        FOREIGN KEY (Pathologist_ID) REFERENCES LabStaff(Staff_ID)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE HasResult (
    Report_ID VARCHAR(20) NOT NULL,
    Test_ID VARCHAR(20) NOT NULL,
    Observed_Value VARCHAR(50) NOT NULL,
    Unit VARCHAR(20) NULL,
    Remark ENUM('Normal', 'Elevated', 'Critical') NOT NULL,
    PRIMARY KEY (Report_ID, Test_ID),
    CONSTRAINT fk_hasresult_report
        FOREIGN KEY (Report_ID) REFERENCES Report(Report_ID)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_hasresult_test
        FOREIGN KEY (Test_ID) REFERENCES Test(Test_ID)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- INDEXES FOR FREQUENT LOOKUPS & PERFORMANCE
-- -----------------------------------------------------------------------------
CREATE INDEX idx_patient_name ON Patient(Last_Name, First_Name);
CREATE INDEX idx_testorder_status ON TestOrder(Status);
CREATE INDEX idx_testorder_patient ON TestOrder(Patient_ID);
CREATE INDEX idx_sample_order ON Sample(Order_ID);
CREATE INDEX idx_report_order ON Report(Order_ID);

