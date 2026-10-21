import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, ilike, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { billItems, packages, packageItems } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class PackageService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  private withPrice(pkg: any, items: any[]) {
    const itemTotal = items.reduce((total, item) => total.add(item.amount), Money.of('0'));
    const basePrice = pkg.packagePrice ? Money.of(pkg.packagePrice) : itemTotal;
    const discount = Money.of(pkg.packageDiscountAmount ?? '0');
    return {
      ...pkg,
      items,
      basePrice: basePrice.toDb(),
      packageDiscountAmount: discount.toDb(),
      effectivePrice: basePrice.subtract(discount).toDb(),
    };
  }

  async create(dto: CreatePackageDto, createdBy: number) {
    const [existing] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.name, dto.name))
      .limit(1);
    if (existing) throw new ConflictException('এই প্যাকেজের নাম আগে থেকেই আছে');

    const itemsTotal = dto.items.reduce((total, item) => total.add(item.amount), Money.of('0'));
    const basePrice = dto.packagePrice ? Money.of(dto.packagePrice) : itemsTotal;
    const discount = Money.of(dto.packageDiscountAmount ?? '0');
    if (basePrice.isNegative() || discount.isNegative() || discount.isGreaterThan(basePrice)) {
      throw new BadRequestException('প্যাকেজের ছাড় মূল দামের চেয়ে বেশি বা ঋণাত্মক হতে পারবে না');
    }

    const [created] = await this.db
      .insert(packages)
      .values({
        name: dto.name,
        packagePrice: dto.packagePrice ? Money.of(dto.packagePrice).toDb() : null,
        packageDiscountAmount: discount.toDb(),
        createdBy,
      })
      .returning();

    const itemRows = dto.items.map((item) => ({
      packageId: created.id,
      itemType: item.itemType,
      itemName: item.itemName,
      amount: Money.of(item.amount).toDb(),
    }));
    const insertedItems = await this.db.insert(packageItems).values(itemRows).returning();

    return this.withPrice(created, insertedItems);
  }

  async findAll() {
    return this.db.select().from(packages).orderBy(packages.id);
  }

  async findPage({ page, pageSize, search }: PageQueryDto & { search?: string }) {
    const searchTerm = search?.trim();
    const searchFilter = searchTerm
      ? ilike(packages.name, `%${searchTerm.replace(/[\\%_]/g, '\\$&')}%`)
      : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(packages).where(searchFilter).orderBy(packages.id).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(packages).where(searchFilter),
    ]);
    if (!rows.length) return { items: [], total, page, pageSize };
    const ids = rows.map((pkg: any) => pkg.id);
    const itemRows = await this.db.select().from(packageItems).where(inArray(packageItems.packageId, ids));
    const byPackage = new Map<number, any[]>();
    for (const item of itemRows) byPackage.set(item.packageId, [...(byPackage.get(item.packageId) ?? []), item]);
    const items = rows.map((pkg: any) => this.withPrice(pkg, byPackage.get(pkg.id) ?? []));
    return { items, total, page, pageSize };
  }

  async findActive() {
    const activePackages = await this.db.select().from(packages).where(eq(packages.isActive, true));
    if (!activePackages.length) return [];
    const itemRows = await this.db.select().from(packageItems);
    const itemsByPackage = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const rows = itemsByPackage.get(item.packageId) ?? [];
      rows.push(item);
      itemsByPackage.set(item.packageId, rows);
    }
    return activePackages.map((pkg: typeof activePackages[number]) => this.withPrice(pkg, itemsByPackage.get(pkg.id) ?? []));
  }

  async findOne(id: number) {
    const [pkg] = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
    if (!pkg) throw new NotFoundException('প্যাকেজ পাওয়া যায়নি');

    const items = await this.db
      .select()
      .from(packageItems)
      .where(eq(packageItems.packageId, id));

    return this.withPrice(pkg, items);
  }

  async update(id: number, dto: UpdatePackageDto) {
    const current = await this.findOne(id);
    const setValue: any = {};
    if (dto.name !== undefined) setValue.name = dto.name;
    if (dto.packagePrice !== undefined) setValue.packagePrice = dto.packagePrice === null ? null : Money.of(dto.packagePrice).toDb();
    if (dto.packageDiscountAmount !== undefined) setValue.packageDiscountAmount = dto.packageDiscountAmount === null ? '0.00' : Money.of(dto.packageDiscountAmount).toDb();
    if (dto.isActive !== undefined) setValue.isActive = dto.isActive;

    const nextBasePrice = dto.packagePrice === undefined
      ? Money.of(current.basePrice)
      : dto.packagePrice === null
        ? Money.of(current.items.reduce((total: Money, item: any) => total.add(item.amount), Money.of('0')))
        : Money.of(dto.packagePrice);
    const nextDiscount = dto.packageDiscountAmount === undefined
      ? Money.of(current.packageDiscountAmount)
      : Money.of(dto.packageDiscountAmount ?? '0');
    if (nextBasePrice.isNegative() || nextDiscount.isNegative() || nextDiscount.isGreaterThan(nextBasePrice)) {
      throw new BadRequestException('প্যাকেজের ছাড় মূল দামের চেয়ে বেশি বা ঋণাত্মক হতে পারবে না');
    }

    const [updated] = await this.db
      .update(packages)
      .set(setValue)
      .where(eq(packages.id, id))
      .returning();
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const [billItem] = await this.db.select({ id: billItems.id }).from(billItems)
      .where(eq(billItems.packageId, id)).limit(1);
    if (billItem) {
      throw new ConflictException('বিলের রেকর্ড থাকা প্যাকেজ মুছে ফেলা যাবে না');
    }
    const [deleted] = await this.db.delete(packages).where(eq(packages.id, id)).returning();
    return deleted;
  }
}
