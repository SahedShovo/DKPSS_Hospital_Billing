import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** ActiveShiftGuard request-এ shift বসিয়ে দেয়, এখান থেকে সেটা বের করা হয় */
export const CurrentShift = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.shift;
  },
);