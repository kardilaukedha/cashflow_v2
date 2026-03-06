export interface SkuItem {
  kode: string;
  nama: string;
  kategori: string;
  cbp: number;
}

export interface SkuWithQty extends SkuItem {
  qty: number;
}

export const SKU_LIST: SkuItem[] = [
  { kode: 'RTS',    nama: 'Roti Tawar Special',                      kategori: 'Roti Tawar',          cbp: 15000 },
  { kode: 'RTG',    nama: 'Roti Tawar Gandum',                       kategori: 'Roti Tawar',          cbp: 18000 },
  { kode: 'RTPDM',  nama: 'Roti Tawar Pandan Manis',                 kategori: 'Roti Tawar',          cbp: 18000 },
  { kode: 'RCC',    nama: 'Roti Tawar Choco Chip',                   kategori: 'Roti Tawar',          cbp: 19000 },
  { kode: 'RTKL',   nama: 'Roti Tawar Klasik',                       kategori: 'Roti Tawar',          cbp: 12500 },
  { kode: 'RKU',    nama: 'Roti Tawar Kupas',                        kategori: 'Roti Tawar',          cbp: 6000  },
  { kode: 'RJKU',   nama: 'Roti Jumbo Tawar Kupas',                  kategori: 'Roti Tawar',          cbp: 21000 },
  { kode: 'DOP',    nama: 'Roti Tawar Doble Soft F',                 kategori: 'Roti Tawar',          cbp: 14500 },
  { kode: 'DOM',    nama: 'Roti Tawar Doble Soft',                   kategori: 'Roti Tawar',          cbp: 20500 },
  { kode: 'RTJS',   nama: 'Roti Tawar Jumbo Spesial',                kategori: 'Roti Tawar',          cbp: 18000 },
  { kode: 'RJMS',   nama: 'Roti Jumbo Milk Soft',                    kategori: 'Roti Tawar',          cbp: 17500 },

  { kode: 'SCC',    nama: 'Sandwich Coklat',                         kategori: 'Sandwich',            cbp: 6000  },
  { kode: 'SAB',    nama: 'Sandwich Blueberry',                      kategori: 'Sandwich',            cbp: 6000  },
  { kode: 'SAP',    nama: 'Sandwich Krim Peanut',                    kategori: 'Sandwich',            cbp: 6000  },
  { kode: 'SKI',    nama: 'Sandwich Keju',                           kategori: 'Sandwich',            cbp: 6000  },
  { kode: 'SMG',    nama: 'Sandwich Margarin Gula',                  kategori: 'Sandwich',            cbp: 6000  },
  { kode: 'SSM',    nama: 'Sandwich Pandan Sarikaya',                kategori: 'Sandwich',            cbp: 6000  },
  { kode: 'SCB',    nama: 'Sandwich Choco Blast',                    kategori: 'Sandwich',            cbp: 6000  },

  { kode: 'ZSCCK',  nama: 'Zupper Sandwich Krim Coklat',             kategori: 'Zupper Sandwich',     cbp: 5000  },
  { kode: 'ZSCMK',  nama: 'Zupper Sandwich Krim Moka',               kategori: 'Zupper Sandwich',     cbp: 5000  },
  { kode: 'ZSCS',   nama: 'Zupper Sandwich Creamy Sweet',            kategori: 'Zupper Sandwich',     cbp: 5000  },
  { kode: 'ZSCST',  nama: 'Zuper Sandwich Krim Strawberry',          kategori: 'Zupper Sandwich',     cbp: 5000  },

  { kode: 'ICK GT', nama: 'Choco Bun',                               kategori: 'Bun & Sobek',         cbp: 4000  },
  { kode: 'ICZ GT', nama: 'Cheese Bun',                              kategori: 'Bun & Sobek',         cbp: 4000  },
  { kode: 'ICE',    nama: 'Sweet Cheese Bun',                        kategori: 'Bun & Sobek',         cbp: 4000  },
  { kode: 'IST',    nama: 'Blueberry Bun GT',                        kategori: 'Bun & Sobek',         cbp: 4000  },
  { kode: 'IBL',    nama: 'Blueberry Bun',                           kategori: 'Bun & Sobek',         cbp: 4000  },
  { kode: 'ICO',    nama: 'Coconut Bun GT',                          kategori: 'Bun & Sobek',         cbp: 4000  },
  { kode: 'TOC',    nama: 'Roti Sobek Coklat Coklat',                kategori: 'Bun & Sobek',         cbp: 18000 },
  { kode: 'TCC',    nama: 'Roti Sobek Coklat Meses',                 kategori: 'Bun & Sobek',         cbp: 18000 },
  { kode: 'TCS',    nama: 'Roti Sobek Coklat Sarikaya',              kategori: 'Bun & Sobek',         cbp: 18000 },
  { kode: 'TST',    nama: 'Roti Sobek Coklat Strawberry',            kategori: 'Bun & Sobek',         cbp: 18000 },
  { kode: 'TCB',    nama: 'Roti Sobek Coklat Blueberry',             kategori: 'Bun & Sobek',         cbp: 13500 },
  { kode: 'TCBIII', nama: 'Roti Sobek Krim Meses',                   kategori: 'Bun & Sobek',         cbp: 13500 },
  { kode: 'TDST',   nama: 'Sobek Duo Strawberry',                    kategori: 'Bun & Sobek',         cbp: 11000 },
  { kode: 'TDCB',   nama: 'Sobek Duo Blueberry',                     kategori: 'Bun & Sobek',         cbp: 11000 },
  { kode: 'TDOC',   nama: 'Sobek Duo Cokelat',                       kategori: 'Bun & Sobek',         cbp: 8500  },
  { kode: 'TDSA',   nama: 'Sobek Duo Sarikaya',                      kategori: 'Bun & Sobek',         cbp: 8000  },
  { kode: 'KBC',    nama: 'Klasik Bantal Sweet Cheese',              kategori: 'Bun & Sobek',         cbp: 8500  },
  { kode: 'RMNS',   nama: 'Roti Mini Strawberry',                    kategori: 'Bun & Sobek',         cbp: 8000  },
  { kode: 'BUR',    nama: 'Burgerbun',                               kategori: 'Bun & Sobek',         cbp: 11000 },
  { kode: 'SRPL',   nama: 'Plain Rolls',                             kategori: 'Bun & Sobek',         cbp: 11000 },

  { kode: 'SCM',    nama: 'Roti Krim Cokelat Meses',                 kategori: 'Roti Krim',           cbp: 5000  },
  { kode: 'SCCIII', nama: 'Roti Creamy Cokelat Meses',               kategori: 'Roti Krim',           cbp: 5000  },
  { kode: 'SCVIII', nama: 'Roti Krim Coklat',                        kategori: 'Roti Krim',           cbp: 5000  },
  { kode: 'SCCJII', nama: 'Roti Krim Keju',                          kategori: 'Roti Krim',           cbp: 5000  },
  { kode: 'SRMIII', nama: 'Roti Krim Moca',                          kategori: 'Roti Krim',           cbp: 5000  },

  { kode: 'ZCRCK',  nama: 'Zuperr Creamy Choco Double Choco',        kategori: 'Zuperr Creamy',       cbp: 5000  },
  { kode: 'ZCRCR',  nama: 'Zuperr Creamy Choco Choco Berry',         kategori: 'Zuperr Creamy',       cbp: 5000  },
  { kode: 'ZCRCB',  nama: 'Zuperr Creamy Choco Choco Banana',        kategori: 'Zuperr Creamy',       cbp: 5000  },
  { kode: 'SRS',    nama: 'Roti Sandroll Zuperr Creamy Strawberry',  kategori: 'Zuperr Creamy',       cbp: 5000  },

  { kode: 'DCS',    nama: 'Dorayaki Si Coklat',                      kategori: 'Dorayaki',            cbp: 7500  },
  { kode: 'DCP',    nama: 'Dorayaki Choco Peanut',                   kategori: 'Dorayaki',            cbp: 7500  },
  { kode: 'DCH',    nama: 'Dorayaki Hokkaido Cheese',                kategori: 'Dorayaki',            cbp: 7500  },
  { kode: 'DHF',    nama: 'Dorayaki Honey Flavor',                   kategori: 'Dorayaki',            cbp: 7500  },
  { kode: 'DSK',    nama: 'Dorayaki Sarikaya',                       kategori: 'Dorayaki',            cbp: 5500  },
  { kode: 'DMT',    nama: 'Dorayaki Martabak',                       kategori: 'Dorayaki',            cbp: 6000  },
  { kode: 'DPS',    nama: 'Dorayaki Pandan Sarikaya',                kategori: 'Dorayaki',            cbp: 6000  },
  { kode: 'DNS',    nama: 'Dorayaki Nastar',                         kategori: 'Dorayaki',            cbp: 6000  },

  { kode: 'RKJ',    nama: 'Roti Kasur Keju',                         kategori: 'Roti Kasur & Sisir',  cbp: 14000 },
  { kode: 'RSM',    nama: 'Roti Sisir Mentega',                      kategori: 'Roti Kasur & Sisir',  cbp: 11000 },
  { kode: 'RKS',    nama: 'Roti Kasur Susu',                         kategori: 'Roti Kasur & Sisir',  cbp: 11000 },

  { kode: 'CCC',    nama: 'Chiffon Cake Coklat',                     kategori: 'Cake',                cbp: 25000 },
  { kode: 'CCP',    nama: 'Chiffon Cake Pandan',                     kategori: 'Cake',                cbp: 25000 },
  { kode: 'MCP VI', nama: 'Mini Cupcake Vanilla Coconut Isi 6',      kategori: 'Cake',                cbp: 22000 },
  { kode: 'KAOF',   nama: 'Kastela Original Family',                 kategori: 'Cake',                cbp: 255000},
  { kode: 'KAOM',   nama: 'Kastela Original Medium',                 kategori: 'Cake',                cbp: 105000},
  { kode: 'BKV',    nama: 'Bolu Kukus Putih Vanilla',                kategori: 'Cake',                cbp: 12500 },
  { kode: 'BMO',    nama: 'Bolu Mini Original',                      kategori: 'Cake',                cbp: 5000  },
  { kode: 'WFO',    nama: 'Waffle Original',                         kategori: 'Cake',                cbp: 5000  },

  { kode: 'LSPO',   nama: 'Lapis Surabaya Premium Original',         kategori: 'Lapis Surabaya',      cbp: 12500 },
  { kode: 'LSPK',   nama: 'Lapis Surabaya Premium Keju',             kategori: 'Lapis Surabaya',      cbp: 12500 },
  { kode: 'LSPP',   nama: 'Lapis Surabaya Premium Pandan',           kategori: 'Lapis Surabaya',      cbp: 12500 },
  { kode: 'LSPM',   nama: 'Lapis Surabaya Premium Moca',             kategori: 'Lapis Surabaya',      cbp: 12500 },

  { kode: 'SCCP',   nama: 'Soft Cake Putu Pandan',                   kategori: 'Soft Cake',           cbp: 9500  },
  { kode: 'SCPI',   nama: 'Soft Cake Pisang Ijo',                    kategori: 'Soft Cake',           cbp: 9500  },
  { kode: 'SCET',   nama: 'Soft Cake Es Teler',                      kategori: 'Soft Cake',           cbp: 9500  },
  { kode: 'SCGA',   nama: 'Soft Cake Gula Aren',                     kategori: 'Soft Cake',           cbp: 9500  },
  { kode: 'SCPSM',  nama: 'Soft Cake Pandan Salted Caramel Mocca',   kategori: 'Soft Cake',           cbp: 9500  },

  { kode: 'STCS',   nama: 'Steam Cheese Cake Strawberry',            kategori: 'Steam Cheese Cake',  cbp: 9500  },
  { kode: 'STCC',   nama: 'Steam Cheese Cake',                       kategori: 'Steam Cheese Cake',  cbp: 9500  },
  { kode: 'STCK',   nama: 'Steam Cheese Cake Cokelat',               kategori: 'Steam Cheese Cake',  cbp: 9500  },
  { kode: 'STCB',   nama: 'Steam Cheese Cake Banana',                kategori: 'Steam Cheese Cake',  cbp: 9500  },
  { kode: 'STCTM',  nama: 'Steam Cheese Cake Tiramisu',              kategori: 'Steam Cheese Cake',  cbp: 9500  },
  { kode: 'STCBA',  nama: 'Steam Cheese Cake Basket',                kategori: 'Steam Cheese Cake',  cbp: 9500  },
  { kode: 'STCDC',  nama: 'Steam Cheese Cake Duo',                   kategori: 'Steam Cheese Cake',  cbp: 7000  },

  { kode: 'SCSC',   nama: 'Sari Choco Spread Coklat',                kategori: 'Sari Choco',          cbp: 18000 },
  { kode: 'SCSCH',  nama: 'Sari Choco Spread Coklat Hazelnut',       kategori: 'Sari Choco',          cbp: 18000 },
  { kode: 'SCM110', nama: 'Sari Choco Milk 110ml',                   kategori: 'Sari Choco',          cbp: 5000  },
  { kode: 'SCM180', nama: 'Sari Choco Milk 180ml',                   kategori: 'Sari Choco',          cbp: 6000  },

  { kode: 'BKCK',   nama: 'Bamkohem Original',                       kategori: 'Bamkohem',            cbp: 10500 },
  { kode: 'BKKJ',   nama: 'Bamkohem Keju',                           kategori: 'Bamkohem',            cbp: 10500 },
];

export const SKU_CATEGORIES = [...new Set(SKU_LIST.map(s => s.kategori))];

export function findSku(kode: string): SkuItem | undefined {
  return SKU_LIST.find(s => s.kode === kode);
}

export function formatRupiahSku(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}
