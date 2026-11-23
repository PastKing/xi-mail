import {describe,expect,it} from 'vitest';
import reqUtils from '../../src/utils/req-utils';

describe('trusted client IP',()=>{
  it('uses only the address provided by the Cloudflare edge',()=>{
    const headers={
      'CF-Connecting-IP':'203.0.113.8',
      'X-Real-IP':'198.51.100.20',
      'X-Forwarded-For':'192.0.2.99',
      'Client-IP':'198.51.100.21',
    };
    expect(reqUtils.getIp({req:{header:name=>headers[name]}})).toBe('203.0.113.8');
  });

  it('does not fall back to spoofable forwarding headers when the edge value is absent',()=>{
    const headers={'X-Real-IP':'198.51.100.20','X-Forwarded-For':'192.0.2.99','Client-IP':'198.51.100.21'};
    expect(reqUtils.getIp({req:{header:name=>headers[name]}})).toBe('Unknown');
  });
});
