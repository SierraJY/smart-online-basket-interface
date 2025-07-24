from mqtt_subscriber import on_message

class MsgMock:
    def __init__(self, topic, payload):
        self.topic = topic
        self.payload = payload.encode()

def test_on_message():
    msg = MsgMock("test/topic", "hello, test")
    # 캡처용 리스트
    printed = []
    def fake_print(*args):
        printed.append(args)
    import builtins
    orig_print = builtins.print
    builtins.print = fake_print
    try:
        on_message(None, None, msg)
    finally:
        builtins.print = orig_print
    assert "[RECV]" in printed[0][0] and "hello, test" in printed[0][0]
    print("[TEST] on_message 테스트 통과")

if __name__ == "__main__":
    test_on_message()
