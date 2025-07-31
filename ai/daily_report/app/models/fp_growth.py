import pandas as pd
import psycopg2
from sqlalchemy import create_engine
from mlxtend.frequent_patterns import fpgrowth, association_rules
import matplotlib.pyplot as plt
import os
from datetime import datetime, timedelta

# 도커 네트워크 기준 PostgreSQL 주소
DB_URL = 'postgresql://user:password@db:5432/mydatabase'


class FPGrowthRecommender:
    def __init__(self, min_support=0.01, min_confidence=0.85):
        self.min_support = min_support
        self.min_confidence = min_confidence
        self.rules = None

    def fit(self, transactions):
        all_items = set(item for cart in transactions['cart_list'] for item in cart)
        encoded_rows = []

        for cart in transactions['cart_list']:
            row = {item: (item in cart) for item in all_items}
            encoded_rows.append(row)

        basket = pd.DataFrame(encoded_rows)
        frequent_itemsets = fpgrowth(basket, min_support=self.min_support, use_colnames=True)
        self.rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=self.min_confidence)

    def get_rule_sentences(self, top_k=10, min_conf=None, save_path=None):
        if self.rules is None:
            raise ValueError("fit() must be called first.")

        min_conf = min_conf or self.min_confidence
        filtered = self.rules[self.rules['confidence'] >= min_conf]
        filtered = filtered.sort_values(by='confidence', ascending=False).head(top_k)

        result = []
        x_labels = []
        y_confidences = []

        for _, row in filtered.iterrows():
            antecedent = ', '.join(row['antecedents'])
            consequent = ', '.join(row['consequents'])
            confidence_pct = round(row['confidence'] * 100, 1)

            sentence = f"'{antecedent}'를 구매한 고객의 {confidence_pct}%가 '{consequent}'도 함께 구매했습니다."
            result.append(sentence)

            x_labels.append(f"{antecedent} → {consequent}")
            y_confidences.append(confidence_pct)

        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            plt.figure(figsize=(10, 6))
            bars = plt.barh(range(len(x_labels)), y_confidences, color='skyblue')
            plt.yticks(range(len(x_labels)), x_labels)
            plt.xlabel('신뢰도 (%)')
            plt.title('상위 연관 규칙 Top 10 (Confidence)')
            plt.gca().invert_yaxis()
            for i, bar in enumerate(bars):
                plt.text(bar.get_width() + 1, bar.get_y() + bar.get_height()/2, f"{y_confidences[i]}%", va='center')
            plt.tight_layout()
            plt.savefig(save_path)
            plt.close()

        return result


def get_last_week_range():
    """지난 주 월요일 ~ 일요일 날짜 반환"""
    today = datetime.today()
    last_monday = today - timedelta(days=today.weekday() + 7)
    last_sunday = last_monday + timedelta(days=6)
    return last_monday.date(), last_sunday.date()


def generate_association_summary():
    # 1. 지난 주 범위 계산
    start_date, end_date = get_last_week_range()

    # 2. DB 접속 및 데이터 쿼리
    engine = create_engine(DB_URL)
    query = f"""
        SELECT cart_list 
        FROM purchase_sessions 
        WHERE purchased_at BETWEEN '{start_date}' AND '{end_date}'
    """
    df = pd.read_sql(query, engine)

    # 3. cart_list 문자열 처리
    if isinstance(df['cart_list'].iloc[0], str):
        df['cart_list'] = df['cart_list'].apply(eval)

    # 4. FP-Growth 분석 및 시각화
    image_path = 'static/images/assoc_rules.png'
    model = FPGrowthRecommender(min_support=0.01, min_confidence=0.5)
    model.fit(df)
    sentences = model.get_rule_sentences(save_path=image_path)

    # 5. 요약 문장과 이미지 경로 반환
    return '\n'.join(sentences), image_path

