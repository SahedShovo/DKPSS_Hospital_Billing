import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * এখন placeholder। Day 5-এর পর থেকে bill/payment/refund
 * service-এর ভেতরে সরাসরি audit_logs table-এ insert হবে
 * (Postgres trigger নয়, কারণ Drizzle raw trigger সহজে manage করে না)।
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}