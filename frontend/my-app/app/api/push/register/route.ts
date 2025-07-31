import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pushToken } = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 });
    }

    // 백엔드에 푸시 토큰 전달
    const response = await fetch('http://localhost:8082/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ pushToken })
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorData = await response.text();
      return NextResponse.json({ error: errorData }, { status: response.status });
    }

  } catch (error) {
    console.error('[Push API] 푸시 토큰 등록 실패:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 