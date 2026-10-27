import robotsParser from 'robots-parser';
import { fetchWithRetry } from './http';

interface CacheEntry {
  parser: ReturnType<typeof robotsParser> | null;
  expiresAt: number;
}

const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間キャッシュ

export class RobotsTxtCache {
  private static cache = new Map<string, CacheEntry>();

  /**
   * 指定したURLが robots.txt によってクロール許可されているか判定します。
   * ホスト単位で robots.txt をキャッシュします。
   */
  static async isAllowed(url: string, userAgent = '*'): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const origin = parsedUrl.origin;
      const robotsUrl = `${origin}/robots.txt`;

      const now = Date.now();
      const cached = this.cache.get(origin);

      let parser: ReturnType<typeof robotsParser> | null = null;

      if (cached && cached.expiresAt > now) {
        parser = cached.parser;
      } else {
        try {
          const text = await fetchWithRetry(robotsUrl, {
            timeoutMs: 5000,
            maxRetries: 0,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            readResponse: (response) => response.text(),
          });

          parser = robotsParser(robotsUrl, text);
        } catch (error) {
          console.warn(`Failed to fetch robots.txt for ${origin}, treating as Fail Open:`, error);
        }

        this.cache.set(origin, {
          parser,
          expiresAt: now + ROBOTS_CACHE_TTL_MS,
        });
      }

      if (!parser) {
        // robots.txt 取得失敗または 404 等の場合は Fail Open
        return true;
      }

      return parser.isAllowed(url, userAgent) ?? true;
    } catch (e) {
      console.error(`Invalid URL provided to RobotsTxtCache: ${url}`, e);
      return true; // 不正なURLでも Fail Open
    }
  }
}
