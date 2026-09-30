import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { billItems, tests } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class TestService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(dto: CreateTestDto, updatedBy: number) {
    const [existing] = await this.db
      .select()
      .from(tests)
      .where(eq(tests.name, dto.name))
      .limit(1);
    if (existing) throw new ConflictException('এই টেস্টের নাম আগে থেকেই আছে');

    const [created] = await this.db
      .insert(tests)
      .values({
        name: dto.name,
        price: Money.of(dto.price).toDb(),
        updatedBy,
      })
      .returning();
    return created;
  }

  async findAll() {
    return this.db.select().from(tests).orderBy(tests.id);
  }

  async findPage({ page, pageSize }: PageQueryDto) {
    const [items, [{ total }]] = await Promise.all([
      this.db.select().from(tests).orderBy(tests.id).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(tests),
    ]);
    return { items, total, page, pageSize };
  }

  async findActive() {
    return this.db.select().from(tests).where(eq(tests.isActive, true));
  }

  async findOne(id: number) {
    const [test] = await this.db.select().from(tests).where(eq(tests.id, id)).limit(1);
    if (!test) throw new NotFoundException('টেস্ট পাওয়া যায়নি');
    return test;
  }

  async update(id: number, dto: UpdateTestDto, updatedBy: number) {
    await this.findOne(id);
    const setValue: any = { updatedBy, updatedAt: new Date() };
    if (dto.name !== undefined) setValue.name = dto.name;
    if (dto.price !== undefined) setValue.price = Money.of(dto.price).toDb();
    if (dto.isActive !== undefined) setValue.isActive = dto.isActive;

    const [updated] = await this.db
      .update(tests)
      .set(setValue)
      .where(eq(tests.id, id))
      .returning();
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const [billItem] = await this.db.select({ id: billItems.id }).from(billItems)
      .where(eq(billItems.testId, id)).limit(1);
    if (billItem) {
      throw new ConflictException('বিলের রেকর্ড থাকা টেস্ট মুছে ফেলা যাবে না');
    }
    const [deleted] = await this.db.delete(tests).where(eq(tests.id, id)).returning();
    return deleted;
  }
}
