-- EpcMap 더미데이터 생성 SQL
-- 각 상품별로 2-5개의 EPC 패턴 생성 (실제 재고 시뮬레이션)

-- ID 1: [12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과 (3개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(1, 'PEACH4KG001'),
(1, 'PEACH4KG002'),
(1, 'PEACH4KG003');

-- ID 2: [12brix 당도선별] 고당도 프리미엄 복숭아 2kg 4-6과 (4개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(2, 'PEACH2KG001'),
(2, 'PEACH2KG002'),
(2, 'PEACH2KG003'),
(2, 'PEACH2KG004');

-- ID 3: 미국산 냉동 블루베리 1.5kg 봉 (5개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(3, 'BLUEBERRY001'),
(3, 'BLUEBERRY002'),
(3, 'BLUEBERRY003'),
(3, 'BLUEBERRY004'),
(3, 'BLUEBERRY005');

-- ID 4: 성주 참외 3~8입 봉 (2개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(4, 'MELON001'),
(4, 'MELON002');

-- ID 5: [정용규님 생산] 못생겨도 맛있는 부여 못난이 수박 7kg이상 (3개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(5, 'WATERMELON001'),
(5, 'WATERMELON002'),
(5, 'WATERMELON003');

-- ID 6: [12brix 당도선별] 고당도 프리미엄 복숭아 2kg 4-6과 (다른 배치, 4개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(6, 'PEACH2KG101'),
(6, 'PEACH2KG102'),
(6, 'PEACH2KG103'),
(6, 'PEACH2KG104');

-- ID 7: 달콤한 백도 복숭아 4kg 16과내 (3개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(7, 'WHITEPEACH001'),
(7, 'WHITEPEACH002'),
(7, 'WHITEPEACH003');

-- ID 8: 사과 알뜰 중소과 4kg(13~19과) (5개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(8, 'APPLE4KG001'),
(8, 'APPLE4KG002'),
(8, 'APPLE4KG003'),
(8, 'APPLE4KG004'),
(8, 'APPLE4KG005');

-- ID 9: 맑은청 찰토마토 1.2kg 팩 (4개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(9, 'TOMATO001'),
(9, 'TOMATO002'),
(9, 'TOMATO003'),
(9, 'TOMATO004');

-- ID 10: 맑은청 강원 깜빠리 토마토 700g 팩 (3개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(10, 'CTOMATO001'),
(10, 'CTOMATO002'),
(10, 'CTOMATO003');

-- ID 11: 페루산 바로 먹는 후숙 아보카도 600g 팩 (2개)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(11, 'AVOCADO001'),
(11, 'AVOCADO002');

-- 상품별 실제 재고 수량 업데이트 (EPC 개수와 맞춤)
UPDATE product SET stock = 3 WHERE id = 1;  -- 복숭아 4kg
UPDATE product SET stock = 4 WHERE id = 2;  -- 복숭아 2kg
UPDATE product SET stock = 5 WHERE id = 3;  -- 블루베리
UPDATE product SET stock = 2 WHERE id = 4;  -- 참외
UPDATE product SET stock = 3 WHERE id = 5;  -- 수박
UPDATE product SET stock = 4 WHERE id = 6;  -- 복숭아 2kg (다른 배치)
UPDATE product SET stock = 3 WHERE id = 7;  -- 백도 복숭아
UPDATE product SET stock = 5 WHERE id = 8;  -- 사과
UPDATE product SET stock = 4 WHERE id = 9;  -- 찰토마토
UPDATE product SET stock = 3 WHERE id = 10; -- 깜빠리 토마토
UPDATE product SET stock = 2 WHERE id = 11; -- 아보카도

-- 확인 쿼리 (실행 후 결과 확인용)
-- SELECT p.id, p.name, p.stock, COUNT(e.id) as epc_count 
-- FROM product p 
-- LEFT JOIN epc_map e ON p.id = e.product_id 
-- WHERE p.id <= 11 
-- GROUP BY p.id, p.name, p.stock 
-- ORDER BY p.id;