# DKPSSHP Hospital Billing System
## পূর্ণাঙ্গ Project Report ও Source-code Evidence

- **প্রতিষ্ঠান/প্রকল্প:** Dakhin Khan Paribaric Shastha Seba Hospital (Pvt.) — Hospital Billing System
- **Report প্রস্তুতির তারিখ:** ২০ নভেম্বর ২০২৬
- **পর্যালোচিত code:** `main` branch-এর স্থানীয় release candidate
- **প্রস্তুতকারীর নাম:** `[এখানে আপনার নাম লিখুন]`

> এই report repository-র source code, database schema, migration এবং package scripts দেখে তৈরি। এটি project-এর design ও বর্তমান code behavior-এর evidence দেয়; live database বা production deployment-এর ফলাফল নয়।

## সারসংক্ষেপ

DKPSSHP Hospital Billing System একটি web-based hospital operations ও billing application। এটি রোগী ও ব্যবহারকারীর তথ্য, doctor, diagnostic test, service package, admission, bill, collection, due receipt, refund, shift, expense এবং audit log পরিচালনা করে। Bill এবং due-payment receipt print করা যায়; Admin Dashboard-এ date range অনুযায়ী billing, collection, refund, expense এবং profit দেখা যায়।

Project-টি দুই ভাগে তৈরি: Next.js/React/TypeScript frontend এবং NestJS/TypeScript backend। Backend REST API ব্যবহার করে PostgreSQL-এ তথ্য রাখে; database query ও schema mapping-এর জন্য Drizzle ORM ব্যবহার করা হয়েছে। Login-এর পরে API request-এ JWT token লাগে।

Source code-এ গুরুত্বপূর্ণ financial safeguards রয়েছে: bill balance payment/refund ledger-এর সঙ্গে মেলানো হয়, due receipt bill-এ allocation পায়, এক user-এর একটির বেশি open shift database-এ আটকানো হয়, এবং bill delete করার আগে payment/refund ও due-receipt হিসাব যাচাই করা হয়।

## ১. প্রকল্পের পটভূমি ও উদ্দেশ্য

Hospital billing-এ রোগীর পরিচয়, একাধিক ধরনের service bill, আংশিক payment, পুরোনো due, refund, receipt এবং দৈনিক cash reconciliation একসঙ্গে সামলাতে হয়। এই project-এর code সেই কাজগুলো একটি web application-এ একত্র করেছে।

প্রকল্পের প্রধান উদ্দেশ্য:

1. রোগীর profile ও billing history এক জায়গায় রাখা।
2. বিভিন্ন service-এর জন্য bill তৈরি, discount হিসাব এবং bill print করা।
3. পূর্ণ বা আংশিক payment এবং পরে due সংগ্রহের record রাখা।
4. Package discount, admission ও bed charge পরিচালনা করা।
5. প্রত্যেক cashier/user-এর shift ও নগদ হিসাব আলাদা রাখা।
6. Admin-কে dashboard, expense ও audit history দেওয়া।
7. ভুল আর্থিক পরিবর্তন ঠেকাতে backend validation, transaction এবং database constraint ব্যবহার করা।

## ২. Project-এর পরিধি ও feature

| অংশ | কী করে |
|---|---|
| Login ও user | Username/password login, password পরিবর্তন এবং Admin দ্বারা user পরিচালনা |
| Patient | Patient profile, search, list, update, billing history ও due summary; বয়স সংখ্যা বা `6 month`-এর মতো text হতে পারে |
| Doctor | Doctor-এর তথ্য ও active status পরিচালনা |
| Diagnostic test | Test name/price পরিচালনা এবং diagnostic bill-এ test যোগ |
| Package | Package item, base price এবং নির্ধারিত discount পরিচালনা |
| Bill | Doctor visit, diagnostic, package, admission, emergency ও medicine bill |
| Discount | Bill-level বা item-level fixed amount discount; package bill-এ অতিরিক্ত discount |
| Payment | Bill-এ পূর্ণ/আংশিক payment, payment history ও printable bill |
| Due payment | পুরোনো due সংগ্রহ, receipt এবং এক বা একাধিক due bill-এ allocation |
| Refund | Bill-এর paid amount ফেরত এবং ledger-এ negative refund entry |
| Admission | Admission, bed charge refresh এবং discharge |
| Shift | Opening cash, collection, refund, closing cash এবং difference |
| Dashboard/report | Date range-এ bill, collection, due collection, refund, expense ও profit |
| Expense | Admin-এর মাধ্যমে expense entry/update |
| Audit log | গুরুত্বপূর্ণ পরিবর্তনের actor, entity, old/new value এবং timestamp সংরক্ষণ |
| Export/print | Bill list CSV export, bill print এবং due-payment receipt print |

## ৩. প্রযুক্তি ও architecture

### Technology stack

| স্তর | প্রযুক্তি | Repository evidence |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS, lucide-react | `hospital-billing-frontend/package.json` |
| Backend/API | NestJS 10, TypeScript, Passport JWT, class-validator | `hospital-billing-backend/package.json` |
| Database | PostgreSQL; Neon serverless connection pool | `hospital-billing-backend/src/config/database.config.ts` |
| ORM/schema | Drizzle ORM ও Drizzle PostgreSQL schema | `hospital-billing-backend/src/database/` |
| Money calculation | Decimal.js-ভিত্তিক `Money` utility; database-এ ২ decimal place | `hospital-billing-backend/src/common/utils/money.util.ts` |
| Authentication | JWT bearer token; password hash/compare | `hospital-billing-backend/src/modules/auth/` |

### Request flow

```text
ব্যবহারকারী (Browser)
        │
        ▼
Next.js Frontend ── HTTP/JSON + JWT ──► NestJS REST API
                                            │
                            Authentication / Role / Shift checks
                                            │
                                            ▼
                                  Module Controller
                                            │
                                            ▼
                                  Service + Transaction
                                            │
                                            ▼
                                    Drizzle ORM
                                            │
                                            ▼
                               PostgreSQL (Neon-compatible)
```

API-র সফল response `{ success: true, data: ... }` আকারে আসে; error response-এ `success: false`, status এবং message থাকে। এই response format global interceptor ও exception filter দিয়ে তৈরি হয়।

## ৪. User role ও permission

Project-এ `ADMIN` এবং `RECEPTIONIST`—দুই role আছে। API-তে JWT authentication-এর পাশাপাশি সংবেদনশীল route-এ role guard ব্যবহার করা হয়।

| কাজ | Admin | Receptionist |
|---|---:|---:|
| Patient তৈরি/দেখা/আপডেট | হ্যাঁ | হ্যাঁ |
| Bill তৈরি, দেখা ও discount প্রয়োগ | হ্যাঁ | হ্যাঁ |
| Package-এর bill তৈরি ও রোগীর জন্য অতিরিক্ত discount | হ্যাঁ | হ্যাঁ |
| Test/doctor/package catalogue পরিচালনা | হ্যাঁ | না |
| নিজের Shift চালু/বন্ধ | হ্যাঁ | হ্যাঁ |
| নিজের চালু Shift-এ payment/due/refund নেওয়া | হ্যাঁ | হ্যাঁ |
| Dashboard, expense ও audit log | হ্যাঁ | না |
| User পরিচালনা | হ্যাঁ | না |
| Bill cancel বা bill delete | হ্যাঁ | না |

Payment, due payment ও refund route-এ active shift বাধ্যতামূলক। Shift অন্য login user-এর সঙ্গে share হয় না।

## ৫. প্রধান business flow ও হিসাব

### ৫.১ Bill calculation

Bill-এর মূল সূত্র:

```text
Gross Amount = প্রতিটি item-এর unit price × quantity যোগফল
Discount Amount = নির্বাচিত discount পদ্ধতির ছাড়
Net Amount = Gross Amount − Discount Amount
Due Amount = max(Net Amount − Total Paid, 0)
```

Discount mode `NONE`, `BILL` অথবা `ITEM`। Bill-level discount ও item-level discount একই bill-এ একসঙ্গে দেওয়া যায় না। Item discount item line amount-এর বেশি হতে পারে না; bill discount gross amount-এর বেশি হতে পারে না।

**উদাহরণ:** ২টি test, প্রতিটি ৳১,০০০। Gross ৳২,০০০; bill discount ৳২০০ হলে net ৳১,৮০০। রোগী ৳১,০০০ দিলে paid ৳১,০০০ এবং due ৳৮০০।

### ৫.২ Package discount

Package-এ Admin-এর নির্ধারিত base price এবং fixed package discount থাকতে পারে। Bill বানানোর সময় Admin বা Receptionist রোগীর জন্য additional discount যোগ করতে পারেন। Backend total discount base price ছাড়ালে request বাতিল করে।

**উদাহরণ:** Base price ৳১০,০০০ − package discount ৳১,০০০ − additional discount ৳৫০০ = net bill ৳৮,৫০০।

### ৫.৩ Patient age

বয়সের input text হিসেবে নেওয়া হয়। শুধু সংখ্যা লিখলে সেটি বছর ধরা হয়: `25` → `25 বছর` / `25 years`। ইউনিটসহ লেখা, যেমন `6 month` বা `৬ মাস`, profile, patient list ও printed bill-এ লেখা অনুযায়ী দেখায়। Backend age string সর্বোচ্চ ৪০ অক্ষর নেয়। `20261119_patient_age_text.sql` migration integer column-কে `varchar(40)`-এ বদলায় এবং পুরোনো numeric মানকে text-এ রূপান্তর করে রেখে দেয়।

### ৫.৪ Due payment allocation

একটি due receipt patient-এর নামে তৈরি হয়। একই রোগীর একাধিক active bill বাকি থাকলে backend পুরোনো bill আগে ধরে (`createdAt`, তারপর bill ID অনুযায়ী) receipt-এর টাকা allocate করে। Receipt table-এ জমার মোট অঙ্ক থাকে; `payments` table-এ bill-ভিত্তিক allocation থাকে। Due list patient-এর সব active bill-এর unpaid balance যোগ করে তৈরি হয়।

**উদাহরণ:** পুরোনো bill-এ due ৳৫০০, নতুন bill-এ due ৳৭০০। Patient ৳৮০০ দিলে প্রথম bill-এ ৳৫০০ এবং দ্বিতীয় bill-এ ৳৩০০ যাবে। দ্বিতীয় bill-এ ৳৪০০ due থাকবে। Receipt page-এ কোন bill-এ কত সমন্বয় হয়েছে দেখা ও print করা যায়।

### ৫.৫ Payment ও refund

Bill payment positive amount হিসেবে সংরক্ষিত হয় এবং bill-এর total paid বাড়ায়। Refund-এর amount ledger-এ negative হিসেবে রাখা হয় এবং bill paid balance কমে। Refund bill-এর paid amount-এর বেশি হতে পারে না। Cancelled bill-এ refund হয় না। Admin bill cancel করতে পারেন; bill-এ টাকা জমা থাকলে cancel-এর আগে সম্পূর্ণ refund করতে হয়।

### ৫.৬ Shift ও cash reconciliation

Shift user-ভিত্তিক। ব্যবহারকারী opening cash দিয়ে Shift খোলেন, পরে bill payment, due collection এবং refund তার Shift-এ জমা হয়। Shift নিজে থেকে auto-on বা auto-off হয় না; logout করলেও open shift খোলা থাকে। ব্যবহারকারী closing cash দিয়ে Shift বন্ধ করেন।

```text
Expected Cash = Opening Cash
              + bill payments (due-receipt allocation বাদে)
              + due-payment receipts
              + refunds (negative amount)
Difference = Counted Closing Cash − Expected Cash
```

**উদাহরণ:** Opening ৳১,০০০ + bill collection ৳১,৫০০ + old due ৳২,০০০ − refund ৳৫০০ = expected ৳৪,০০০। হাতে ৳৩,৯০০ থাকলে difference −৳১০০। System difference দেখায়; closing cash-এ অমিল থাকলেও Shift close হয়।

এক user-এর জন্য একই সময়ে একটির বেশি `OPEN` Shift application lock এবং partial unique database index দিয়ে ঠেকানো হয়। Closed shift-এ নতুন collection নেওয়া যায় না।

### ৫.৭ Bill deletion ও audit

Individual bill delete route Admin-only। Delete transaction-এর আগে backend যাচাই করে:

- bill আছে কি না এবং সেটি admission record-এর সঙ্গে যুক্ত কি না;
- bill-এর total paid payment/refund ledger-এর সঙ্গে মেলে কি না;
- due receipt-এর মোট amount তার bill allocations-এর সমান কি না;
- রোগীর কোনো due receipt allocation ছাড়া পড়ে আছে কি না।

পরীক্ষাগুলো পাস হলে bill, bill items, direct payment, refund মুছে যায়। Due receipt অন্য bill-এও allocate থাকলে receipt-এর amount বাকি allocation অনুযায়ী কমে; ওই receipt-এর আর allocation না থাকলে receipt-ও মুছে যায়। Delete-এর আগে bill, items, payment, refund ও due receipt-এর snapshot audit log-এ রাখা হয়। Admission-linked bill delete করা যায় না।

**গুরুত্বপূর্ণ সীমাবদ্ধতা:** Paid bill delete করলে Dashboard-এর live collection কমে যায়। তবে সংশ্লিষ্ট Shift আগে বন্ধ হয়ে থাকলে close করার সময় সংরক্ষিত expected cash/difference snapshot bill delete করার কারণে স্বয়ংক্রিয়ভাবে বদলায় না। ঐতিহাসিক Shift ও ledger পরে reconcile করা দরকার হতে পারে। Production-এ paid bill delete করার আগে Admin-কে হিসাব যাচাই করতে হবে।

### ৫.৮ Dashboard

Dashboard service নির্বাচিত সময়ের মধ্যে active bill-এর net billing, সাধারণ bill payment, পুরোনো due receipt, refund এবং expense আলাদা করে যোগ করে।

```text
Income = Cash Collection + Old Due Collected + Refund
Profit = Income − Expense
```

Refund ঋণাত্মক; due receipt-এর bill allocation-কে দ্বিতীয়বার collection ধরা হয় না। `Net Billing` হলো bill তৈরি হওয়ার অঙ্ক; এটি ঐ দিনে হাতে পাওয়া নগদের সমান নয়। Dashboard day boundary `Asia/Dhaka` timezone ধরে তৈরি হয়।

## ৬. Database model

টাকার column-গুলো PostgreSQL `numeric(12,2)` ব্যবহার করে। গুরুত্বপূর্ণ table ও সম্পর্ক:

| Table | ব্যবহার ও সম্পর্ক |
|---|---|
| `users` | Admin/Receptionist account; bill, payment, shift, expense ও audit-এর user reference |
| `patients` | Patient profile; age হলো সর্বোচ্চ ৪০ অক্ষরের text; bill, admission ও due receipt-এর parent record |
| `doctors`, `tests` | Doctor ও diagnostic catalogue |
| `packages`, `package_items` | Package header ও item list; package item package delete-এ cascade হয় |
| `bills`, `bill_items` | Patient bill এবং bill-এর service lines |
| `admissions` | Patient admission; প্রতিটি admission একটি unique bill-এর সঙ্গে যুক্ত |
| `shifts` | User-এর opening/closing cash, expected cash, difference ও status |
| `payments` | Bill payment; optional `due_payment_id` দিয়ে due receipt allocation চিহ্নিত |
| `due_payments` | Patient-এর কাছ থেকে নেওয়া due receipt; payment allocation এক বা একাধিক bill-এ হতে পারে |
| `refunds` | Bill-এর refund ledger; amount negative |
| `expenses` | Admin-entered operating cost |
| `audit_logs` | User, action, table/record, old/new JSON এবং timestamp |

Database safeguard-এর উদাহরণ:

- একই user-এর একটির বেশি open shift রাখা যায় না।
- একই patient-এর একটির বেশি active (`ADMITTED`) admission রাখা যায় না।
- Patient ও bill list query-র জন্য প্রয়োজনীয় index রয়েছে।

## ৭. REST API-এর সংক্ষিপ্ত মানচিত্র

API path-গুলো controller অনুযায়ী; frontend-এর `NEXT_PUBLIC_API_URL` হলো backend API base URL।

| API route group | প্রধান কাজ |
|---|---|
| `/auth` | Login, password change |
| `/users` | Admin user management |
| `/patients` | Patient create, list, search, update, detail |
| `/doctors`, `/tests`, `/packages` | Catalogue read ও Admin management |
| `/admissions` | Admit, active admission, bed charge refresh, discharge |
| `/bills` | Bill create/list/detail, date-range, discount, Admin cancel/delete |
| `/payments` | Active Shift-এ bill payment ও payment lookup |
| `/due-payments` | Active Shift-এ due receipt, outstanding patient, receipt detail |
| `/refunds` | Active Shift-এ refund ও bill refund lookup |
| `/shifts` | Current Shift, open, close, summary |
| `/dashboard` | Admin daily/date-range financial summary |
| `/expenses` | Admin expense create/list/update |
| `/audit-logs` | Admin audit history search |

## ৮. Security, validation ও data integrity

- Login password `bcrypt` hash/compare helper দিয়ে যাচাই হয়; password plaintext response-এ ফেরত দেওয়া হয় না।
- JWT bearer token দিয়ে protected API ব্যবহার হয়; token expiration `JWT_EXPIRES_IN` environment variable নিয়ন্ত্রণ করে।
- Role guard Admin-only route enforce করে। Active-shift guard cash collection/refund route-এ open shift বাধ্যতামূলক করে।
- Global `ValidationPipe` unknown field বাদ দেয় না—বরং whitelist/forbid configuration অনুযায়ী অতিরিক্ত field reject করে এবং DTO validation করে।
- Financial change-এর বেশ কিছু flow database transaction ও row lock ব্যবহার করে, যাতে concurrent payment/shift request balance নষ্ট না করে।
- `Money` utility Decimal.js ব্যবহার করে; টাকা সরাসরি JavaScript floating-point যোগ-বিয়োগে হিসাব না করার জন্য তৈরি।
- Audit log-এ action, user, record ও old/new snapshot রাখা যায়। Bill delete-এর audit snapshot delete-এর আগের financial state দেখায়।
- SQL migration পুরোনো due receipt allocation ও bill balance repair করে এবং database safeguard যোগ করে। Existing database-এ কেবল আগে সফল হয়নি এমন migration চালাতে হবে; আগে backup নিতে হবে।

## ৯. Source-code evidence index

Project review-এর মূল evidence file:

| বিষয় | Source file/folder |
|---|---|
| Root structure ও setup | `README.md` |
| Backend module registration ও global behavior | `hospital-billing-backend/src/app.module.ts`, `src/main.ts` |
| Frontend route/screen | `hospital-billing-frontend/src/app/` |
| API auth/role/shift guard | `hospital-billing-backend/src/common/guards/` |
| Database tables ও relation | `hospital-billing-backend/src/database/schema/` |
| Migration history | `hospital-billing-backend/src/database/migrations/` |
| Bill math/discount/delete | `hospital-billing-backend/src/modules/bill/` |
| Due receipt allocation | `hospital-billing-backend/src/modules/due-payment/` |
| Payment and refund | `hospital-billing-backend/src/modules/payment/`, `src/modules/refund/` |
| Shift open/close/summary | `hospital-billing-backend/src/modules/shift/` |
| Dashboard totals | `hospital-billing-backend/src/modules/dashboard/` |
| Audit history | `hospital-billing-backend/src/modules/audit-log/` |
| Dependency and available scripts | `hospital-billing-backend/package.json`, `hospital-billing-frontend/package.json` |

## ১০. Run ও deploy overview

### Local development

1. PostgreSQL database তৈরি করুন।
2. `hospital-billing-backend/.env`-এ `DATABASE_URL`, শক্তিশালী `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` এবং প্রথম Admin-এর `INITIAL_ADMIN_*` মান দিন।
3. `hospital-billing-frontend/.env.local`-এ `NEXT_PUBLIC_API_URL=http://localhost:4002` দিন।
4. Backend directory-তে `npm install` ও `npm run start:dev` চালান।
5. Frontend directory-তে `npm install` ও `npm run dev` চালান।
6. প্রথম database setup হলে migration/schema তৈরি ও প্রথম Admin seed করুন। Seed script: `npm run seed` (শুধু প্রথম Admin তৈরি করার সময়)।

`.env`/`.env.local`, database password, JWT secret এবং real patient data public Git-এ দেওয়া যাবে না।

### Existing database-এ deploy

1. Database backup নিন।
2. Migration history দেখে শুধু বাকি SQL migration filename-এর ক্রমে চালান।
   নতুন age field-এর migration: `hospital-billing-backend/src/database/migrations/20261119_patient_age_text.sql`।
3. Backend host-এ production database এবং JWT environment variable দিন।
4. Frontend hosting-এ `NEXT_PUBLIC_API_URL` deployed API-র ঠিকানা দিন।
5. Backend ও frontend deploy log দেখুন; migration সফল হওয়ার আগে নতুন backend চালু করবেন না।
6. Test/staging account দিয়ে login, bill, discount, payment, due receipt print, shift open/close ও Admin permission যাচাই করুন।

Project-এর README Vercel frontend deployment উল্লেখ করে। Backend auto-deploy behavior host configuration-এর উপর নির্ভর করে; repository code alone দিয়ে live deploy status প্রমাণ হয় না।

## ১১. Verification plan ও status

### Staging acceptance checks

| Check | Expected result |
|---|---|
| Patient age `25` দিয়ে তৈরি | Profile/list-এ `25 বছর`; printed bill-এ `25 years` |
| Patient age `6 month` দিয়ে তৈরি বা edit | Profile/list/printed bill-এ `6 month`; database save সফল |
| Receptionist Shift খোলা ছাড়া bill payment করার চেষ্টা | API payment reject করবে |
| Admin ৳১,০০০ bill-এ ৳৩০০ payment নেয় | Paid ৳৩০০, due ৳৭০০ |
| একই patient ৳৭০০ due দেয় | Receipt তৈরি, allocation bill-এ যায়, due ৳০ |
| Due receipt page-এ print চাপা | গ্রাহক কপি ও হাসপাতাল কপি print preview-তে আসে |
| Package base ৳১০,০০০, fixed ছাড় ৳১,০০০, extra ছাড় ৳৫০০ | Net ৳৮,৫০০ |
| একই user-এর দ্বিতীয় open shift খোলা | Reject হবে |
| Receptionist bill delete করার চেষ্টা | Permission reject হবে |
| Admin admission-linked bill delete চেষ্টা | Delete block হবে |
| Bill payment/refund ledger mismatch রেখে delete | Delete block হবে |
| Paid test bill delete | Operational bill/payment/refund record সরবে; audit snapshot থাকবে; dashboard total বদলাবে |
| Test Shift logout/login-এর পর দেখা | Shift নিজে থেকে বন্ধ হবে না; manually close করতে হবে |

### এই report তৈরির verification status

Backend ও frontend production build সফল হয়েছে। Project owner নতুন age migration সফলভাবে চালিয়েছেন বলে জানিয়েছেন; database-এ সরাসরি query করে আমি তা যাচাই করিনি। Manual browser acceptance test ও live deployment status এখানে যাচাই করা হয়নি। Package manifests-এ automated `test` script নেই। উপরের acceptance check-গুলো প্রস্তাবিত staging test, সম্পন্ন test result নয়।

## ১২. পরিচিত সীমা ও operational risk

1. Shift-এর auto timer নেই; staff-কে manual close করতে হয়। Logout open shift বন্ধ করে না।
2. Network/API error হলে frontend Shift status refresh নাও হতে পারে। Page refresh করা উচিত; database একই user-এর duplicate open shift ঠেকায়।
3. Closed shift-এর payment থাকা bill পরে delete করলে dashboard-এর live aggregate বদলায়, কিন্তু shift close-এর saved expected/difference snapshot পুরোনো থাকতে পারে। পুরোনো Shift reconcile করা প্রয়োজন হতে পারে।
4. Individual delete operational bill/payment/refund record সরায়। Audit snapshot থাকলেও এটি routine correction-এর বিকল্প নয়; paid bill delete করার আগে হিসাব যাচাই ও অনুমোদন দরকার।
5. Migration পুরোনো data-র balance/receipt allocation বদলাতে পারে। Backup এবং migration success record রাখা জরুরি।
6. Production server, database backup cadence, monitoring, access policy ও runtime test status repository alone থেকে নিশ্চিত করা যায় না; hosting dashboard ও operations owner দিয়ে যাচাই করতে হবে।

## ১৩. উপসংহার

এই project patient-facing service billing এবং hospital cash collection-এর গুরুত্বপূর্ণ workflow-গুলো এক web system-এ সংযুক্ত করেছে। এর মূল structure হলো Next.js frontend, NestJS API এবং PostgreSQL database। Bill math, due payment allocation, shift cash accounting, admin restriction, audit log এবং SQL migration হলো project-এর financial integrity-র প্রধান অংশ। Production evidence সম্পূর্ণ করতে এই source-code report-এর সঙ্গে staging test result, migration success record, hosting deployment log এবং user acceptance evidence সংযুক্ত করা উচিত।

---

### Evidence সংযুক্ত করার জায়গা

Report জমা বা presentation-এ নিচের প্রমাণগুলো যোগ করতে পারেন:

- Admin Dashboard-এর screenshot (নাম, phone, patient identifier ঢেকে)।
- Bill detail ও printed bill-এর sample (test patient ব্যবহার করে)।
- Due receipt এবং allocation-এর sample screenshot।
- Shift open/close summary-এর screenshot।
- Admin বনাম Receptionist permission test-এর ফল।
- Migration success output এবং hosting deployment success screen।

Real patient information, password, token, database URL বা financial account detail screenshot-এ প্রকাশ করবেন না।
