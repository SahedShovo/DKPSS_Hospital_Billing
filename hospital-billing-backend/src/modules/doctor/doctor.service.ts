import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { billItems, doctors } from '../../database/schema';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class DoctorService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(dto: CreateDoctorDto, createdBy: number) {
    const [created] = await this.db
      .insert(doctors)
      .values({ name: dto.name, createdBy })
      .returning();
    return created;
  }

  async findAll() {
    return this.db.select().from(doctors).orderBy(doctors.id);
  }

  async findPage({ page, pageSize }: PageQueryDto) {
    const [items, [{ total }]] = await Promise.all([
      this.db.select().from(doctors).orderBy(doctors.id).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(doctors),
    ]);
    return { items, total, page, pageSize };
  }

  async findActive() {
    return this.db.select().from(doctors).where(eq(doctors.isActive, true));
  }

  async findOne(id: number) {
    const [doctor] = await this.db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    if (!doctor) throw new NotFoundException('ডাক্তার পাওয়া যায়নি');
    return doctor;
  }

  async update(id: number, dto: UpdateDoctorDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(doctors)
      .set(dto)
      .where(eq(doctors.id, id))
      .returning();
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const [billItem] = await this.db
      .select({ id: billItems.id })
      .from(billItems)
      .where(eq(billItems.doctorId, id))
      .limit(1);

    if (billItem) {
      throw new ConflictException('বিলের রেকর্ড থাকা ডাক্তার মুছে ফেলা যাবে না');
    }

    const [deletedDoctor] = await this.db
      .delete(doctors)
      .where(eq(doctors.id, id))
      .returning();
    return deletedDoctor;
  }
}
