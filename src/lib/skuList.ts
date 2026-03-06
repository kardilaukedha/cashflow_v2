export interface SkuItem {
  kode: string;
  nama: string;
  kategori: string;
}

export const SKU_LIST: SkuItem[] = [
  { kode: 'RTS',    nama: 'Roti Tawar Special',                      kategori: 'Roti Tawar' },
  { kode: 'RTG',    nama: 'Roti Tawar Gandum',                       kategori: 'Roti Tawar' },
  { kode: 'RTPDM',  nama: 'Roti Tawar Pandan Manis',                 kategori: 'Roti Tawar' },
  { kode: 'RCC',    nama: 'Roti Tawar Choco Chip',                   kategori: 'Roti Tawar' },
  { kode: 'RTKL',   nama: 'Roti Tawar Klasik',                       kategori: 'Roti Tawar' },
  { kode: 'RKU',    nama: 'Roti Tawar Kupas',                        kategori: 'Roti Tawar' },
  { kode: 'RJKU',   nama: 'Roti Jumbo Tawar Kupas',                  kategori: 'Roti Tawar' },
  { kode: 'DOP',    nama: 'Roti Tawar Doble Soft F',                 kategori: 'Roti Tawar' },
  { kode: 'DOM',    nama: 'Roti Tawar Doble Soft',                   kategori: 'Roti Tawar' },
  { kode: 'RTJS',   nama: 'Roti Tawar Jumbo Spesial',                kategori: 'Roti Tawar' },
  { kode: 'RJMS',   nama: 'Roti Jumbo Milk Soft',                    kategori: 'Roti Tawar' },

  { kode: 'SCC',    nama: 'Sandwich Coklat',                         kategori: 'Sandwich' },
  { kode: 'SAB',    nama: 'Sandwich Blueberry',                      kategori: 'Sandwich' },
  { kode: 'SAP',    nama: 'Sandwich Krim Peanut',                    kategori: 'Sandwich' },
  { kode: 'SKI',    nama: 'Sandwich Keju',                           kategori: 'Sandwich' },
  { kode: 'SMG',    nama: 'Sandwich Margarin Gula',                  kategori: 'Sandwich' },
  { kode: 'SSM',    nama: 'Sandwich Pandan Sarikaya',                kategori: 'Sandwich' },
  { kode: 'SCB',    nama: 'Sandwich Choco Blast',                    kategori: 'Sandwich' },

  { kode: 'ZSCCK',  nama: 'Zupper Sandwich Krim Coklat',             kategori: 'Zupper Sandwich' },
  { kode: 'ZSCMK',  nama: 'Zupper Sandwich Krim Moka',               kategori: 'Zupper Sandwich' },
  { kode: 'ZSCS',   nama: 'Zupper Sandwich Creamy Sweet',            kategori: 'Zupper Sandwich' },
  { kode: 'ZSCST',  nama: 'Zuper Sandwich Krim Strawberry',          kategori: 'Zupper Sandwich' },

  { kode: 'ICK GT', nama: 'Choco Bun',                               kategori: 'Bun / Sobek' },
  { kode: 'ICZ GT', nama: 'Cheese Bun',                              kategori: 'Bun / Sobek' },
  { kode: 'ICE',    nama: 'Sweet Cheese Bun',                        kategori: 'Bun / Sobek' },
  { kode: 'IST',    nama: 'Blueberry Bun GT',                        kategori: 'Bun / Sobek' },
  { kode: 'IBL',    nama: 'Blueberry Bun',                           kategori: 'Bun / Sobek' },
  { kode: 'ICO',    nama: 'Coconut Bun GT',                          kategori: 'Bun / Sobek' },
  { kode: 'TOC',    nama: 'Roti Sobek Coklat Coklat',                kategori: 'Bun / Sobek' },
  { kode: 'TCC',    nama: 'Roti Sobek Coklat Meses',                 kategori: 'Bun / Sobek' },
  { kode: 'TCS',    nama: 'Roti Sobek Coklat Sarikaya',              kategori: 'Bun / Sobek' },
  { kode: 'TST',    nama: 'Roti Sobek Coklat Strawberry',            kategori: 'Bun / Sobek' },
  { kode: 'TCB',    nama: 'Roti Sobek Coklat Blueberry',             kategori: 'Bun / Sobek' },
  { kode: 'TCBIII', nama: 'Roti Sobek Krim Meses',                   kategori: 'Bun / Sobek' },
  { kode: 'TDST',   nama: 'Sobek Duo Strawberry',                    kategori: 'Bun / Sobek' },
  { kode: 'TDCB',   nama: 'Sobek Duo Blueberry',                     kategori: 'Bun / Sobek' },
  { kode: 'TDOC',   nama: 'Sobek Duo Cokelat',                       kategori: 'Bun / Sobek' },
  { kode: 'TDSA',   nama: 'Sobek Duo Sarikaya',                      kategori: 'Bun / Sobek' },
  { kode: 'KBC',    nama: 'Klasik Bantal Sweet Cheese',              kategori: 'Bun / Sobek' },
  { kode: 'RMNS',   nama: 'Roti Mini Strawberry',                    kategori: 'Bun / Sobek' },
  { kode: 'BUR',    nama: 'Burgerbun',                               kategori: 'Bun / Sobek' },
  { kode: 'SRPL',   nama: 'Plain Rolls',                             kategori: 'Bun / Sobek' },

  { kode: 'SCM',    nama: 'Roti Krim Cokelat Meses',                 kategori: 'Roti Krim' },
  { kode: 'SCCIII', nama: 'Roti Creamy Cokelat Meses',               kategori: 'Roti Krim' },
  { kode: 'SCVIII', nama: 'Roti Krim Coklat',                        kategori: 'Roti Krim' },
  { kode: 'SCCJII', nama: 'Roti Krim Keju',                          kategori: 'Roti Krim' },
  { kode: 'SRMIII', nama: 'Roti Krim Moca',                          kategori: 'Roti Krim' },

  { kode: 'ZCRCK',  nama: 'Zuperr Creamy Choco Double Choco',        kategori: 'Zuperr Creamy' },
  { kode: 'ZCRCR',  nama: 'Zuperr Creamy Choco Choco Berry',         kategori: 'Zuperr Creamy' },
  { kode: 'ZCRCB',  nama: 'Zuperr Creamy Choco Choco Banana',        kategori: 'Zuperr Creamy' },
  { kode: 'SRS',    nama: 'Roti Sandroll Zuperr Creamy Strawberry',  kategori: 'Zuperr Creamy' },

  { kode: 'DCS',    nama: 'Dorayaki Si Coklat',                      kategori: 'Dorayaki' },
  { kode: 'DCP',    nama: 'Dorayaki Choco Peanut',                   kategori: 'Dorayaki' },
  { kode: 'DCH',    nama: 'Dorayaki Hokkaido Cheese',                kategori: 'Dorayaki' },
  { kode: 'DHF',    nama: 'Dorayaki Honey Flavor',                   kategori: 'Dorayaki' },
  { kode: 'DSK',    nama: 'Dorayaki Sarikaya',                       kategori: 'Dorayaki' },
  { kode: 'DMT',    nama: 'Dorayaki Martabak',                       kategori: 'Dorayaki' },
  { kode: 'DPS',    nama: 'Dorayaki Pandan Sarikaya',                kategori: 'Dorayaki' },
  { kode: 'DNS',    nama: 'Dorayaki Nastar',                         kategori: 'Dorayaki' },

  { kode: 'RKJ',    nama: 'Roti Kasur Keju',                         kategori: 'Roti Kasur / Sisir' },
  { kode: 'RSM',    nama: 'Roti Sisir Mentega',                      kategori: 'Roti Kasur / Sisir' },
  { kode: 'RKS',    nama: 'Roti Kasur Susu',                         kategori: 'Roti Kasur / Sisir' },

  { kode: 'CCC',    nama: 'Chiffon Cake Coklat',                     kategori: 'Cake' },
  { kode: 'CCP',    nama: 'Chiffon Cake Pandan',                     kategori: 'Cake' },
  { kode: 'MCP VI', nama: 'Mini Cupcake Vanilla Coconut Isi 6',      kategori: 'Cake' },
  { kode: 'KAOF',   nama: 'Kastela Original Family',                 kategori: 'Cake' },
  { kode: 'KAOM',   nama: 'Kastela Original Medium',                 kategori: 'Cake' },
  { kode: 'BKV',    nama: 'Bolu Kukus Putih Vanilla',                kategori: 'Cake' },
  { kode: 'BMO',    nama: 'Bolu Mini Original',                      kategori: 'Cake' },
  { kode: 'WFO',    nama: 'Waffle Original',                         kategori: 'Cake' },

  { kode: 'LSPO',   nama: 'Lapis Surabaya Premium Original',         kategori: 'Lapis Surabaya' },
  { kode: 'LSPK',   nama: 'Lapis Surabaya Premium Keju',             kategori: 'Lapis Surabaya' },
  { kode: 'LSPP',   nama: 'Lapis Surabaya Premium Pandan',           kategori: 'Lapis Surabaya' },
  { kode: 'LSPM',   nama: 'Lapis Surabaya Premium Moca',             kategori: 'Lapis Surabaya' },

  { kode: 'SCCP',   nama: 'Soft Cake Putu Pandan',                   kategori: 'Soft Cake' },
  { kode: 'SCPI',   nama: 'Soft Cake Pisang Ijo',                    kategori: 'Soft Cake' },
  { kode: 'SCET',   nama: 'Soft Cake Es Teler',                      kategori: 'Soft Cake' },
  { kode: 'SCGA',   nama: 'Soft Cake Gula Aren',                     kategori: 'Soft Cake' },
  { kode: 'SCPSM',  nama: 'Soft Cake Pandan Salted Caramel Mocca',   kategori: 'Soft Cake' },

  { kode: 'STCS',   nama: 'Steam Cheese Cake Strawberry',            kategori: 'Steam Cheese Cake' },
  { kode: 'STCC',   nama: 'Steam Cheese Cake',                       kategori: 'Steam Cheese Cake' },
  { kode: 'STCK',   nama: 'Steam Cheese Cake Cokelat',               kategori: 'Steam Cheese Cake' },
  { kode: 'STCB',   nama: 'Steam Cheese Cake Banana',                kategori: 'Steam Cheese Cake' },
  { kode: 'STCTM',  nama: 'Steam Cheese Cake Tiramisu',              kategori: 'Steam Cheese Cake' },
  { kode: 'STCBA',  nama: 'Steam Cheese Cake Basket',                kategori: 'Steam Cheese Cake' },
  { kode: 'STCDC',  nama: 'Steam Cheese Cake Duo',                   kategori: 'Steam Cheese Cake' },

  { kode: 'SCSC',   nama: 'Sari Choco Spread Coklat',                kategori: 'Sari Choco' },
  { kode: 'SCSCH',  nama: 'Sari Choco Spread Coklat Hazelnut',       kategori: 'Sari Choco' },
  { kode: 'SCM110', nama: 'Sari Choco Milk 110ml',                   kategori: 'Sari Choco' },
  { kode: 'SCM180', nama: 'Sari Choco Milk 180ml',                   kategori: 'Sari Choco' },

  { kode: 'BKCK',   nama: 'Bamkohem Original',                       kategori: 'Bamkohem' },
  { kode: 'BKKJ',   nama: 'Bamkohem Keju',                           kategori: 'Bamkohem' },
];

export const SKU_CATEGORIES = [...new Set(SKU_LIST.map(s => s.kategori))];

export function findSku(kode: string): SkuItem | undefined {
  return SKU_LIST.find(s => s.kode === kode);
}
