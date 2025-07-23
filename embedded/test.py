from rfid_reader import RFIDReader


def tag_handler(tag_data):
    print(f"태그: {tag_data['raw_tag_id']}")
    print(f"RSSI: {tag_data['rssi']}")
    if tag_data["is_96bit_epc"]:
        epc = tag_data["epc_info"]
        print(
            f"상품: {epc['product_code']}, 상품명: {epc['product_name']}, 순번: {epc['sequence_num']}"
        )


# 1초마다 폴링
reader = RFIDReader("COM6")
reader.set_tag_callback(tag_handler)
reader.start_reading("single", 1.0)
