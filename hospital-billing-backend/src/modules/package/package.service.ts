import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(dto: CreatePackageDto, createdBy: number) {
    const [existing] = await this.db
      .select()
      .from(packages)
      .where(eq(packages.name, dto.name))
      .limit(1);
    if (existing) throw new ConflictException('এই প্যাকেজের নাম আগে থেকেই আছে');

    const [created] = await this.db
      .insert(packages)
      .values({
        name: dto.name,
        packagePrice: dto.packagePrice ? Money.of(dto.packagePrice).toDb() : null,
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

    return { ...created, items: insertedItems };
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
    const items = rows.map((pkg: any) => {
      const items = byPackage.get(pkg.id) ?? [];
      const sum = items.reduce((total, item) => total.add(item.amount), Money.of('0'));
      return { ...pkg, items, effectivePrice: pkg.packagePrice ?? sum.toDb() };
    });
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
    return activePackages.map((pkg: typeof activePackages[number]) => {
      const items = itemsByPackage.get(pkg.id) ?? [];
      let total = Money.of('0');
      for (const item of items) total = total.add(item.amount);
      return { ...pkg, items, effectivePrice: pkg.packagePrice ?? total.toDb() };
    });
  }

  async findOne(id: number) {
    const [pkg] = await this.db.select().from(packages).where(eq(packages.id, id)).limit(1);
    if (!pkg) throw new NotFoundException('প্যাকেজ পাওয়া যায়নি');

    const items = await this.db
      .select()
      .from(packageItems)
      .where(eq(packageItems.packageId, id));

    // package_price না থাকলে item-গুলোর যোগফলই আসল দাম
    let effectivePrice = pkg.packagePrice;
    if (!effectivePrice) {
      let total = Money.of('0');
      for (const item of items) total = total.add(item.amount);
      effectivePrice = total.toDb();
    }

    return { ...pkg, items, effectivePrice };
  }

  async update(id: number, dto: UpdatePackageDto) {
    await this.findOne(id);
    const setValue: any = {};
    if (dto.name !== undefined) setValue.name = dto.name;
    if (dto.packagePrice !== undefined) setValue.packagePrice = dto.packagePrice === null ? null : Money.of(dto.packagePrice).toDb();
    if (dto.isActive !== undefined) setValue.isActive = dto.isActive;

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
