-- Insert Test User (password: test)
INSERT INTO users (username, email, password_hash, role, created_at)
VALUES ('test', 'test@test.com', '$2b$12$I/XowN9A1rsJ5rfOyacgCOETnFmNd3UnbaodzYs.VElC3lOYio8b2', 'admin', NOW())
ON CONFLICT (username) DO NOTHING;

-- Insert Test Person
INSERT INTO persons (id, name, surname, position, department, status, location, level)
VALUES (1, 'Test', 'User', 'Supervisor', 'Operations', 'Active', 'Zone A', 1)
ON CONFLICT (id) DO NOTHING;

-- Link User and Person
INSERT INTO user_person (user_id, person_id)
VALUES (
    (SELECT id FROM users WHERE username='test'),
    1
)
ON CONFLICT (user_id) DO NOTHING;

-- Insert Gallery (Main Gallery) with Correct Location ID for Map
INSERT INTO galleries (id, name, location, level, capacity, oxygen, co2, other_gas, worker_count, hotspot_count)
VALUES (1, 'Main Gallery', 'zone-8', 1, 50, 20.9, 400.0, 0.0, 0, 2)
ON CONFLICT (id) DO UPDATE SET location = 'zone-8';

-- Insert Hotspots (Matches Simulator Scenario 6 logic if we map IDs)
INSERT INTO hotspots (id, location, level, connection_status)
VALUES 
(1, 'Zone 8 - Entrance', 1, 'Online'),
(2, 'Zone 8 - Exit', 1, 'Online')
ON CONFLICT (id) DO NOTHING;

-- Link Hotspots to Gallery
INSERT INTO hotspot_gallery (hotspot_id, gallery_id, assigned_at)
VALUES 
(1, 1, NOW()),
(2, 1, NOW())
ON CONFLICT DO NOTHING;

-- Insert Devices (Hotspots) - Needed for Device Service
INSERT INTO devices (id, label, type, barcode, is_on, owned)
VALUES 
(3, 'Hotspot 1', 'Hotspot', 'TEST-HOTSPOT-001', true, 'Main Gallery'),
(4, 'Hotspot 2', 'Hotspot', 'TEST-HOTSPOT-002', true, 'Main Gallery')
ON CONFLICT (id) DO UPDATE SET type = 'Hotspot', owned = 'Main Gallery';

-- Insert Devices (Miners/Helmets) - Matching MACs from Simulator
INSERT INTO devices (id, label, type, barcode, is_on, owned)
VALUES 
(1, 'Miner Alpha', 'Helmet', 'ff163677', true, 'Test User'),
(2, 'Miner Beta', 'Helmet', 'ff163678', true, 'Test User')
ON CONFLICT (id) DO UPDATE SET type = 'Helmet', owned = 'Test User';

-- Link Hotspot Devices to Hotspot Logic
INSERT INTO device_hotspot (device_id, hotspot_id, connected_at)
VALUES 
(3, 1, NOW()),
(4, 2, NOW())
ON CONFLICT DO NOTHING;

-- Link Devices to Persons (Optional but good for visualization)
-- Assuming we have person_device table (Device Service)
INSERT INTO person_device (person_id, device_id, assigned_at)
VALUES (1, 1, NOW())
ON CONFLICT (person_id, device_id) DO NOTHING;

-- Reset sequences to avoid unique constraint violations on future inserts
-- Use DO block to handle potential missing sequences gracefully
DO $$
BEGIN
    PERFORM setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) + 1 FROM users), 1), false) WHERE EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'users_id_seq');
    PERFORM setval(pg_get_serial_sequence('persons', 'id'), COALESCE((SELECT MAX(id) + 1 FROM persons), 1), false) WHERE EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'persons_id_seq');
    PERFORM setval(pg_get_serial_sequence('galleries', 'id'), COALESCE((SELECT MAX(id) + 1 FROM galleries), 1), false) WHERE EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'galleries_id_seq');
    PERFORM setval(pg_get_serial_sequence('hotspots', 'id'), COALESCE((SELECT MAX(id) + 1 FROM hotspots), 1), false) WHERE EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'hotspots_id_seq');
    PERFORM setval(pg_get_serial_sequence('devices', 'id'), COALESCE((SELECT MAX(id) + 1 FROM devices), 1), false) WHERE EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'devices_id_seq');
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if sequences don't exist or names don't match (e.g. if tables created differently)
    RAISE NOTICE 'Could not reset some sequences: %', SQLERRM;
END $$;
