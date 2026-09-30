import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DrizzleModule } from './database/drizzle.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PatientModule } from './modules/patient/patient.module';
import { DoctorModule } from './modules/doctor/doctor.module';
import { TestModule } from './modules/test/test.module';
import { PackageModule } from './modules/package/package.module';
import { ShiftModule } from './modules/shift/shift.module';
import { BillModule } from './modules/bill/bill.module';
import { AdmissionModule } from './modules/admission/admission.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DuePaymentModule } from './modules/due-payment/due-payment.module';
import { RefundModule } from './modules/refund/refund.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    AuditLogModule,
    AuthModule,
    UserModule,
    PatientModule,
    DoctorModule,
    TestModule,
    PackageModule,
    ShiftModule,
    BillModule,
    AdmissionModule,
    PaymentModule,
    DuePaymentModule,
    RefundModule,
    ExpenseModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}