# DKPSSHP Hospital Billing System — বাংলা Project Guide

**সর্বশেষ পর্যালোচনা:** ২০ নভেম্বর ২০২৬ · **কার জন্য:** Admin, Receptionist এবং project maintainers

## ১. Project পরিচিতি

এই software দিয়ে রোগী, doctor, diagnostic test, package, admission, bill, payment, due payment, refund, expense, shift এবং audit record পরিচালনা করা হয়। বিল print করা যায় এবং dashboard-এ তারিখ অনুযায়ী হিসাব দেখা যায়।

Project-এর দুটি অংশ:

- `hospital-billing-frontend/` — Next.js web application; ব্যবহারকারীরা browser-এ এটি ব্যবহার করেন।
- `hospital-billing-backend/` — NestJS API; PostgreSQL database-এ তথ্য সংরক্ষণ ও হিসাব করে।

## ২. User role

| কাজ | Admin | Receptionist |
|---|---:|---:|
| রোগী খোঁজা/যোগ করা এবং bill তৈরি | হ্যাঁ | হ্যাঁ |
| Bill payment, due payment ও refund নেওয়া | নিজের Shift চালু থাকলে | নিজের Shift চালু থাকলে |
| Package bill-এ অতিরিক্ত discount দেওয়া | হ্যাঁ | হ্যাঁ |
| Package-এর মূল দাম ও নির্ধারিত discount পরিচালনা | হ্যাঁ | না |
| Expense, Dashboard ও audit log পরিচালনা/দেখা | হ্যাঁ | না |
| User পরিচালনা | হ্যাঁ | না |
| একটি bill বা তারিখের bill মুছে ফেলা | হ্যাঁ | না |
| Bill cancel করা | হ্যাঁ | না |

Role অনুযায়ী API-তেও অনুমতি পরীক্ষা করা হয়; শুধু screen থেকে button লুকানোই একমাত্র বাধা নয়।

## ৩. দৈনন্দিন কাজের নিয়ম

### রোগীর bill তৈরি ও payment

1. রোগী খুঁজুন অথবা নতুন রোগী যোগ করুন।
2. বয়স শুধু `25` লিখলে ২৫ বছর বোঝাবে; `6 month` বা `৬ মাস` লিখলেও text হিসেবে save হবে।
3. Doctor Visit, Diagnostic, Package, Emergency, Medicine অথবা প্রয়োজনীয় bill type বেছে bill তৈরি করুন।
4. Bill তৈরি হওয়ার পর রোগীর কাছ থেকে টাকা নিলে bill-এর payment নথিভুক্ত করুন এবং bill print দিন।
5. আংশিক টাকা নিলে বাকি অংশ bill-এর due হিসেবে থাকবে।

**উদাহরণ:** Bill ৳৫,০০০। রোগী এখন ৳৩,০০০ দিলেন। Bill-এ paid ৳৩,০০০ এবং due ৳২,০০০ থাকবে। পরে ৳২,০০০ due payment নিলে বাকি due শূন্য হবে।

### Due payment নেওয়া

1. আগে নিজের Shift চালু করুন।
2. Due Payment তালিকা থেকে রোগীর profile খুলে due payment জমা নিন এবং পাওয়া টাকার পরিমাণ লিখুন।
3. জমা সফল হলে receipt page খুলবে। `রসিদ প্রিন্ট করুন` চাপলে গ্রাহকের কপি ও হাসপাতালের কপি print হবে।
4. একই রোগীর একাধিক bill-এ বাকি থাকলে system পুরোনো bill থেকে ক্রমানুসারে টাকা ভাগ করে দেয়।

System receipt-এর পাশাপাশি bill-এর paid ও due balance এবং payment allocation সংরক্ষণ করে। ফলে bill-এ due শূন্য দেখালে সেটি ওই bill-এর হিসাব; রোগীর অন্য bill-এ due থাকলে রোগী due তালিকায় থাকতে পারেন।

### Discount

- সাধারণ bill-এ item discount অথবা পুরো bill-এর discount ব্যবহার করা যায়। একই bill-এ এই দুই পদ্ধতি একসঙ্গে দেওয়া যায় না।
- Package-এর base price এবং আগে থেকে নির্ধারিত package discount Admin পরিচালনা করেন।
- Package bill বানানোর সময় Admin বা Receptionist রোগীর জন্য অতিরিক্ত discount দিতে পারেন। এই অতিরিক্ত discount package-এর আগের discount-এর সঙ্গে **যোগ হয়**। মোট discount package-এর base price-এর বেশি হতে পারে না।

**উদাহরণ:** Package-এর base price ৳১০,০০০, নির্ধারিত discount ৳১,০০০ এবং রোগীর জন্য অতিরিক্ত discount ৳৫০০ হলে মোট discount ৳১,৫০০, bill হবে ৳৮,৫০০।

### Shift চালু ও বন্ধ

- Shift প্রত্যেক login user-এর নিজস্ব। Admin-এর Shift ও Receptionist-এর Shift আলাদা।
- Topbar থেকে `Shift চালু করুন` চাপুন এবং drawer-এ থাকা শুরুর নগদ টাকা লিখুন।
- Payment, due payment ও refund নিতে Shift চালু থাকা দরকার।
- কাজ শেষে cash গুনে `Shift বন্ধ করুন` চাপুন এবং হাতে থাকা প্রকৃত cash লিখুন। System প্রত্যাশিত cash ও গরমিল দেখাবে।
- Logout করলেও Shift বন্ধ হয় না। বর্তমান code-এ Shift নিজে থেকে চালু বা বন্ধ করার timer নেই; ব্যবহারকারীকে button দিয়ে চালু/বন্ধ করতে হয়।
- Shift বন্ধ করার পর ওই Shift-এ নতুন payment, due payment বা refund নেওয়া যাবে না।

**হিসাবের উদাহরণ:** Opening cash ৳১,০০০ + bill payment ৳১,৫০০ + due collection ৳২,০০০ − refund ৳৫০০ = expected cash ৳৪,০০০। হাতে ৳৩,৯০০ থাকলে গরমিল −৳১০০ দেখাবে।

যদি network/API সমস্যায় topbar-এ `কোনো Shift চালু নেই` দেখায় কিন্তু Shift খোলা আছে বলে মনে হয়, আগে page refresh করে আবার দেখুন। একই user-এর জন্য system একসঙ্গে একটির বেশি open Shift হতে দেয় না।

### Bill delete ও cancel

- Individual bill delete করতে পারবেন শুধু Admin। Bill-এর row-তে `মুছুন` চাপলে confirmation পড়ুন, তারপর নিশ্চিত করুন।
- Delete হলে bill, তার bill items, payment ও refund record হিসাবের মূল table থেকে মুছে যায়। যুক্ত due receipt-এর amount/allocation-ও সেই bill অনুযায়ী adjust হয়। Admin-এর audit log-এ delete-এর আগের তথ্যের snapshot থাকে।
- Admission record-যুক্ত bill delete করা যায় না। Payment/refund-এর অঙ্ক বা due receipt allocation না মিললেও system delete আটকে দেয়।
- Bill cancel আলাদা কাজ। Bill-এ payment থাকলে আগে পুরো payment refund না করা পর্যন্ত cancel করা যায় না।

**সতর্কতা:** Paid bill delete করলে Dashboard-এর live collection কমে যাবে। কিন্তু bill-এর payment যে Shift-এ হয়েছিল সেটি আগেই বন্ধ থাকলে, Shift বন্ধের সময় save করা expected cash ও difference snapshot স্বয়ংক্রিয়ভাবে পুনর্লিখিত হয় না। তাই পুরোনো Shift-এর bill delete করার আগে Admin-কে Shift ও ledger মিলিয়ে সিদ্ধান্ত নিতে হবে। Production-এ আসল হিসাবের bill দিয়ে delete পরীক্ষা করবেন না; test/staging database ব্যবহার করুন।

## ৪. Dashboard-এর হিসাব বোঝা

- **Net Billing:** নির্বাচিত সময়ে তৈরি হওয়া active bill-এর net amount। এটি ওই সময়ে হাতে পাওয়া নগদ টাকার সমান নয়।
- **Cash Collection:** bill-এর সাধারণ payment।
- **Old Due Collected:** আগে তৈরি হওয়া bill-এর due হিসেবে পরে পাওয়া টাকা।
- **Refund:** refund-কে collection থেকে বাদ দেওয়া হয়।
- **Income:** Cash Collection + Old Due Collected + Refund (refund ঋণাত্মক)।
- **Profit:** Income − Expense।

**উদাহরণ:** Bill payment ৳২,৫০০ + পুরোনো due ৳১,০০০ − refund ৳৩০০ = Income ৳৩,২০০। Expense ৳৭০০ হলে Profit ৳২,৫০০।

Due payment-কে dashboard-এ আলাদা receipt হিসেবে গণনা করা হয়, একই receipt-এর bill allocation-কে দ্বিতীয়বার cash হিসেবে যোগ করা হয় না। Dashboard date filter-এ বাংলাদেশ সময় (Asia/Dhaka) ধরে দিন গণনা করা হয়।

## ৫. নতুন computer-এ চালানোর নিয়ম

প্রথমে Node.js/npm এবং PostgreSQL database প্রস্তুত করুন। Secret বা password কোনো document, Git commit, screenshot বা chat-এ প্রকাশ করবেন না।

Backend directory-তে private `.env` file বানিয়ে hosting/database provider-এর নিজস্ব মান বসান:

```dotenv
DATABASE_URL=postgresql://<database-user>:<password>@<host>/<database>?sslmode=require
JWT_SECRET=<লম্বা-random-secret>
JWT_EXPIRES_IN=7d
PORT=4002
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_NAME=System Administrator
INITIAL_ADMIN_PASSWORD=<কমপক্ষে-১২-অক্ষর>
```

Frontend-এর `hospital-billing-frontend/.env.local`-এ দিন:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4002
```

Development server চালাতে:

```bash
cd hospital-billing-backend
npm install
npm run start:dev
```

অন্য terminal-এ:

```bash
cd hospital-billing-frontend
npm install
npm run dev
```

Frontend সাধারণত `http://localhost:3000`-এ খোলে। Backend-এর default port `4002`। প্রথম Admin account তৈরি করতে backend-এর `INITIAL_ADMIN_*` মান দিয়ে seed script চালাতে হয়; আগে থেকেই ব্যবহারকারীর account থাকলে seed আবার চালানোর আগে database maintainer-এর সঙ্গে কথা বলুন।

প্রথম Admin তৈরি করার command:

```bash
cd hospital-billing-backend
npm run seed
```

## ৬. Database migration ও deployment

Existing database-এ নতুন backend version deploy করার আগে backup নিন এবং নিচের SQL migration-গুলো filename-এর ক্রমে চালান:

1. `hospital-billing-backend/src/database/migrations/20261019_fixed_discount_amount.sql`
2. `hospital-billing-backend/src/database/migrations/20261021_package_discount_amount.sql`
3. `hospital-billing-backend/src/database/migrations/20261024_due_payment_allocations.sql`
4. `hospital-billing-backend/src/database/migrations/20261025_financial_integrity.sql`
5. `hospital-billing-backend/src/database/migrations/20261119_patient_age_text.sql`

যে migration আগে সফলভাবে চালানো হয়েছে, সেটি আবার চালাবেন না; নিজের migration record দেখে শুধু বাকি migration চালান। Migration কীভাবে চালাবেন তা নিশ্চিত না হলে database provider-এর SQL editor-এ file-এর SQL চালান এবং success/error result সংরক্ষণ করুন।

`20261025_financial_integrity.sql` পুরোনো due receipt-কে bill-এ বরাদ্দ করে, payment/refund ledger থেকে bill balance মেলায়, এবং একই user-এর একাধিক open Shift ও একই রোগীর একাধিক active admission ঠেকানোর database rule যোগ করে। Duplicate থাকলে migration error দিয়ে থামে; আগে database-এ duplicate সমাধান করতে হয়। Migration চালানোর পর success/error message সংরক্ষণ করুন।

`20261119_patient_age_text.sql` পুরোনো numeric বয়স অপরিবর্তিত রেখে `patients.age`-কে text column করে, যাতে `6 month` বা `৬ মাস`-এর মতো মান save করা যায়।

Deploy-এর আগে/পরে checklist:

- Production database-এর backup আছে।
- Backend host-এ `DATABASE_URL`, শক্তিশালী `JWT_SECRET`, `PORT` এবং initial admin settings ঠিক আছে।
- Vercel project-এ `NEXT_PUBLIC_API_URL` deployed backend-এর API address দেখায়।
- Migration সফল হয়েছে, তারপর backend deploy হয়েছে; frontend deploy-ও সফল হয়েছে।
- Admin ও Receptionist login, bill view/print, payment, due receipt, package discount এবং manual Shift open/close staging-এ যাচাই হয়েছে।
- Admin-only delete/cancel button Receptionist-এ নেই এবং paid bill delete-এর financial effect test data-তে মেলানো হয়েছে।

Git-এর `main` branch-এ পরিবর্তন push করলে Vercel-এর সংযুক্ত frontend project auto-deploy করতে পারে। Backend-এর auto-deploy hosting provider-এর configuration-এর উপর নির্ভর করে; deploy log আলাদাভাবে পরীক্ষা করুন।

## ৭. নিরাপদ যাচাইয়ের নমুনা

Staging/test database-এ:

1. Test Admin login করে Shift চালু করুন, opening cash ৳১,০০০ দিন।
2. Test রোগীর জন্য ৳১,০০০ bill তৈরি করুন; bill-এ ৳৩০০ payment নিন। Bill-এ paid ৳৩০০, due ৳৭০০ দেখুন।
3. Due Payment থেকে ৳৭০০ নিন এবং receipt-এর patient, amount ও allocation যাচাই করুন। Bill-এর due এখন ৳০ হওয়া উচিত।
4. Shift summary-তে opening cash ও দুটি collection যোগ হয়ে expected cash ৳২,০০০ হওয়া উচিত। হাতে গোনা cash লিখে Shift বন্ধ করুন; difference দেখুন।
5. Logout করে একই Admin-এ login করলে Shift বন্ধই থাকার কথা। Receptionist-এর নিজের Shift আলাদাভাবে চালু/বন্ধ করে পরীক্ষা করুন।
6. Admin-এর test bill delete করলে Dashboard collection কমে কি না দেখুন। Delete হওয়া payment/refund আর সাধারণ bill record-এ থাকবে না; audit log-এ delete record থাকবে।

এই নমুনার জন্য আসল রোগীর bill বা production cash ব্যবহার করবেন না।
