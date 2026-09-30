import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { users } from '../../database/schema';
import { hashPassword } from '../../common/utils/hash.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class UserService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(dto: CreateUserDto) {
    const [existing] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);
    if (existing) throw new ConflictException('এই ইউজারনেম আগে থেকেই আছে');

    const passwordHash = await hashPassword(dto.password);
    const [created] = await this.db
      .insert(users)
      .values({
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
      })
      .returning();

    const { passwordHash: _, ...safe } = created;
    return safe;
  }

  async findAll() {
    const all = await this.db.select().from(users);
    return all.map(({ passwordHash, ...rest }: any) => rest);
  }

  async findPage({ page, pageSize }: PageQueryDto) {
    const [all, [{ total }]] = await Promise.all([
      this.db.select().from(users).orderBy(users.id).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(users),
    ]);
    return { items: all.map(({ passwordHash, ...rest }: any) => rest), total, page, pageSize };
  }

  async findOne(id: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new NotFoundException('ইউজার পাওয়া যায়নি');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(users)
      .set(dto)
      .where(eq(users.id, id))
      .returning();
    const { passwordHash, ...safe } = updated;
    return safe;
  }

  async deactivate(id: number) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning();
    const { passwordHash, ...safe } = updated;
    return safe;
  }
}
