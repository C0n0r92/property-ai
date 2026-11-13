import { afterEach, describe, expect, it } from 'vitest';
import { replyAddress } from './mailer';

describe('replyAddress', () => {
  const original = process.env.EMAIL_REPLY_TO;
  afterEach(() => {
    if (original === undefined) delete process.env.EMAIL_REPLY_TO;
    else process.env.EMAIL_REPLY_TO = original;
  });

  it('sends replies to the hello@ inbox by default', () => {
    delete process.env.EMAIL_REPLY_TO;
    expect(replyAddress()).toBe('hello@irishpropertydata.com');
  });

  it('uses EMAIL_REPLY_TO when set', () => {
    process.env.EMAIL_REPLY_TO = 'support@irishpropertydata.com';
    expect(replyAddress()).toBe('support@irishpropertydata.com');
  });

  it('ignores a blank override', () => {
    process.env.EMAIL_REPLY_TO = '   ';
    expect(replyAddress()).toBe('hello@irishpropertydata.com');
  });
});
