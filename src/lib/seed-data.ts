// Port dari database/seeders/DatabaseSeeder.php (10 produk demo warung Borobudur)
import type { ProductInput } from "./repo/products";

export const demoStore = {
  name: "Warung Bu Sari",
  owner_name: "Bu Sari",
  pin: "1234",
};

export const demoProducts: ProductInput[] = [
  { name: "Indomie Goreng", price: 3500, cost_price: 2800, stock: 50, min_stock: 10, unit: "pcs" },
  { name: "Gula Pasir 1kg", price: 15000, cost_price: 13000, stock: 20, min_stock: 5, unit: "kg" },
  { name: "Minyak Goreng 1L", price: 18000, cost_price: 15500, stock: 15, min_stock: 5, unit: "liter" },
  { name: "Kopi Kapal Api Sachet", price: 2500, cost_price: 1800, stock: 100, min_stock: 20, unit: "pcs" },
  { name: "Aqua Botol 600ml", price: 4000, cost_price: 2500, stock: 30, min_stock: 10, unit: "botol" },
  { name: "Miniatur Stupa Borobudur", price: 35000, cost_price: 20000, stock: 10, min_stock: 3, unit: "pcs" },
  { name: "Kaos Borobudur", price: 75000, cost_price: 45000, stock: 8, min_stock: 2, unit: "pcs" },
  { name: "Gantungan Kunci Candi", price: 10000, cost_price: 4000, stock: 25, min_stock: 5, unit: "pcs" },
  { name: "Tempe Mendoan", price: 5000, cost_price: 2500, stock: 20, min_stock: 5, unit: "porsi" },
  { name: "Es Teh Manis", price: 5000, cost_price: 2000, stock: 999, min_stock: 0, unit: "gelas" },
];
