export default function Head() {
  return (
    <>
      <title>SOBI - 스마트 장바구니</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <meta name="description" content="QR코드로 스마트 장바구니와 연동하여 실시간으로 상품을 확인하는 PWA" />
      
      {/* PWA 메타데이터 */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="SOBI" />
      
      {/* 아이콘 */}
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" href="/64.ico" />
      <link rel="apple-touch-icon" href="/256.png" />
      
      {/* 테마 컬러 */}
      <meta name="theme-color" content="#128211" />
      <meta name="msapplication-TileColor" content="#128211" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* 추가 메타데이터 */}
      <meta name="application-name" content="SOBI" />
      <meta name="msapplication-TileImage" content="/256.png" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
    </>
  );
}