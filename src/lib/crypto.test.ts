import { describe, expect, it } from 'vitest';
import { hmacHex } from './crypto';

describe('hmacHex (crypto.subtle 가용성 + 서버 호환)', () => {
  it('알려진 벡터와 일치한다(node crypto 와 바이트 동일)', async () => {
    // 3-구현 바이트 동일성 가드:
    // node:   crypto.createHmac('sha256','test-secret').update('guest-abc').digest('hex')
    // mobile: Hmac(sha256, utf8.encode('test-secret')).convert(utf8.encode('guest-abc')).toString()
    const out = await hmacHex('test-secret', 'guest-abc');
    expect(out).toBe(
      '92ef1a1fc9a49535a91133e1653458b7e0450758b94680ef84c2c1c7dc98bd59',
    );
  });
});
