/**
 * Convert numeric monetary amount into Bangladesh Taka words format.
 * e.g., 5000 -> "Five Thousand Taka Only"
 *       125000 -> "One Lakh Twenty-Five Thousand Taka Only"
 */

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n) {
  let str = "";
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + (n % 10 > 0 ? "-" + ones[n % 10] : "") + " ";
  } else if (n > 0) {
    str += ones[n] + " ";
  }
  return str.trim();
}

export function numberToWordsBDT(amount) {
  const num = Math.round(Number(amount || 0));
  if (num === 0) return "Zero Taka Only";

  let remaining = num;
  let result = "";

  // Crore (10,000,000)
  if (remaining >= 10000000) {
    const crore = Math.floor(remaining / 10000000);
    result += convertBelowThousand(crore) + " Crore ";
    remaining %= 10000000;
  }

  // Lakh (100,000)
  if (remaining >= 100000) {
    const lakh = Math.floor(remaining / 100000);
    result += convertBelowThousand(lakh) + " Lakh ";
    remaining %= 100000;
  }

  // Thousand (1,000)
  if (remaining >= 1000) {
    const thousand = Math.floor(remaining / 1000);
    result += convertBelowThousand(thousand) + " Thousand ";
    remaining %= 1000;
  }

  // Remainder
  if (remaining > 0) {
    result += convertBelowThousand(remaining) + " ";
  }

  return (result.trim() + " Taka Only").replace(/\s+/g, " ");
}

export default numberToWordsBDT;

