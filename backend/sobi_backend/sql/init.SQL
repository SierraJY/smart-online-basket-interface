-- SOBI Database Initialization Script for PostgreSQL 15.4
-- Generated from ERD diagram

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS receipt CASCADE;
DROP TABLE IF EXISTS epc_map CASCADE;
DROP TABLE IF EXISTS basket CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS customer CASCADE;

-- Create customer table (고객 정보)
CREATE TABLE customer (
                          id SERIAL PRIMARY KEY,
                          user_id VARCHAR(255) NOT NULL,
                          user_passwd VARCHAR(255) NOT NULL,
                          gender INTEGER DEFAULT NULL, -- 0 for man, 1 for female
                          age INTEGER DEFAULT NULL
);

-- Create product table (상품 정보)
CREATE TABLE product (
                         id SERIAL PRIMARY KEY,
                         name VARCHAR(255) NOT NULL,
                         price INTEGER NOT NULL,
                         stock INTEGER NOT NULL
);

-- Create basket table (바구니 매핑)
CREATE TABLE basket (
                        id SERIAL PRIMARY KEY,
                        board_mac VARCHAR(255) NOT NULL,
                        usable BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create receipt table (유저-상품 구매기록)
CREATE TABLE receipt (
                         id SERIAL PRIMARY KEY,
                         user_id INTEGER NOT NULL,
                         product_list JSON NOT NULL,
                         purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         CONSTRAINT fk_receipt_customer FOREIGN KEY (user_id) REFERENCES customer(id) ON DELETE CASCADE
);

-- Create epc_map table (rfid-상품 매핑)
CREATE TABLE epc_map (
                         id SERIAL PRIMARY KEY,
                         product_id INTEGER NOT NULL,
                         epc_pattern VARCHAR(255) NOT NULL, -- 실제 EPC: {epc_pattern}{write_date}
                         CONSTRAINT fk_epc_map_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- Grant permissions to sobiuser
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sobiuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sobiuser;
