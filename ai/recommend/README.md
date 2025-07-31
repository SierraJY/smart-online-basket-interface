# 스마트 바스켓 추천 모델 소개

이 저장소는 **AIoT 스마트 바스켓 프로젝트**에서 사용되는 추천 시스템 모델을 다룹니다. 고객이 장바구니에 상품을 담을 때, **Jetson Nano에 탑재된 모델**이 실시간으로 관련 상품을 추천해 줍니다.

총 두 가지 모델이 탑재되어 있으며, 회원/비회원 여부에 따라 다른 모델이 동작합니다:

* 🟡 **비회원용**: TF-IDF + SessionKNN 기반 하이브리드 추천 모델
* 🔵 **회원용**: Two-Tower 기반 딥러닝 모델 (경량화 및 양자화된 ONNX 형태)

---

## 🟡 비회원용 모델 (TF-IDF + SessionKNN)

### 원리

1. **공동구매 정보 기반 추천**

   * 과거 구매 이력에서 \*\*자주 함께 구매된 상품(co-purchase)\*\*을 우선 탐색
   * 각 장바구니 상품에 대해 최대 `co_top_k_per_item`개의 공동구매 후보를 수집하고 집계함

2. **TF-IDF 기반 유사 상품 추천**

   * 공동구매 후보들에 대해 TF-IDF 벡터 유사도 기반으로 가장 유사한 상품을 추천
   * Fallback으로 공동구매 후보가 부족할 경우, 장바구니 내 상품 자체를 기준으로 유사 상품 추천

3. **최종 점수 정렬**

   * 유사도 기반 점수를 합산해 상위 추천 상품을 정렬

### 사전 학습 방식

```python
# 주요 절차
1. 상품 태그 CSV 로드 (`id`, `tag` 컬럼)
2. TF-IDF 벡터라이저 학습 및 태그 벡터 행렬 생성
3. NearestNeighbors (cosine 거리 기반)로 KNN 학습
4. 구매 JSONL 데이터를 세션 단위로 묶어 co-purchase dict 생성
5. 위의 모든 객체를 joblib으로 저장
```

사용된 데이터:

* `products.csv` : 상품명 + 태그 정보
* `purchase_history.jsonl` : 세션 기반 구매 이력

### 일일 재학습 방식

```python
1. PostgreSQL DB에서 오늘 구매내역만 조회 (KST 기준)
2. product_list를 펼쳐 session 단위로 구매 이력 재구성
3. 기존 co-purchase dict에 오늘 이력을 누적 업데이트
4. products 테이블의 태그 정보를 기반으로 TF-IDF + KNN 모델 재학습
```

모델 경로:

* `parameters/guest_model/` 내부 파일을 덮어쓰기 방식으로 갱신

### 입력

* `user_id` (무시됨)
* `cart_items`: 제품 ID 리스트

### 출력

```json
{
  "user_id": "guest",
  "recommendations": ["1024", "2981", "1555", ...]
}
```

### 활용 모델

* `tfidf_vectorizer.pkl`
* `knn_model.pkl` (SessionKNN)
* `df_items.pkl` (상품 메타데이터)
* `tag_matrix.pkl` (TF-IDF 태그 행렬)
* `co_purchase_dict.pkl` (공동구매 딕셔너리)

### Jetson Nano 배포

* 모든 모델 및 데이터는 `joblib` 형식으로 저장
* Jetson 내 FastAPI 서버가 해당 모델을 메모리에 로딩하여 실시간 추론

---

## 🔵 회원용 모델 (Two-Tower 딥러닝 모델)

### 원리

회원의 **인적 정보(성별, 연령), 장바구니, 찜 목록** 등을 종합적으로 반영하여 추천하는 딥러닝 모델입니다.

1. **User Tower**

   * 유저 ID, 성별, 나이, 장바구니/찜 상품 목록(Context)을 임베딩 후 concat하여 벡터화
   * Context 임베딩은 `context_weight` 값으로 강화되어 취향 반영

2. **Item Tower**

   * 각 상품 ID에 대해 별도 사전 임베딩(`item_embeddings.npy`)된 벡터 사용

3. **Similarity 계산**

   * 두 벡터의 내적을 통해 유사도를 계산
   * 장바구니/찜 상품에 이미 포함된 상품은 제외 후 상위 추천

### 사전 학습 방식

```python
# 주요 절차
1. JSONL 데이터 로딩 (user_id, id, gender, age, timestamp 등)
2. 각 유저별 구매 순서를 따라 context sequence 생성 및 padding
3. user_id, 상품 ID에 대해 StringLookup 후 embedding
4. TFRS 기반 Two-Tower 모델 정의 및 학습 (Adagrad, FactorizedTopK)
5. 서빙용 모델 분리 저장 (SavedModel, Keras weights)
6. 최종 상품 임베딩 벡터 추출 → `.npy` 저장
```

사용된 데이터:

* `purchase_history.jsonl` : 유저, 상품, 성별, 나이, 타임스탬프 포함된 데이터
* context 길이: 10, embedding 차원: 32
* 학습 epoch 수: 1 (추후 증가 가능)

### 일일 재학습 방식

```python
1. 기존 `user_lookup.npy`, `id_lookup.npy` 기준 유지
2. 새로운 구매 JSONL 데이터를 로딩 및 전처리
3. 기존 Keras 가중치 로딩 후 추가 학습 수행 (fine-tuning)
4. 학습 완료 후 ONNX로 변환 및 양자화(quantization)
5. 기존 `two_tower_model_quantized.onnx` 덮어쓰기
```

양자화:

* `tf2onnx` + `quantize_dynamic` 사용 (QInt8 동적 양자화)

### 입력

* `user_id`: 문자열
* `gender`: 0(남성) or 1(여성)
* `age`: 정수
* `cart`: 리스트\[str]
* `wishlist`: 리스트\[str]

### 출력

```json
{
  "user_id": "12345",
  "recommendations": ["2421", "3003", "1188", ...]
}
```

### 모델 구성 요소

* `two_tower_model_quantized.onnx`: ONNX 양자화 모델 (경량화됨)
* `user_lookup.npy`: 유저 인덱스 매핑
* `context_lookup.npy`: 상품 ID 인덱스 매핑
* `item_lookup.npy`: 아이템 인덱스 매핑
* `item_embeddings.npy`: 사전 계산된 아이템 벡터

### 최적화

* ONNX 변환 후 **정수 양자화(quantization)** 적용하여 Jetson Nano 성능 최적화
* 실행은 ONNX Runtime (`onnxruntime`)으로 수행

### Jetson Nano 배포

* 모델 및 벡터 파일들은 `parameters/member_model/`에 저장
* ONNX Runtime이 추론을 빠르게 수행할 수 있도록 사전 최적화됨

---

## 디렉토리 구조

```
parameters/
├── guest_model/
│   ├── tfidf_vectorizer.pkl
│   ├── knn_model.pkl
│   ├── df_items.pkl
│   ├── tag_matrix.pkl
│   └── co_purchase_dict.pkl
└── member_model/
    ├── two_tower_model_quantized.onnx
    ├── user_lookup.npy
    ├── context_lookup.npy
    ├── item_lookup.npy
    └── item_embeddings.npy
```

---

## 기타 정보

* 모델들은 매일 새벽 서버에서 새로운 구매 데이터를 기반으로 재학습되며, 최신 모델이 Jetson Nano로 자동 배포됩니다.
* 추론 API는 FastAPI로 구성되어 있으며 `/recommend` 경로를 통해 요청을 처리합니다.
* 일일 재학습 코드는 별도 Airflow DAG이나 스크립트로 자동 실행되도록 구성 가능합니다.
