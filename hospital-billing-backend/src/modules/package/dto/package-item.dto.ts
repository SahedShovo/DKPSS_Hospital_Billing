import { IsString, IsEnum, IsNumberString } from 'class-validator';
import { ItemType } from '../../../common/enums/item-type.enum';

export class PackageItemDto {
  @IsEnum(ItemType)
  itemType!: ItemType;

  @IsString()
  itemName!: string;

  @IsNumberString()
  amount!: string;
}