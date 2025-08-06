-- SOBI Database Initialization Script for PostgreSQL 15.4
-- Generated from ERD diagram

-- Drop tables if they exist (in reverse dependency order)
-- DROP TABLE IF EXISTS favorite CASCADE;
-- DROP TABLE IF EXISTS receipt CASCADE;
-- DROP TABLE IF EXISTS epc_map CASCADE;
-- DROP TABLE IF EXISTS basket CASCADE;
-- DROP TABLE IF EXISTS product CASCADE;
-- DROP TABLE IF EXISTS customer CASCADE;

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
    name VARCHAR(255) NOT NULL UNIQUE,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(255) DEFAULT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    discount_rate INTEGER DEFAULT 0,
    sales INTEGER DEFAULT 0,
    tag VARCHAR(255) DEFAULT NULL, -- "#tag1#tag2#tag3" 형식
    location VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    brand VARCHAR(255) DEFAULT NULL
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
    epc_pattern VARCHAR(255) NOT NULL,
    CONSTRAINT fk_epc_map_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- Create favorite table (찜 매핑 테이블)
CREATE TABLE favorite (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    UNIQUE(user_id, product_id),
    CONSTRAINT fk_favorite_customer FOREIGN KEY (user_id) REFERENCES customer(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_product FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);

-- Grant permissions to sobiuser
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sobiuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sobiuser;

-- Insert initial product data from CSV file
-- CSV 파일은 /docker-entrypoint-initdb.d/products.csv 위치에 있어야 함
COPY product(name, price, stock, category, image_url, discount_rate, sales, tag, location, description, brand)
FROM '/docker-entrypoint-initdb.d/products.csv'
DELIMITER ','
CSV HEADER;
