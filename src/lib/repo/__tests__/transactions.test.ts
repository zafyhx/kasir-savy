import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db";
import { createProduct } from "../products";
import { createSale, SaleError, voidTransaction } from "../transactions";

const STORE_ID = 1;

beforeEach(async () => {
  await db.products.clear();
  await db.transactions.clear();
  await db.transactionItems.clear();
});

describe("createSale — integritas stok", () => {
  it("tidak oversell saat banyak transaksi rebutan stok terbatas secara bersamaan", async () => {
    const product = await createProduct(STORE_ID, {
      name: "Es Teh",
      price: 5000,
      cost_price: 2000,
      stock: 5,
      min_stock: 0,
      unit: "gelas",
    });

    // 10 "kasir" mencoba membeli 1 unit secara bersamaan, stok cuma 5.
    const attempts = Array.from({ length: 10 }, () =>
      createSale(STORE_ID, {
        items: [{ product_id: product.id, quantity: 1 }],
        payment_amount: 5000,
      }).then(
        () => "ok" as const,
        () => "fail" as const,
      ),
    );

    const results = await Promise.all(attempts);
    const successCount = results.filter((r) => r === "ok").length;
    const failCount = results.filter((r) => r === "fail").length;

    expect(successCount).toBe(5);
    expect(failCount).toBe(5);

    const finalProduct = await db.products.get(product.id);
    expect(finalProduct?.stock).toBe(0);

    const transactions = await db.transactions.where("store_id").equals(STORE_ID).toArray();
    expect(transactions).toHaveLength(5);
  });

  it("menolak transaksi jika stok tidak cukup dan tidak mengubah stok", async () => {
    const product = await createProduct(STORE_ID, {
      name: "Kopi Sachet",
      price: 2500,
      cost_price: 1800,
      stock: 2,
      min_stock: 0,
      unit: "pcs",
    });

    await expect(
      createSale(STORE_ID, {
        items: [{ product_id: product.id, quantity: 3 }],
        payment_amount: 10000,
      }),
    ).rejects.toBeInstanceOf(SaleError);

    const unchanged = await db.products.get(product.id);
    expect(unchanged?.stock).toBe(2);
  });

  it("menolak jika uang bayar kurang dari total belanja", async () => {
    const product = await createProduct(STORE_ID, {
      name: "Indomie",
      price: 3500,
      cost_price: 2800,
      stock: 10,
      min_stock: 0,
      unit: "pcs",
    });

    await expect(
      createSale(STORE_ID, {
        items: [{ product_id: product.id, quantity: 2 }],
        payment_amount: 5000, // total 7000, kurang
      }),
    ).rejects.toThrow(/Uang bayar kurang/);
  });
});

describe("voidTransaction — pengembalian stok", () => {
  it("mengembalikan stok dan menandai voided_at saat transaksi dibatalkan", async () => {
    const product = await createProduct(STORE_ID, {
      name: "Gula Pasir",
      price: 15000,
      cost_price: 13000,
      stock: 20,
      min_stock: 5,
      unit: "kg",
    });

    const sale = await createSale(STORE_ID, {
      items: [{ product_id: product.id, quantity: 3 }],
      payment_amount: 45000,
    });

    let afterSale = await db.products.get(product.id);
    expect(afterSale?.stock).toBe(17);

    await voidTransaction(STORE_ID, sale.id);

    afterSale = await db.products.get(product.id);
    expect(afterSale?.stock).toBe(20);

    const voided = await db.transactions.get(sale.id);
    expect(voided?.voided_at).not.toBeNull();
  });

  it("menolak void ganda pada transaksi yang sudah dibatalkan", async () => {
    const product = await createProduct(STORE_ID, {
      name: "Minyak Goreng",
      price: 18000,
      cost_price: 15500,
      stock: 10,
      min_stock: 5,
      unit: "liter",
    });

    const sale = await createSale(STORE_ID, {
      items: [{ product_id: product.id, quantity: 1 }],
      payment_amount: 18000,
    });

    await voidTransaction(STORE_ID, sale.id);

    await expect(voidTransaction(STORE_ID, sale.id)).rejects.toThrow(/sudah dibatalkan/);
  });
});
