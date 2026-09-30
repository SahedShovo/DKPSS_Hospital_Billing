import { IsString, IsEnum, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @IsString()
  username !: string;

  @IsString()
  @MinLength(6)
  password !: string;

  @IsString()
  fullName !: string;

  @IsEnum(Role)
  role !: Role;
}