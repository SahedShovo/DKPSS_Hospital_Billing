import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * টাকা নিয়ে যেকোনো হিসাব (+, -, *, %) এই ফাইল দিয়েই করতে হবে।
 * কখনো `Number()` দিয়ে সরাসরি JS number-এ টাকা নিয়ে হিসাব করা যাবে না —
 * floating point ভুল আসতে পারে (যেমন 0.1 + 0.2 = 0.30000000000000004)।
 * DB-তে সবসময় numeric string হিসেবে যাবে।
 */
export class Money {
  private value: Decimal;

  constructor(input: string | number | Decimal) {
    this.value = new Decimal(input);
  }

  static of(input: string | number | Decimal): Money {
    return new Money(input);
  }

  add(other: string | number | Money): Money {
    const v = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.plus(v));
  }

  subtract(other: string | number | Money): Money {
    const v = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.minus(v));
  }

  multiply(other: string | number | Money): Money {
    const v = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.times(v));
  }

  percentOf(percent: string | number): Money {
    // this.value এর percent% বের করে
    return new Money(this.value.times(new Decimal(percent)).dividedBy(100));
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isGreaterThan(other: string | number | Money): boolean {
    const v = other instanceof Money ? other.value : new Decimal(other);
    return this.value.greaterThan(v);
  }

  isLessThan(other: string | number | Money): boolean {
    const v = other instanceof Money ? other.value : new Decimal(other);
    return this.value.lessThan(v);
  }

  equals(other: string | number | Money): boolean {
    const v = other instanceof Money ? other.value : new Decimal(other);
    return this.value.equals(v);
  }

  /** DB-তে save করার জন্য — সবসময় ২ ঘর দশমিক */
  toDb(): string {
    return this.value.toFixed(2);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}