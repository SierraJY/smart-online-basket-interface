import time
from RPLCD.i2c import CharLCD
from datetime import datetime
from typing import Optional

class LCDPanel:
    """
    I2C LCD 패널을 제어하는 클래스
    16x2 LCD 디스플레이를 기본으로 지원
    """
    
    def __init__(self, 
                 address: int = 0x27,
                 port: int = 1,
                 cols: int = 16,
                 rows: int = 2,
                 i2c_expander: str = 'PCF8574',
                 dotsize: int = 8,
                 charmap: str = 'A00',
                 auto_linebreaks: bool = True,
                 backlight_enabled: bool = False):
        """
        LCD 패널 초기화
        
        Args:
            address: I2C 주소 (기본값: 0x27)
            port: I2C 포트 (기본값: 1)
            cols: LCD 가로 글자 수 (기본값: 16)
            rows: LCD 세로 줄 수 (기본값: 2)
            i2c_expander: I2C 익스팬더 타입 (기본값: 'PCF8574')
            dotsize: 도트 크기 (기본값: 8)
            charmap: 문자 맵 (기본값: 'A00')
            auto_linebreaks: 자동 줄바꿈 (기본값: True)
            backlight_enabled: 백라이트 활성화 (기본값: True)
        """
        self.address = address
        self.port = port
        self.cols = cols
        self.rows = rows
        
        try:
            self.lcd = CharLCD(
                i2c_expander=i2c_expander,
                address=address,
                port=port,
                cols=cols,
                rows=rows,
                dotsize=dotsize,
                charmap=charmap,
                auto_linebreaks=auto_linebreaks,
                backlight_enabled=backlight_enabled
            )
            self.is_connected = True
            print(f"LCD 패널이 성공적으로 초기화되었습니다. (주소: 0x{address:02x})")
        except Exception as e:
            self.is_connected = False
            print(f"LCD 패널 초기화 실패: {e}")
            raise
    
    def clear(self):
        """화면을 지웁니다."""
        if self.is_connected:
            self.lcd.clear()
            self.lcd.backlight_enabled=False
    
    def print_total_price(self, total_price: int):
        """
        총 금액을 LCD에 출력합니다.
        
        Args:
            total_price: 총 금액 (정수형)
        """
        if not self.is_connected:
            print("LCD 패널이 연결되어 있지 않습니다.")
            return
        
        self.clear()
        self.lcd.backlight_enabled=True
        self.lcd.write_string(f"Total Price:")
        self.lcd.crlf()
        # 총 금액을 천 단위로 구분하여 출력
        display_text = f"{total_price:,} 원"
        self.lcd.write_string(f"{display_text:>16}")

    def close(self, clear: bool = True):
        """
        LCD 연결을 종료합니다.
        
        Args:
            clear: 종료 시 화면을 지울지 여부
        """
        if self.is_connected:
            if clear:
                self.clear()
            
            self.lcd.backlight_enabled = False
            self.lcd.close(clear=clear)
            self.is_connected = False
            print("LCD 패널 연결이 종료되었습니다.")
