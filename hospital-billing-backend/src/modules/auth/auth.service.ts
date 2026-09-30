import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { users } from '../../database/schema';
import { comparePassword, hashPassword } from '../../common/utils/hash.util';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('এই username পাওয়া যায়নি');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('এই অ্যাকাউন্টটি নিষ্ক্রিয়। অ্যাডমিনের সঙ্গে যোগাযোগ করুন।');
    }

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('পাসওয়ার্ড ভুল হয়েছে');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new UnauthorizedException('ইউজার পাওয়া যায়নি');

    const isMatch = await comparePassword(dto.oldPassword, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('পুরনো পাসওয়ার্ড ভুল');

    const newHash = await hashPassword(dto.newPassword);
    await this.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

    return { message: 'পাসওয়ার্ড বদলানো হয়েছে' };
  }
}
