import os
import time
import requests
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

CATEGORY_INFO = {
    '과일': (6000213114, 200),
    '채소': (6000213167, 500),
    '쌀_잡곡_견과': (6000215152, 200),
    '정육_계란류': (6000215194, 300),
    '수산물_건해산': (6000213469, 200),
    '우유_유제품': (6000213534, 300),
    '김치_반찬_델리': (6000213299, 300),
    '생수_음료_주류': (6000213424, 500),
    '커피_원두_차': (6000215245, 200),
    '면류_통조림': (6000213319, 500),
    '양념_오일': (6000215286, 300),
    '과자_간식': (6000213362, 1000),
    '베이커리_잼': (6000213412, 200),
    '건강식품': (6000213046, 300),
}

def sanitize_filename(s):
    return "".join(c if c.isalnum() or c in "_-" else "_" for c in s)

options = Options()
options.add_argument("--headless")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(options=options)

results = []

for category_name, (cat_id, target_count) in CATEGORY_INFO.items():
    safe_name = sanitize_filename(category_name)
    print(f"\n[{category_name}] 크롤링 시작 (목표: {target_count}개)")
    collected = 0
    page = 1
    os.makedirs("pages", exist_ok=True)

    while collected < target_count:
        print(f"  └ 페이지 {page} 요청 중...")
        url = f"https://emart.ssg.com/disp/category.ssg?dispCtgId={cat_id}&page={page}"
        driver.get(url)
        time.sleep(2)

        html_path = f"pages/{safe_name}_page{page}.html"
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(driver.page_source)

        soup = BeautifulSoup(driver.page_source, 'html.parser')
        items = soup.select("li.mnemitem_grid_item")

        if not items:
            print(f"{category_name} 더 이상 아이템 없음. 중단.")
            break

        for item in items:
            if collected >= target_count:
                break
            try:
                brand_tag = item.select_one("span.mnemitem_goods_brand")
                title_tag = item.select_one("span.mnemitem_goods_tit")
                brand = brand_tag.text.strip() if brand_tag else ""
                name = title_tag.text.strip() if title_tag else ""

                price_tag = item.select_one("em.ssg_price")
                price = price_tag.text.strip().replace(",", "") if price_tag else ""

                discount = ""
                discount_tag = item.select("div.mnemitem_prd_per span")
                if len(discount_tag) >= 2:
                    raw = discount_tag[1].text.strip().replace("%", "")
                    try:
                        discount = str(round(float(raw) / 100, 2))
                    except:
                        discount = ""

                img_tag = item.select_one('img.mnemitem_thmb_img')
                img_url = ''
                if img_tag:
                    srcset = img_tag.get('srcset')
                    if srcset:
                        img_url = srcset.split(',')[0].strip().split(' ')[0]
                    else:
                        img_url = img_tag.get('src', '')

                print(f"이미지 URL 확인: {img_url}")

                if img_url.startswith('http'):
                    try:
                        img_data = requests.get(img_url, timeout=10).content
                        img_filename = f'images/{safe_name}/{collected:04}.jpg'
                        with open(img_filename, 'wb') as f:
                            f.write(img_data)
                    except Exception as e:
                        print(f"이미지 다운로드 실패: {img_url} - {e}")
                        img_filename = ""
                else:
                    print(f"유효하지 않은 이미지 URL: {img_url}")
                    img_filename = ""

                results.append({
                    "name": name,
                    "brand": brand,
                    "category": category_name,
                    "price": price,
                    "discount_rate": discount,
                    "image_url": img_url
                })
                collected += 1

                if collected % 10 == 0:
                    print(f"    → {collected}개 수집 완료 (최근 상품: {name})")

            except Exception as e:
                print(f"오류 발생: {e}")
                continue

        page += 1

    print(f"[{category_name}] 완료! 총 {collected}개 수집됨.\n")

driver.quit()

df = pd.DataFrame(results)
df.to_csv("products.csv", index=False, encoding="utf-8-sig")
print("전체 크롤링 완료. products.csv 저장됨.")
