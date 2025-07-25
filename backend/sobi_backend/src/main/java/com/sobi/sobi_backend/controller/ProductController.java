package com.sobi.sobi_backend.controller;

import com.sobi.sobi_backend.entity.Product;
import com.sobi.sobi_backend.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/products") // /api/products로 시작하는 모든 요청 처리
public class ProductController {

    @Autowired
    private ProductService productService; // 상품 정보 처리 서비스

    // 모든 상품 조회 (GET /api/products)
    @GetMapping
    public ResponseEntity<?> getAllProducts() {
        try {
            List<Product> products = productService.getAllProducts();

            Map<String, Object> response = new HashMap<>();
            response.put("message", "상품 목록 조회 성공");
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "상품 목록 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 상품 상세 조회 (GET /api/products/{id})
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable Integer id) {
        try {
            Optional<Product> productOpt = productService.getProductById(id);

            if (productOpt.isPresent()) {
                Product product = productOpt.get();

                Map<String, Object> response = new HashMap<>();
                response.put("message", "상품 조회 성공");
                response.put("product", product);

                return ResponseEntity.ok(response); // 200 OK
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "존재하지 않는 상품입니다: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error); // 404 Not Found
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "상품 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 상품 검색 (GET /api/products/search?keyword=검색어)
    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(@RequestParam String keyword) {
        try {
            // 검색어가 비어있는지 확인
            if (keyword == null || keyword.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "검색어를 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            List<Product> products = productService.searchProducts(keyword.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "상품 검색 완료");
            response.put("keyword", keyword.trim());
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "상품 검색 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 카테고리별 상품 조회 (GET /api/products/category/{category})
    @GetMapping("/category/{category}")
    public ResponseEntity<?> getProductsByCategory(@PathVariable String category) {
        try {
            // 카테고리가 비어있는지 확인
            if (category == null || category.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "카테고리를 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            List<Product> products = productService.getProductsByCategory(category.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "카테고리별 상품 조회 완료");
            response.put("category", category.trim());
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "카테고리별 상품 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }

    // 브랜드별 상품 조회 (GET /api/products/brand/{brand})
    @GetMapping("/brand/{brand}")
    public ResponseEntity<?> getProductsByBrand(@PathVariable String brand) {
        try {
            // 브랜드가 비어있는지 확인
            if (brand == null || brand.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "브랜드를 입력해주세요");
                return ResponseEntity.badRequest().body(error); // 400 Bad Request
            }

            List<Product> products = productService.getProductsByBrand(brand.trim());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "브랜드별 상품 조회 완료");
            response.put("brand", brand.trim());
            response.put("count", products.size());
            response.put("products", products);

            return ResponseEntity.ok(response); // 200 OK
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "브랜드별 상품 조회 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error); // 500 Internal Server Error
        }
    }
}