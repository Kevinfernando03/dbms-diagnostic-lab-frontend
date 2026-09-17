-- =============================================================================
-- MERIDIAN DIAGNOSTICS LIS/LIMS - SEED DATA FOR DEMO & TESTING
-- =============================================================================

-- 1. Patients
INSERT INTO Patient (Patient_ID, First_Name, Last_Name, DOB, Gender) VALUES
('P0001', 'Kavya', 'Nair', '1991-07-22', 'F'),
('P0002', 'Arjun', 'Sharma', '1984-11-14', 'M'),
('P0003', 'Meera', 'Reddy', '1998-03-09', 'F'),
('P0004', 'Rohan', 'Iyer', '1976-05-30', 'M'),
('P0005', 'Divya', 'Menon', '2001-09-18', 'F'),
('P0006', 'Sandeep', 'Patel', '1968-12-04', 'M');

-- 2. Patient Contacts
INSERT INTO Patient_Contact (Patient_ID, Contact_No) VALUES
('P0001', '9876543210'),
('P0001', '9876543211'),
('P0002', '9845012345'),
('P0003', '9731098765'),
('P0004', '9900112233'),
('P0005', '9880554433'),
('P0006', '9448011223');

-- 3. Doctors
INSERT INTO Doctor (Doctor_ID, Doctor_Name, Specialization) VALUES
('D001', 'Dr. Ramesh Rao', 'General Medicine'),
('D002', 'Dr. Anita Desai', 'Endocrinology'),
('D003', 'Dr. Sunita Kulkarni', 'Cardiology'),
('D004', 'Dr. Vijay Kumar', 'Nephrology');

-- 4. Tests
INSERT INTO Test (Test_ID, Test_Name, Test_Category, Price, Unit) VALUES
('T001', 'Complete Blood Count (CBC)', 'Pathology', 350, NULL),
('T002', 'Fasting Blood Sugar (FBS)', 'Pathology', 150, 'mg/dL'),
('T003', 'HbA1c Glycated Hemoglobin', 'Pathology', 550, '%'),
('T004', 'Serum Creatinine', 'Pathology', 250, 'mg/dL'),
('T005', 'Lipid Profile', 'Pathology', 650, 'mg/dL'),
('T006', 'Chest X-Ray PA View', 'Radiology', 450, NULL),
('T007', 'Ultrasound Abdomen & Pelvis', 'Radiology', 1200, NULL),
('T008', 'MRI Brain Screening', 'Radiology', 4500, NULL);

INSERT INTO PathologyTest (Test_ID, Specimen_Type) VALUES
('T001', 'Blood'),
('T002', 'Serum'),
('T003', 'Blood'),
('T004', 'Serum'),
('T005', 'Serum');

INSERT INTO RadiologyTest (Test_ID, Imaging_Modality) VALUES
('T006', 'X-Ray'),
('T007', 'Ultrasound'),
('T008', 'MRI');

-- 5. Laboratories
INSERT INTO Laboratory (Lab_ID, Lab_Name, Location, Contact_No) VALUES
('LAB01', 'Central Processing Laboratory', 'Residency Road, Bengaluru', '9845011111'),
('LAB02', 'Indiranagar Diagnostic Hub', '100ft Road, Indiranagar', '9845022222'),
('LAB03', 'Jayanagar Collection Facility', '4th Block, Jayanagar', '9845033333');

-- 6. Lab Staff
INSERT INTO LabStaff (Staff_ID, Staff_Name, Shift, Staff_Role) VALUES
('ST001', 'Rahul Menon', 'Morning', 'Technician'),
('ST002', 'Pooja Hegde', 'Evening', 'Technician'),
('ST003', 'Imran Khan', 'Night', 'Technician'),
('ST009', 'Dr. Vikram Iyer', 'Morning', 'Pathologist'),
('ST010', 'Dr. Ananya Sen', 'General', 'Pathologist');

INSERT INTO LabTechnician (Tech_ID, Certification) VALUES
('ST001', 'BSc MLT, Phlebotomy Level II'),
('ST002', 'DMLT Senior Certified'),
('ST003', 'MSc MLT Clinical Pathology');

INSERT INTO Pathologist (Pathologist_ID, License_No, Qualification) VALUES
('ST009', 'KMC-54210', 'MD (Pathology)'),
('ST010', 'KMC-68421', 'MBBS, MD, DCP');

-- 7. Orders
INSERT INTO TestOrder (Order_ID, Order_Date, Patient_ID, Doctor_ID, Status, Total_Price) VALUES
('ORD-0001', '2026-09-10', 'P0001', 'D001', 'Completed', 500),
('ORD-0002', '2026-09-12', 'P0002', 'D002', 'Processing', 800),
('ORD-0003', '2026-09-15', 'P0003', 'D003', 'Pending', 650),
('ORD-0004', '2026-09-16', 'P0004', 'D001', 'Cancelled', 350);

INSERT INTO OrderIncludesTest (Order_ID, Test_ID) VALUES
('ORD-0001', 'T001'),
('ORD-0001', 'T002'),
('ORD-0002', 'T003'),
('ORD-0002', 'T004'),
('ORD-0003', 'T005'),
('ORD-0004', 'T001');

-- 8. Samples
INSERT INTO Sample (Order_ID, Sample_No, Patient_ID, Sample_Type, Collection_DateTime, Lab_ID, Tech_ID, Status) VALUES
('ORD-0001', 'S1', 'P0001', 'Whole Blood', '2026-09-10 08:30:00', 'LAB01', 'ST001', 'Received'),
('ORD-0001', 'S2', 'P0001', 'Serum', '2026-09-10 08:35:00', 'LAB01', 'ST001', 'Received'),
('ORD-0002', 'S1', 'P0002', 'Whole Blood', '2026-09-12 09:15:00', 'LAB02', 'ST002', 'Collected');

-- 9. Reports & Results
INSERT INTO Report (Report_ID, Order_ID, Report_Date, Patient_ID, Doctor_ID, Pathologist_ID) VALUES
('R0001', 'ORD-0001', '2026-09-10 16:45:00', 'P0001', 'D001', 'ST009'),
('R0002', 'ORD-0002', NULL, 'P0002', 'D002', NULL);

INSERT INTO HasResult (Report_ID, Test_ID, Observed_Value, Unit, Remark) VALUES
('R0001', 'T001', '13.8', 'g/dL', 'Normal'),
('R0001', 'T002', '142', 'mg/dL', 'Elevated');

