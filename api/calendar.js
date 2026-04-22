/**
 * Vercel Serverless Function — Google Calendar ICS 프록시
 * 경로: /api/calendar?url=<encoded-ical-url>
 *
 * 브라우저에서 구글 캘린더에 직접 요청하면 CORS 오류가 발생하므로
 * 서버(Vercel Edge)가 대신 요청하고 결과를 반환합니다.
 */
export default async function handler(req, res) {
  const { url } = req.query

  // url 파라미터 필수 검증
  if (!url) {
    return res.status(400).json({ error: 'url 파라미터가 필요합니다.' })
  }

  // 구글 캘린더 URL만 허용 (보안)
  if (!url.startsWith('https://calendar.google.com/')) {
    return res.status(403).json({ error: '구글 캘린더 URL만 허용됩니다.' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KidScheduler/1.0)',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({
        error: `구글 캘린더 응답 오류: ${response.status} ${response.statusText}`,
      })
    }

    const text = await response.text()

    // 30분 캐시 (Vercel Edge 캐시 활용)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300')
    res.setHeader('Access-Control-Allow-Origin', '*')

    return res.status(200).send(text)
  } catch (err) {
    console.error('[api/calendar] fetch 실패:', err.message)
    return res.status(500).json({ error: `서버 요청 실패: ${err.message}` })
  }
}
