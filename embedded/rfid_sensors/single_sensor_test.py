from rfid_reader import RFIDReader
import time

# 통계 변수
tag_stats = {"total_count": 0, "epc_count": 0, "products": {}, "start_time": None}


def tag_handler(tag_data):
    """태그 감지 핸들러"""
    tag_stats["total_count"] += 1

    print(f"\n📟 태그 #{tag_stats['total_count']}")
    print(f"ID: {tag_data['raw_tag_id']}")
    print(f"RSSI: {tag_data['rssi']} dBm")

    if tag_data["is_96bit_epc"] and tag_data.get("epc_info"):
        tag_stats["epc_count"] += 1
        epc = tag_data["epc_info"]

        # 상품별 카운트
        product_code = epc["product_code"]
        if product_code not in tag_stats["products"]:
            tag_stats["products"][product_code] = 0
        tag_stats["products"][product_code] += 1

        print(f"상품코드: {epc['product_code']}")
        print(f"상품명: {epc['product_name']}")
        print(f"순번: {epc['sequence_num']:05d}")
        print(f"생산시간: {epc['readable_time']}")
    else:
        print("일반 태그")

    # 실시간 통계
    if tag_stats["start_time"]:
        elapsed = time.time() - tag_stats["start_time"]
        rate = tag_stats["total_count"] / elapsed if elapsed > 0 else 0
        print(
            f"통계: 총 {tag_stats['total_count']}개 (EPC: {tag_stats['epc_count']}개) | {rate:.1f}태그/초"
        )


def reset_stats():
    """통계 초기화"""
    tag_stats["total_count"] = 0
    tag_stats["epc_count"] = 0
    tag_stats["products"] = {}
    tag_stats["start_time"] = time.time()


def print_final_stats(mode):
    """최종 통계 출력"""
    elapsed = time.time() - tag_stats["start_time"] if tag_stats["start_time"] else 0
    rate = tag_stats["total_count"] / elapsed if elapsed > 0 else 0

    print(f"\n{'='*40}")
    print(f"📊 {mode} 폴링 테스트 결과")
    print(f"{'='*40}")
    print(f"총 태그: {tag_stats['total_count']}개")
    print(f"EPC 태그: {tag_stats['epc_count']}개")
    print(f"테스트 시간: {elapsed:.1f}초")
    print(f"평균 속도: {rate:.1f}태그/초")

    if tag_stats["products"]:
        print(f"상품별 통계:")
        for code, count in tag_stats["products"].items():
            print(f"  {code}: {count}개")


def test_single_polling():
    """싱글 폴링 테스트"""
    print("🔍 싱글 폴링 테스트 (1초 간격)")
    print("태그를 가져다 대세요... (20초 후 자동 종료)\n")

    reset_stats()

    try:
        reader = RFIDReader("COM6")
        reader.set_tag_callback(tag_handler)
        reader.start_reading("single", 1.0)  # 1초 간격

        # 20초 동안 테스트
        time.sleep(20)

        reader.stop_reading()
        print_final_stats("싱글")

    except Exception as e:
        print(f"❌ 싱글 폴링 오류: {e}")


def test_multiple_polling():
    """멀티 폴링 테스트"""
    print("🚀 멀티 폴링 테스트 (연속 스캔)")
    print("태그를 가져다 대세요... (15초 후 자동 종료)\n")

    reset_stats()

    try:
        with RFIDReader("COM6") as reader:
            reader.set_tag_callback(tag_handler)
            reader.start_reading("multiple")  # 연속 스캔

            # 15초 동안 테스트
            time.sleep(15)

        print_final_stats("멀티")

    except Exception as e:
        print(f"❌ 멀티 폴링 오류: {e}")


def test_comparison():
    """두 모드 비교 테스트"""
    print("⚖️  싱글 vs 멀티 폴링 비교 테스트")
    print("=" * 50)

    # 싱글 폴링 테스트
    print("\n1️⃣  싱글 폴링 테스트 시작")
    test_single_polling()
    single_results = {
        "count": tag_stats["total_count"],
        "epc_count": tag_stats["epc_count"],
        "rate": tag_stats["total_count"] / 20 if tag_stats["start_time"] else 0,
    }

    print("\n⏳ 5초 대기 중...")
    time.sleep(5)

    # 멀티 폴링 테스트
    print("\n2️⃣  멀티 폴링 테스트 시작")
    test_multiple_polling()
    multi_results = {
        "count": tag_stats["total_count"],
        "epc_count": tag_stats["epc_count"],
        "rate": tag_stats["total_count"] / 15 if tag_stats["start_time"] else 0,
    }

    # 비교 결과
    print(f"\n📈 성능 비교 결과")
    print(f"{'='*40}")
    print(
        f"싱글 폴링: {single_results['count']}개 ({single_results['rate']:.1f}태그/초)"
    )
    print(f"멀티 폴링: {multi_results['count']}개 ({multi_results['rate']:.1f}태그/초)")

    if multi_results["rate"] > single_results["rate"]:
        improvement = (
            (multi_results["rate"] / single_results["rate"] - 1) * 100
            if single_results["rate"] > 0
            else 0
        )
        print(f"🚀 멀티 폴링이 {improvement:.1f}% 더 빠름!")
    else:
        print(f"🐌 싱글 폴링이 더 안정적")


if __name__ == "__main__":
    print("🏷️  RFID 폴링 모드 테스트")
    print("=" * 50)
    print("1. 싱글 폴링만 테스트")
    print("2. 멀티 폴링만 테스트")
    print("3. 두 모드 비교 테스트")

    choice = input("\n선택하세요 (1-3): ").strip()

    try:
        if choice == "1":
            test_single_polling()
        elif choice == "2":
            test_multiple_polling()
        elif choice == "3":
            test_comparison()
        else:
            print("기본값으로 비교 테스트 실행")
            test_comparison()

    except KeyboardInterrupt:
        print(f"\n⏹️  테스트 중단됨")
        print_final_stats("중단된")

    print(f"\n👋 테스트 완료!")
