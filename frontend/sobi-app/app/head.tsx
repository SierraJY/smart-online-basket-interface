export default function Head() {
  return (
    <>
      <title>SOBI - 스마트 장바구니</title>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no" />
      <meta name="theme-color" content="#128211" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="description" content="QR코드로 스마트 장바구니와 연동하여 실시간으로 상품을 확인하는 PWA" />
      
      {/* PWA 메타데이터 */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="SOBI" />
      
      {/* PWA Manifest */}
      <link rel="manifest" href="/manifest.json" />
      
      {/* 기본 아이콘 */}
      <link rel="icon" href="/64.ico" />
      <link rel="shortcut icon" href="/64.ico" />
      
      {/* Apple Touch Icons - 다양한 크기 */}
      <link rel="apple-touch-icon" href="/256.png" />
      <link rel="apple-touch-icon" sizes="57x57" href="/64.png" />
      <link rel="apple-touch-icon" sizes="60x60" href="/64.png" />
      <link rel="apple-touch-icon" sizes="72x72" href="/128.png" />
      <link rel="apple-touch-icon" sizes="76x76" href="/128.png" />
      <link rel="apple-touch-icon" sizes="114x114" href="/128.png" />
      <link rel="apple-touch-icon" sizes="120x120" href="/128.png" />
      <link rel="apple-touch-icon" sizes="144x144" href="/256.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/256.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/256.png" />
      
      {/* Apple Touch Icon Precomposed (iOS 6 이하) */}
      <link rel="apple-touch-icon-precomposed" href="/256.png" />
      <link rel="apple-touch-icon-precomposed" sizes="57x57" href="/64.png" />
      <link rel="apple-touch-icon-precomposed" sizes="60x60" href="/64.png" />
      <link rel="apple-touch-icon-precomposed" sizes="72x72" href="/128.png" />
      <link rel="apple-touch-icon-precomposed" sizes="76x76" href="/128.png" />
      <link rel="apple-touch-icon-precomposed" sizes="114x114" href="/128.png" />
      <link rel="apple-touch-icon-precomposed" sizes="120x120" href="/128.png" />
      <link rel="apple-touch-icon-precomposed" sizes="144x144" href="/256.png" />
      <link rel="apple-touch-icon-precomposed" sizes="152x152" href="/256.png" />
      <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/256.png" />
      
      {/* Splash Screen Images for iOS */}
      <link rel="apple-touch-startup-image" href="/512.png" />
      <link rel="apple-touch-startup-image" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" href="/512.png" />
      <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/512.png" />
      <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" href="/512.png" />
      <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/512.png" />
      <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/512.png" />
      <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" href="/512.png" />
      
      {/* 다양한 크기의 아이콘 */}
      <link rel="icon" type="image/png" sizes="16x16" href="/16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/32.png" />
      <link rel="icon" type="image/png" sizes="64x64" href="/64.png" />
      <link rel="icon" type="image/png" sizes="128x128" href="/128.png" />
      <link rel="icon" type="image/png" sizes="256x256" href="/256.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/512.png" />
      
      {/* 테마 컬러 */}
      <meta name="theme-color" content="#128211" />
      <meta name="msapplication-TileColor" content="#128211" />
      
      {/* 추가 메타데이터 */}
      <meta name="application-name" content="SOBI" />
      <meta name="msapplication-TileImage" content="/256.png" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
    </>
  );
}