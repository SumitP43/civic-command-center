-- ============================================================
-- AI Civic Command Center — Seed Data
-- ============================================================
-- Realistic demo data for Noida / Greater Noida area
-- ============================================================

-- ============================================================
-- DEPARTMENTS
-- ============================================================

INSERT INTO departments (id, name, code, description, contact_email, contact_phone) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Public Works Department', 'PWD', 'Responsible for construction and maintenance of public infrastructure including roads, bridges, and buildings.', 'pwd@noida.gov.in', '+91-120-2550001'),
  ('d1000000-0000-0000-0000-000000000002', 'Electricity Department', 'ELECTRICITY', 'Manages electrical infrastructure, power supply, and streetlight maintenance.', 'electricity@noida.gov.in', '+91-120-2550002'),
  ('d1000000-0000-0000-0000-000000000003', 'Water Department', 'WATER', 'Responsible for water supply, pipeline maintenance, and water quality management.', 'water@noida.gov.in', '+91-120-2550003'),
  ('d1000000-0000-0000-0000-000000000004', 'Sanitation Department', 'SANITATION', 'Manages waste collection, street cleaning, and sanitation facilities.', 'sanitation@noida.gov.in', '+91-120-2550004'),
  ('d1000000-0000-0000-0000-000000000005', 'Roads Department', 'ROADS', 'Handles road construction, repair, traffic signals, and road markings.', 'roads@noida.gov.in', '+91-120-2550005'),
  ('d1000000-0000-0000-0000-000000000006', 'Traffic Department', 'TRAFFIC', 'Manages traffic flow, signals, parking, and traffic rule enforcement.', 'traffic@noida.gov.in', '+91-120-2550006'),
  ('d1000000-0000-0000-0000-000000000007', 'Street Lighting Department', 'STREETLIGHT', 'Responsible for installation and maintenance of street lights and public area lighting.', 'streetlight@noida.gov.in', '+91-120-2550007'),
  ('d1000000-0000-0000-0000-000000000008', 'Public Safety Department', 'SAFETY', 'Ensures public safety, manages emergency response, and handles security concerns.', 'safety@noida.gov.in', '+91-120-2550008');

-- ============================================================
-- COMPLAINT CATEGORIES
-- ============================================================

INSERT INTO complaint_categories (id, name, code, department_id, description, icon) VALUES
  -- PWD
  ('c1000000-0000-0000-0000-000000000001', 'Pothole', 'POTHOLE', 'd1000000-0000-0000-0000-000000000001', 'Road potholes and surface damage', 'circle-dot'),
  ('c1000000-0000-0000-0000-000000000002', 'Building Damage', 'BUILDING_DAMAGE', 'd1000000-0000-0000-0000-000000000001', 'Damage to public buildings and structures', 'building'),
  ('c1000000-0000-0000-0000-000000000003', 'Bridge Damage', 'BRIDGE_DAMAGE', 'd1000000-0000-0000-0000-000000000001', 'Structural issues with bridges and flyovers', 'construction'),
  -- Electricity
  ('c1000000-0000-0000-0000-000000000004', 'Power Outage', 'POWER_OUTAGE', 'd1000000-0000-0000-0000-000000000002', 'Complete or partial power failure', 'zap-off'),
  ('c1000000-0000-0000-0000-000000000005', 'Exposed Wiring', 'EXPOSED_WIRING', 'd1000000-0000-0000-0000-000000000002', 'Dangerous exposed electrical wires', 'zap'),
  ('c1000000-0000-0000-0000-000000000006', 'Transformer Issue', 'TRANSFORMER', 'd1000000-0000-0000-0000-000000000002', 'Transformer malfunction or damage', 'bolt'),
  -- Water
  ('c1000000-0000-0000-0000-000000000007', 'Water Leakage', 'WATER_LEAK', 'd1000000-0000-0000-0000-000000000003', 'Water pipeline leaks and bursts', 'droplets'),
  ('c1000000-0000-0000-0000-000000000008', 'No Water Supply', 'NO_WATER', 'd1000000-0000-0000-0000-000000000003', 'Complete absence of water supply', 'droplet'),
  ('c1000000-0000-0000-0000-000000000009', 'Contaminated Water', 'CONTAMINATED_WATER', 'd1000000-0000-0000-0000-000000000003', 'Water quality issues and contamination', 'flask-round'),
  -- Sanitation
  ('c1000000-0000-0000-0000-000000000010', 'Garbage Dump', 'GARBAGE', 'd1000000-0000-0000-0000-000000000004', 'Unauthorized garbage dumping', 'trash-2'),
  ('c1000000-0000-0000-0000-000000000011', 'Clogged Drain', 'CLOGGED_DRAIN', 'd1000000-0000-0000-0000-000000000004', 'Blocked drains and sewage overflow', 'waves'),
  ('c1000000-0000-0000-0000-000000000012', 'Open Defecation', 'OPEN_DEFECATION', 'd1000000-0000-0000-0000-000000000004', 'Open defecation spots', 'alert-triangle'),
  -- Roads
  ('c1000000-0000-0000-0000-000000000013', 'Road Damage', 'ROAD_DAMAGE', 'd1000000-0000-0000-0000-000000000005', 'Damaged or broken roads', 'road'),
  ('c1000000-0000-0000-0000-000000000014', 'Missing Road Sign', 'MISSING_SIGN', 'd1000000-0000-0000-0000-000000000005', 'Missing or damaged road signs', 'signpost'),
  ('c1000000-0000-0000-0000-000000000015', 'Road Encroachment', 'ENCROACHMENT', 'd1000000-0000-0000-0000-000000000005', 'Illegal encroachment on roads', 'shield-alert'),
  -- Traffic
  ('c1000000-0000-0000-0000-000000000016', 'Broken Traffic Signal', 'BROKEN_SIGNAL', 'd1000000-0000-0000-0000-000000000006', 'Malfunctioning or broken traffic lights', 'traffic-cone'),
  ('c1000000-0000-0000-0000-000000000017', 'Illegal Parking', 'ILLEGAL_PARKING', 'd1000000-0000-0000-0000-000000000006', 'Vehicles parked illegally causing obstruction', 'car'),
  ('c1000000-0000-0000-0000-000000000018', 'Traffic Congestion', 'CONGESTION', 'd1000000-0000-0000-0000-000000000006', 'Chronic traffic jams and congestion points', 'truck'),
  -- Street Lighting
  ('c1000000-0000-0000-0000-000000000019', 'Broken Street Light', 'BROKEN_LIGHT', 'd1000000-0000-0000-0000-000000000007', 'Non-functional street lights', 'lightbulb-off'),
  ('c1000000-0000-0000-0000-000000000020', 'Dark Area', 'DARK_AREA', 'd1000000-0000-0000-0000-000000000007', 'Areas lacking adequate lighting', 'moon'),
  -- Public Safety
  ('c1000000-0000-0000-0000-000000000021', 'Stray Animals', 'STRAY_ANIMALS', 'd1000000-0000-0000-0000-000000000008', 'Dangerous stray animal sightings', 'bug'),
  ('c1000000-0000-0000-0000-000000000022', 'Unsafe Structure', 'UNSAFE_STRUCTURE', 'd1000000-0000-0000-0000-000000000008', 'Structurally unsafe buildings or walls', 'shield-alert'),
  ('c1000000-0000-0000-0000-000000000023', 'Fallen Tree', 'FALLEN_TREE', 'd1000000-0000-0000-0000-000000000008', 'Fallen or dangerous trees blocking roads', 'tree-pine');

-- ============================================================
-- NOTE: Users are created through Supabase Auth.
-- Use the app's register flow or Supabase dashboard to create:
--
-- Demo Citizens:
--   citizen1@demo.com (Rahul Sharma)
--   citizen2@demo.com (Priya Singh)
--   citizen3@demo.com (Amit Kumar)
--   citizen4@demo.com (Neha Gupta)
--   citizen5@demo.com (Ravi Patel)
--
-- Demo Officers:
--   officer1@demo.com (Vijay Chauhan) - PWD
--   officer2@demo.com (Suresh Yadav) - Electricity
--   officer3@demo.com (Deepak Verma) - Water
--   officer4@demo.com (Manoj Tiwari) - Sanitation
--   officer5@demo.com (Arun Singh) - Roads
--   officer6@demo.com (Rajesh Kumar) - Traffic
--   officer7@demo.com (Sanjay Mishra) - Street Lighting
--   officer8@demo.com (Pankaj Jha) - Public Safety
--
-- Demo Department Admins:
--   deptadmin1@demo.com (Ashok Mishra) - PWD Admin
--   deptadmin2@demo.com (Sunita Devi) - Water Admin
--
-- Demo Super Admin:
--   superadmin@demo.com (Commissioner Rajendra Prasad)
--
-- After creating these users via Auth, run the SQL below to
-- set up their profiles, officer records, and sample data.
-- ============================================================

-- ============================================================
-- SAMPLE COMPLAINTS (insert after users are created)
-- These use placeholder UUIDs - replace citizen_id with real user IDs
-- ============================================================

-- For demo purposes, this creates a function to generate sample data
-- Call it after creating demo users: SELECT generate_demo_complaints();

CREATE OR REPLACE FUNCTION generate_demo_complaints()
RETURNS void AS $$
DECLARE
  v_citizen_ids UUID[];
  v_citizen_id UUID;
  v_dept_id UUID;
  v_cat_id UUID;
  v_complaint_id UUID;
  v_locations JSONB[];
  v_loc JSONB;
  v_titles TEXT[];
  v_descriptions TEXT[];
  v_statuses complaint_status[];
  v_severities severity_level[];
  i INTEGER;
BEGIN
  -- Get citizen user IDs
  SELECT ARRAY_AGG(id) INTO v_citizen_ids
  FROM profiles WHERE role = 'citizen' LIMIT 10;

  IF v_citizen_ids IS NULL OR array_length(v_citizen_ids, 1) IS NULL THEN
    RAISE NOTICE 'No citizen users found. Please create demo users first.';
    RETURN;
  END IF;

  -- Noida sector locations [lng, lat, address]
  v_locations := ARRAY[
    '{"lng": 77.3910, "lat": 28.5355, "address": "Sector 62, Noida, UP 201309", "landmark": "Near Fortis Hospital"}'::JSONB,
    '{"lng": 77.3587, "lat": 28.6139, "address": "Sector 18, Noida, UP 201301", "landmark": "Near Atta Market"}'::JSONB,
    '{"lng": 77.3273, "lat": 28.5706, "address": "Sector 44, Noida, UP 201303", "landmark": "Near City Centre Mall"}'::JSONB,
    '{"lng": 77.4538, "lat": 28.4744, "address": "Greater Noida West, UP 201306", "landmark": "Near Gaur City"}'::JSONB,
    '{"lng": 77.3721, "lat": 28.5850, "address": "Sector 27, Noida, UP 201301", "landmark": "Near Botanical Garden Metro"}'::JSONB,
    '{"lng": 77.3163, "lat": 28.5922, "address": "Sector 15, Noida, UP 201301", "landmark": "Near Film City"}'::JSONB,
    '{"lng": 77.3498, "lat": 28.5280, "address": "Sector 76, Noida, UP 201304", "landmark": "Near Amity University"}'::JSONB,
    '{"lng": 77.4208, "lat": 28.4989, "address": "Sector 137, Noida, UP 201305", "landmark": "Near Expressway"}'::JSONB,
    '{"lng": 77.3070, "lat": 28.6304, "address": "Sector 2, Noida, UP 201301", "landmark": "Near District Court"}'::JSONB,
    '{"lng": 77.3621, "lat": 28.5500, "address": "Sector 50, Noida, UP 201301", "landmark": "Near Noida Stadium"}'::JSONB
  ];

  v_titles := ARRAY[
    'Large pothole causing accidents on main road',
    'Power outage for 3 days in residential colony',
    'Severe water leakage from main pipeline',
    'Garbage dump near children''s park',
    'Broken traffic signal at major intersection',
    'Street lights not working in entire sector',
    'Clogged drain causing waterlogging',
    'Stray dog menace near school',
    'Road cave-in near metro station',
    'Exposed electrical wires on footpath',
    'No water supply for 48 hours',
    'Illegal encroachment blocking pedestrian path',
    'Damaged road divider causing confusion',
    'Fallen tree blocking road after storm',
    'Contaminated water supply - yellow colored',
    'Broken street light pole leaning dangerously',
    'Overflowing sewage on residential street',
    'Missing road signs near school zone',
    'Transformer sparking and making noise',
    'Dark alley becoming crime spot',
    'Mere area mein road ke beech bahut bada pothole hai aur kal bike accident hua',
    'Paani mein bahut badbu aa rahi hai aur rang bhi peela hai',
    'Bijli 4 din se nahi aa rahi, bahut pareshani ho rahi hai',
    'Kachra ghar ke saamne bahut zyada ikatha ho gaya hai, safai nahi ho rahi',
    'Traffic signal kharab hai aur roz accident hota hai yahan'
  ];

  v_descriptions := ARRAY[
    'There is a massive pothole approximately 3 feet wide and 1 foot deep on the main road near the sector market. Multiple two-wheeler accidents have been reported in the last week. The pothole fills with water during rain making it invisible to drivers.',
    'Our entire colony has been without electricity for the past 3 days. Over 200 families are affected. The local electricity office is not responding to our complaints. Children cannot study and elderly people are suffering in the heat.',
    'A major water pipeline has burst near the park. Water is gushing out continuously and flooding the road. This has been going on for 2 days. The water is getting wasted and the road is becoming dangerous for vehicles.',
    'A large garbage dump has appeared near the children''s park in our sector. It smells terrible and attracts stray dogs and pigs. Children cannot play in the park anymore. The municipal workers have not come for collection in 10 days.',
    'The traffic signal at the major intersection near the school has been non-functional for a week. There have been 3 minor accidents already. School children have to cross this intersection daily and it is extremely dangerous.',
    'All street lights in our sector stopped working 5 days ago. The entire sector is in darkness after 6 PM. Women and elderly residents feel unsafe walking. There have been 2 chain snatching incidents in the dark.',
    'The main drain in our colony is completely clogged. Dirty water is overflowing onto the road and entering houses. The smell is unbearable. Several children have fallen sick due to the unhygienic conditions.',
    'A pack of about 15-20 stray dogs has been terrorizing residents near the government school. Two children were bitten last week. Parents are afraid to send their children to school.',
    'A portion of the road near the metro station has caved in creating a large sinkhole. It is approximately 5 feet in diameter. Vehicles are having to take a dangerous detour. Immediate repair is needed before someone falls in.',
    'Exposed high-voltage electrical wires are hanging from a broken pole on the main footpath. It is extremely dangerous especially during rain. Pedestrians including school children use this footpath daily.',
    'We have not received any water supply for the past 48 hours. The entire sector comprising over 500 households is affected. People are forced to buy expensive tanker water. Senior citizens and families with infants are most affected.',
    'Vendors have illegally encroached the entire pedestrian footpath. Walking on the road is dangerous. Several complaints to local authorities have gone unanswered.',
    'The road divider on the highway is broken at multiple points. Vehicles are making illegal U-turns causing head-on collision risks.',
    'A large tree fell during last night''s storm blocking the entire road. No vehicle can pass. Emergency services cannot reach the other side. Branches are also resting on power lines.',
    'The water supply has turned yellow and has a foul smell. Multiple residents have reported stomach problems. Children are getting skin rashes after bathing.',
    'A street light pole has been leaning at a 45-degree angle for weeks. It could fall on passing vehicles or pedestrians at any time.',
    'Raw sewage is flowing on our residential street. It has been 3 days. Children cannot walk to school. The stench is making people sick.',
    'There are no speed limit or school zone signs near the primary school. Vehicles speed through. A child was nearly hit yesterday.',
    'The transformer in our area is making loud crackling noises and sparking. We are worried it will explode or cause a fire. Children play near it.',
    'A narrow alley connecting two main roads has no lighting. Multiple mugging incidents have been reported. Women avoid using it after dark.',
    'Mere ghar ke saamne sadak mein bahut bada gadha hai. Kal ek bike wale ka accident ho gaya. Raat ko toh dikhta bhi nahi. Bahut logon ne complaint ki hai par koi nahi sun raha.',
    'Nal se jo paani aa raha hai usmein bahut badbu hai aur rang peela hai. Bachche beemar ho rahe hain. 3 din se yehi haal hai. Peene layak paani nahi hai.',
    'Humari colony mein 4 din se bijli nahi hai. Bahut garmi hai aur bachche aur boodhe log bahut pareshan hain. Complaint karne par bhi koi response nahi mila.',
    'Humare mohalle mein kachre ka dhaar lag gaya hai. 2 hafte se safai nahi hui. Machhar bahut ho gaye hain aur logon ko dengue ho raha hai.',
    'Sector 18 ke main crossing par traffic signal 1 hafte se kharab hai. Roz chhote-mote accident ho rahe hain. School ke bachche bhi isi raaste se aate hain.'
  ];

  v_statuses := ARRAY['SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'CITIZEN_VERIFICATION'];
  v_severities := ARRAY['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  FOR i IN 1..25 LOOP
    v_citizen_id := v_citizen_ids[1 + (i % array_length(v_citizen_ids, 1))];
    v_loc := v_locations[1 + (i % array_length(v_locations, 1))];

    -- Pick category and department
    SELECT cc.id, cc.department_id INTO v_cat_id, v_dept_id
    FROM complaint_categories cc
    ORDER BY RANDOM()
    LIMIT 1;

    INSERT INTO complaints (
      citizen_id, category_id, department_id,
      title, description,
      location, address, landmark,
      status,
      severity,
      priority_score,
      priority_level,
      affected_count,
      created_at
    ) VALUES (
      v_citizen_id,
      v_cat_id,
      v_dept_id,
      v_titles[i],
      v_descriptions[i],
      ST_SetSRID(ST_MakePoint((v_loc->>'lng')::FLOAT, (v_loc->>'lat')::FLOAT), 4326)::GEOGRAPHY,
      v_loc->>'address',
      v_loc->>'landmark',
      v_statuses[1 + (i % array_length(v_statuses, 1))],
      v_severities[1 + (i % array_length(v_severities, 1))],
      20 + (RANDOM() * 80)::INTEGER,
      priority_level_from_score(20 + (RANDOM() * 80)::INTEGER),
      1 + (RANDOM() * 50)::INTEGER,
      NOW() - (RANDOM() * 30 || ' days')::INTERVAL
    )
    RETURNING id INTO v_complaint_id;

    -- Add AI analysis for each complaint
    INSERT INTO ai_analysis (complaint_id, category, subcategory, severity, priority_score, department_recommendation, summary, risk_factors, confidence_score, language_detected)
    SELECT
      v_complaint_id,
      cc.name,
      cc.code,
      (ARRAY['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])[1 + (i % 4)]::severity_level,
      20 + (RANDOM() * 80)::INTEGER,
      d.code,
      'AI Summary: ' || v_titles[i],
      ARRAY['Public Safety', 'Infrastructure Risk', 'Health Hazard'],
      0.75 + RANDOM() * 0.25,
      CASE WHEN i > 20 THEN 'hi' ELSE 'en' END
    FROM complaint_categories cc
    JOIN departments d ON d.id = cc.department_id
    WHERE cc.id = v_cat_id;

    -- Add initial complaint update
    INSERT INTO complaint_updates (complaint_id, new_status, notes, updated_by)
    VALUES (v_complaint_id, 'SUBMITTED', 'Complaint submitted by citizen', v_citizen_id);

  END LOOP;

  RAISE NOTICE 'Created 25 demo complaints with AI analysis';
END;
$$ LANGUAGE plpgsql;
