import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ShiftService } from '../../modules/shift/shift.service';

@Injectable()
export class ActiveShiftGuard implements CanActivate {
  constructor(private shiftService: ShiftService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('লগইন করা নেই');

    const shift = await this.shiftService.getOpenShiftForUser(user.id);
    if (!shift) {
      throw new ForbiddenException('Shift চালু নেই — আগে Shift Open করুন');
    }
    request.shift = shift; // পরে CurrentShift() decorator দিয়ে এটা বের করা হবে
    return true;
  }
}