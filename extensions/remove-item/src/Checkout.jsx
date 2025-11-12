import { useEffect, useRef } from "react";
import {
  reactExtension,
  useCartLines,
  useApplyCartLinesChange,
  useTotalAmount,
  useCurrency,
  useStorage,
} from "@shopify/ui-extensions-react/checkout";

const BASE_THRESHOLD_USD = 299;
const CURRENCY_RATES = {
  USD: 1,
  EUR: 1,
  GBP: 0.79,
  AFN: 70.1556,
  ALL: 84.53505,
  DZD: 132.0339,
  XCD: 2.741964,
  AWG: 1.8258,
  SHP: 0.75601074,
  AUD: 1.5490128,
  AZN: 1.7336532,
  BSD: 1.02,
  BDT: 124.6644,
  BBD: 2.0298,
  BZD: 2.04,
  XOF: 569.21916,
  BOB: 7.064928,
  BAM: 1.7021454,
  BWP: 14.194116,
  BND: 1.3041108,
  BGN: 1.6938324,
  BIF: 3036.6114,
  KHR: 4089.0372,
  XAF: 569.78832,
  CAD: 1.3924734,
  CVE: 96.11919,
  KYD: 0.84850434,
  CNY: 7.306464,
  KMF: 426.78432,
  CDF: 2964.9768,
  NZD: 1.6920066,
  CRC: 514.96536,
  ANG: 1.8378768,
  CZK: 21.325548,
  DKK: 6.484191,
  DJF: 181.152,
  DOP: 61.80078,
  EGP: 50.043138,
  ETB: 141.97482,
  FKP: 0.7552131,
  FJD: 2.285055,
  XPF: 103.785,
  GMD: 73.5726,
  GTQ: 7.8264804,
  GNF: 8828.1102,
  GYD: 213.35034,
  HNL: 26.702988,
  HKD: 8.00649,
  HUF: 344.76306,
  ISK: 123.52506,
  INR: 88.240404,
  IDR: 16639.362,
  ILS: 3.4188768,
  JMD: 163.47642,
  JPY: 150.16134,
  KZT: 553.93854,
  KES: 131.7534,
  KGS: 89.097612,
  LAK: 21986.1,
  LBP: 91290.0,
  CHF: 0.81206382,
  MOP: 8.2544622,
  MWK: 1768.6902,
  MYR: 4.3042368,
  MVR: 15.766038,
  MUR: 46.164282,
  MDL: 17.144772,
  MNT: 3659.0358,
  MAD: 9.1579884,
  MMK: 3692.4,
  NPR: 141.1119,
  NIO: 37.356786,
  NGN: 1567.842,
  MKD: 53.953512,
  PKR: 290.96214,
  PGK: 4.2894366,
  PYG: 7637.9436,
  PEN: 3.61692,
  PHP: 57.985266,
  PLN: 3.6955722,
  QAR: 3.7188486,
  RON: 4.4041866,
  RWF: 1472.8596,
  WST: 2.794596,
  STD: 21231.912,
  SAR: 3.8265504,
  RSD: 101.793144,
  SLL: 23254.266,
  SGD: 1.3053246,
  SBD: 8.344671,
  KRW: 1405.4376,
  LKR: 307.73604,
  SEK: 9.7347984,
  TWD: 30.022986,
  TJS: 9.7164588,
  TZS: 2621.4,
  THB: 32.982108,
  TOP: 2.421225,
  TTD: 6.9035334,
  UGX: 3659.097,
  UAH: 42.598158,
  AED: 3.746256,
  UYU: 40.855692,
  UZS: 12909.018,
  VUV: 121.94304,
  VND: 26661.474,
  YER: 245.6568,
};

function getCurrencyThreshold(currencyCode) {
  const rate = CURRENCY_RATES[currencyCode] || 1;
  return BASE_THRESHOLD_USD * rate;
}

export default reactExtension(
  "purchase.checkout.cart-line-list.render-after",
  () => <Extension />
);

function Extension() {
  const cartLines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const totalAmount = useTotalAmount();
  const currency = useCurrency();
  const storage = useStorage();
  const processingRef = useRef(false);

  useEffect(() => {
    async function manageFreeGifts() {
      if (processingRef.current || !cartLines) return;
      processingRef.current = true;

      const currencyCode = currency || "USD";
      const threshold = getCurrencyThreshold(currencyCode);
      const cartTotal = totalAmount?.amount
        ? parseFloat(totalAmount.amount)
        : 0;

      const freeGiftLines = cartLines.filter((line) =>
        line.attributes?.some(
          (attr) => attr.key === "__free_gift" && attr.value === "true"
        )
      );

      // console.log('freeGiftLines====',freeGiftLines);

      const stored = (await storage.read("removedFreeGifts")) || [];

      if (cartTotal < threshold && freeGiftLines.length > 0) {
        const removedItems = freeGiftLines.map((line) => ({
          merchandiseId: line.merchandise?.id,
          quantity: line.quantity,
          attributes: [{ key: "__free_gift", value: "true" }],
        }));
        for (const line of freeGiftLines) {
          await applyCartLinesChange({
            type: "removeCartLine",
            id: line.id,
            quantity: line.quantity,
          });
        }
        await storage.write("removedFreeGifts", removedItems);
      } else if (cartTotal >= threshold && stored.length > 0) {
        // const existingIds = new Set(cartLines.map(line => line.merchandise?.id));
        const existingFreeGiftIds = new Set(
          cartLines
            .filter((line) =>
              line.attributes?.some(
                (attr) => attr.key === "__free_gift" && attr.value === "true"
              )
            )
            .map((line) => line.merchandise?.id)
        );

        const toAdd = stored.filter(
          (item) => !existingFreeGiftIds.has(item.merchandiseId)
        );

        for (const item of toAdd) {
          const result = await applyCartLinesChange({
            type: "addCartLine",
            merchandiseId: item.merchandiseId,
            quantity: item.quantity || 1,
            attributes: item.attributes || [
              { key: "__free_gift", value: "true" },
            ],
          });

          // if (result.type === "error") {
          //       console.error("Error re-adding free gift:", result.message);
          //     } else {
          //       console.log("✅ Re-added:", item.title);
          //     }
        }
        // Always clear storage after attempting to re-add
        await storage.delete("removedFreeGifts");
      }
      processingRef.current = false;
    }

    manageFreeGifts();
  }, [cartLines, totalAmount, currency, applyCartLinesChange, storage]);

  return null;
}
