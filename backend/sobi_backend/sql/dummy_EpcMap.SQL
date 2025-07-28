-- EpcMap 더미데이터 생성 SQL (수정됨)
-- 각 상품별로 1개의 EPC 패턴만 생성 (상품 타입 식별용)
-- EPC Pattern은 4글자로 제한

-- ID 1: [12brix 당도선별] 고당도 프리미엄 복숭아 4kg 8-12과
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(1, 'PCH4');

-- ID 2: [12brix 당도선별] 고당도 프리미엄 복숭아 2kg 4-6과
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(2, 'PCH2');

-- ID 3: 미국산 냉동 블루베리 1.5kg 봉
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(3, 'BLUE');

-- ID 4: 성주 참외 3~8입 봉
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(4, 'MLON');

-- ID 5: [정용규님 생산] 못생겨도 맛있는 부여 못난이 수박 7kg이상
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(5, 'WTMN');

-- ID 6: [12brix 당도선별] 고당도 프리미엄 복숭아 2kg 4-6과 (다른 배치)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(6, 'PC2B');

-- ID 7: 달콤한 백도 복숭아 4kg 16과내
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(7, 'WPCH');

-- ID 8: 사과 알뜰 중소과 4kg(13~19과)
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(8, 'APPL');

-- ID 9: 맑은청 찰토마토 1.2kg 팩
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(9, 'TMAT');

-- ID 10: 맑은청 강원 깜빠리 토마토 700g 팩
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(10, 'CTMT');

-- ID 11: 페루산 바로 먹는 후숙 아보카도 600g 팩
INSERT INTO epc_map (product_id, epc_pattern) VALUES 
(11, 'AVCD');

-- 상품별 재고 수량은 별도로 관리 (Product.stock 필드)
-- EPC Pattern은 상품 타입 식별용이므로 재고와 무관

-- 확인 쿼리 (실행 후 결과 확인용)
-- SELECT p.id, p.name, p.stock, e.epc_pattern 
-- FROM product p 
-- LEFT JOIN epc_map e ON p.id = e.product_id 
-- WHERE p.id <= 11 
-- ORDER BY p.id;