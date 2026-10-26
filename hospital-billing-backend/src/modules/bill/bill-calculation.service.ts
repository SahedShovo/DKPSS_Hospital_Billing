import { Injectable, BadRequestException } from '@nestjs/common';
import { Money } from '../../common/utils/money.util';
import { DiscountMode } from '../../common/enums/discount-mode.enum';

export interface BillItemInput {
  unitPrice: string;
  quantity: number;
  itemDiscountAmount: string;
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
    billDiscountAmount: string,
    items: BillItemInput[],
  ): void {
    const hasItemDiscount = items.some(
      (i) => !Money.of(i.itemDiscountAmount || '0').equals('0'),
    );
    const hasBillDiscount = !Money.of(billDiscountAmount || '0').equals('0');

    if (mode === DiscountMode.BILL && hasItemDiscount) {
      throw new BadRequestException(
        'পুরো বিলের ছাড় দিলে আইটেমভিত্তিক ছাড় দেওয়া যাবে না',
      );
    }
    if (mode === DiscountMode.ITEM && hasBillDiscount) {
      throw new BadRequestException(
        'আইটেমভিত্তিক ছাড় দিলে পুরো বিলের ছাড় 0 হতে হবে',
      );
    }
    if (mode === DiscountMode.NONE && (hasItemDiscount || hasBillDiscount)) {
      throw new BadRequestException(
        'ছাড়ের ধরন NONE হলে কোনো ছাড় দেওয়া যাবে না',
      );
    }
    if (
      Money.of(billDiscountAmount || '0').isNegative() ||
      items.some((i) => Money.of(i.itemDiscountAmount || '0').isNegative())
    ) {
      throw new BadRequestException('ছাড়ের পরিমাণ ঋণাত্মক হতে পারবে না');
    }
  }

  computeTotals(
    mode: DiscountMode,
    billDiscountAmount: string,
    items: BillItemInput[],
  ): BillTotals {
    let gross = Money.of('0');
    let itemDiscountTotal = Money.of('0');

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException('প্রতিটি বিল আইটেমের সংখ্যা অন্তত ১ হতে হবে');
      }
      const unitPrice = Money.of(item.unitPrice);
      if (unitPrice.isNegative()) {
        throw new BadRequestException('বিল আইটেমের দাম ঋণাত্মক হতে পারবে না');
      }
      const lineAmount = unitPrice.multiply(item.quantity);
      gross = gross.add(lineAmount);
      const lineDiscount = Money.of(item.itemDiscountAmount || '0');
      if (lineDiscount.isGreaterThan(lineAmount)) {
        throw new BadRequestException('আইটেমের ছাড় ওই আইটেমের দামের চেয়ে বেশি হতে পারবে না');
      }
      itemDiscountTotal = itemDiscountTotal.add(lineDiscount);
    }

    let discountAmount = Money.of('0');
    if (mode === DiscountMode.BILL) {
      discountAmount = Money.of(billDiscountAmount || '0');
      if (discountAmount.isGreaterThan(gross)) {
        throw new BadRequestException('বিলের ছাড় মোট দামের চেয়ে বেশি হতে পারবে না');
      }
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
