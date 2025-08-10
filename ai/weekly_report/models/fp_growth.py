import os
import pandas as pd
from mlxtend.frequent_patterns import fpgrowth, association_rules
import matplotlib.pyplot as plt
from tqdm import tqdm
import time
import psycopg2
from datetime import datetime, timedelta

plt.rcParams["font.family"] = "Malgun Gothic"


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'sobi-db'),
        database=os.getenv('DB_NAME', 'sobi'),
        user=os.getenv('DB_USER', 'airflow'),
        password=os.getenv('DB_PASSWORD', 'airflow')
    )

def get_last_week_data(execution_date=None):
    try:
        if execution_date is None:
            execution_date = datetime.now()
        
        end_date = execution_date.date() - timedelta(days=1)
        start_date = end_date - timedelta(days=6)
        
        query = """
        SELECT session_id, product_id
        FROM training_data
        WHERE DATE(purchased_at) >= %s
        AND DATE(purchased_at) <= %s
        """
        
        with get_db_connection() as conn:
            df = pd.read_sql(
                query,
                conn,
                params=(start_date, end_date)
            )
        
        print(f"[데이터 조회 기간] {start_date} ~ {end_date}")
        print(f"[조회된 데이터 건수] {len(df)}건")
        
        if len(df) == 0:
            raise ValueError(f"해당 기간({start_date} ~ {end_date})에 데이터가 없습니다.")
            
        return df
        
    except Exception as e:
        print(f"[ERROR] 데이터 조회 실패: {str(e)}")
        raise


def safe_basket_prep(
    df, prod_col="product_id", session_col="session_id", max_carts=20000
):
    print(f"\n[1] 장바구니 집계 시작: session_col={session_col}, prod_col={prod_col}")
    basket = df.groupby(session_col)[prod_col].apply(list).reset_index()
    basket.rename(columns={prod_col: "cart_list"}, inplace=True)

    print("[1-1] 장바구니(cart_list) 예시 출력:")
    print(basket.head(5))
    print("[1-2] cart_list 품목수 describe():")
    print(basket["cart_list"].apply(len).describe())
    print("[1-3] cart_list 품목수 상위 10개:")
    print(basket["cart_list"].apply(len).sort_values(ascending=False).head(10))

    if len(basket) > max_carts:
        basket = basket.sample(max_carts, random_state=42)
        print(f"[1-4] 장바구니가 {max_carts}개로 샘플링됨")
    print(f"[1-5] 최종 장바구니 개수: {len(basket)}")
    return basket


class FPGrowthRecommender:
    def __init__(self, min_support=0.0005, min_confidence=0.01):
        self.min_support = min_support
        self.min_confidence = min_confidence
        self.rules = None
        self.frequent_itemsets = None


    def fit(self, transactions):
        print("\n[2] FP-Growth 입력 데이터(장바구니) shape/예시:")
        print(transactions.head(5))
        print("[2-1] 전체 장바구니 수:", len(transactions))
        print("[2-2] 평균 품목 수:", transactions["cart_list"].apply(len).mean())

        if len(transactions) == 0 or transactions["cart_list"].str.len().sum() == 0:
            print("[경고] cart_list 데이터가 없습니다. FP-Growth 중단.")
            self.rules = pd.DataFrame()
            self.frequent_itemsets = pd.DataFrame()
            return

        all_items = set(
            item
            for cart in tqdm(transactions["cart_list"], desc="카트 스캔")
            for item in cart
        )
        print(f"[2-3] 전체 고유 상품 개수: {len(all_items)}")

        prod_counts = pd.Series(
            [item for cart in transactions["cart_list"] for item in cart]
        )
        print("[2-4] 상품별 구매 빈도 top 10:")
        print(prod_counts.value_counts().head(10))

        print("[3] One-hot 인코딩 중...")
        encoded_rows = []
        for cart in tqdm(transactions["cart_list"], desc="One-hot 인코딩"):
            row = {item: (item in cart) for item in all_items}
            encoded_rows.append(row)
        basket_df = pd.DataFrame(encoded_rows)
        print(f"[3-1] one-hot DataFrame shape: {basket_df.shape}")
        mem_mb = basket_df.memory_usage(deep=True).sum() / (1024**2)
        print(f"[3-2] 메모리 사용량: {mem_mb:.2f}MB")

        if basket_df.shape[0] == 0 or basket_df.shape[1] == 0:
            print("[경고] one-hot 데이터프레임이 비어 있습니다. FP-Growth 중단.")
            self.rules = pd.DataFrame()
            self.frequent_itemsets = pd.DataFrame()
            return

        print("[4] FP-Growth 실행...")
        frequent_itemsets = fpgrowth(
            basket_df, min_support=self.min_support, use_colnames=True
        )
        self.frequent_itemsets = frequent_itemsets
        print(f"[4-1] Frequent itemsets 개수: {len(frequent_itemsets)}")
        if not frequent_itemsets.empty:
            freq_multi = frequent_itemsets[
                frequent_itemsets["itemsets"].apply(lambda x: len(x) > 1)
            ]
            print(f"[4-2] 2개 이상 상품 조합 frequent itemsets 개수: {len(freq_multi)}")
            print(freq_multi.head(5))
        else:
            print("[경고] frequent_itemsets가 없습니다.")

        if frequent_itemsets.empty:
            print(
                "[경고] Frequent itemsets가 비어 있습니다. Association rules 미생성."
            )
            self.rules = pd.DataFrame()
            return

        print("[5] Association rules 생성 중...")
        self.rules = association_rules(
            frequent_itemsets, metric="confidence", min_threshold=self.min_confidence
        )
        print(f"[5-1] 연관규칙 개수: {len(self.rules)}")
        if not self.rules.empty:
            print("\n[5-2] 연관규칙 상위 5개:")
            print(
                self.rules[
                    ["antecedents", "consequents", "support", "confidence", "lift"]
                ].head()
            )
        else:
            print("[경고] 연관규칙이 없습니다.")


    def get_single_item_rules(self, top_k=10, min_conf=None, save_path=None):
        if self.rules is None or self.rules.empty:
            print("[경고] 연관규칙이 없습니다. 결과 없음.")
            return []

        min_conf = min_conf or self.min_confidence
        single_rules = (
            self.rules[
                (self.rules["antecedents"].apply(lambda x: len(x) == 1))
                & (self.rules["consequents"].apply(lambda x: len(x) == 1))
                & (self.rules["confidence"] >= min_conf)
            ]
            .sort_values(by="confidence", ascending=False)
            .head(top_k)
        )

        result, x_labels, y_confidences = [], [], []
        for _, row in single_rules.iterrows():
            # 상품명 매핑 삭제 → ID 그대로 표시
            ant_id = next(iter(row["antecedents"]))
            con_id = next(iter(row["consequents"]))

            confidence_pct = round(float(row["confidence"]) * 100, 1)
            result.append(
                f"'{ant_id}'를 구매한 고객의 {confidence_pct}%가 '{con_id}'도 함께 구매."
            )
            x_labels.append(f"{ant_id} → {con_id}")
            y_confidences.append(confidence_pct)

        print(f"[디버깅] x_labels: {x_labels}")
        print(f"[디버깅] y_confidences: {y_confidences}")

        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.figure(figsize=(max(8, len(x_labels)), 6))
            plt.bar(x_labels, y_confidences, color="skyblue")
            for i, v in enumerate(y_confidences):
                plt.text(i, v + 1, f"{v}%", ha="center", va="bottom", fontsize=10)
            plt.ylabel("신뢰도 (%)")
            plt.xlabel("상품쌍 (A → B)")
            plt.title("상위 연관 규칙 Top 10 (단일 상품 → 단일 상품, Confidence)")
            plt.xticks(rotation=35, ha="right")
            plt.tight_layout()
            plt.savefig(save_path)
            plt.close()
        return result


def generate_association_summary(execution_date=None):
    df = get_last_week_data(execution_date)
    print(f"\n[시작] 원본 데이터 shape: {df.shape}")
    print("[원본 데이터 샘플]:")
    print(df.head(5))
    
    basket = safe_basket_prep(df)
    output_dir = "./output"
    os.makedirs(output_dir, exist_ok=True)
    image_path = os.path.abspath(os.path.join(output_dir, "fp_growth_single_rules.png"))

    model = FPGrowthRecommender(min_support=0.005, min_confidence=0.01)
    start_time = time.time()
    model.fit(basket)
    fit_elapsed = time.time() - start_time
    print(f"\n[FP-Growth 학습(fit) 소요시간] {fit_elapsed:.2f}초")

    start_time = time.time()
    sentences = model.get_single_item_rules(save_path=image_path)
    rule_elapsed = time.time() - start_time
    print(f"[규칙 생성/그래프 저장 소요시간] {rule_elapsed:.2f}초")

    return "\n".join(sentences), image_path


if __name__ == "__main__":
    txt, img = generate_association_summary()
    print("\n[상위 연관규칙 문장 요약]")
    print(txt)
    print("\n[그래프 파일 경로]")
    print(img)
