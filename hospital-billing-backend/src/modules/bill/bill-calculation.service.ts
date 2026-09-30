import { Injectable, BadRequestException } from '@nestjs/common';
import { Money } from '../../common/utils/money.util';
import { DiscountMode } from '../../common/enums/discount-mode.enum';

export interface BillItemInput {
  unitPrice: string;
  quantity: number;
  itemDiscountPercent: string;
}

export interface BillTotals {
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
}

/**
 * Bill-এর হিসাবের একমাত্র সূত্র — এই ফাইল ছাড়া অন্য কোথাও
 * gross/discount/net হিসাব করা যাবে না। Net = Gross − Discount সবসময়।
 */
@Injectable()
export class BillCalculationService {
  validateDiscountMode(
    mode: DiscountMode,
    billDiscountPercent: string,
    items: BillItemInput[],
  ): void {
    const hasItemDiscount = items.some(
      (i) => !Money.of(i.itemDiscountPercent || '0').equals('0'),
    );
    const hasBillDiscount = !Money.of(billDiscountPercent || '0').equals('0');

    if (mode === DiscountMode.BILL && hasItemDiscount) {
      throw new BadRequestException(
        'discount_mode BILL হলে item-wise discount দেওয়া যাবে না',
      );
    }
    if (mode === DiscountMode.ITEM && hasBillDiscount) {
      throw new BadRequestException(
        'discount_mode ITEM হলে bill-wise discount percent 0 হতে হবে',
      );
    }
    if (mode === DiscountMode.NONE && (hasItemDiscount || hasBillDiscount)) {
      throw new BadRequestException(
        'discount_mode NONE হলে কোনো discount দেওয়া যাবে না',
      );
    }
  }

  computeTotals(
    mode: DiscountMode,
    billDiscountPercent: string,
    items: BillItemInput[],
  ): BillTotals {
    let gross = Money.of('0');
    let itemDiscountTotal = Money.of('0');

    for (const item of items) {
      const lineAmount = Money.of(item.unitPrice).multiply(item.quantity);
      gross = gross.add(lineAmount);
      const lineDiscount = lineAmount.percentOf(item.itemDiscountPercent || '0');
      itemDiscountTotal = itemDiscountTotal.add(lineDiscount);
    }

    let discountAmount = Money.of('0');
    if (mode === DiscountMode.BILL) {
      discountAmount = gross.percentOf(billDiscountPercent || '0');
    } else if (mode === DiscountMode.ITEM) {
      discountAmount = itemDiscountTotal;
    }

    const netAmount = gross.subtract(discountAmount);

    return {
      grossAmount: gross.toDb(),
      discountAmount: discountAmount.toDb(),
      netAmount: netAmount.toDb(),
    };
  }
}