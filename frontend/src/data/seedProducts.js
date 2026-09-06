/**
 * 生產排程「產品檔」的測試料號種子(共用單一來源)。
 * 對應後端 QA_Scenarios_Tests 的 RSC/HSC 測試產品檔(3 RSC + 1 HSC)。
 * 產品檔為空時種入,選取後可經「加入排程」對應生成工單(Order)。
 *
 * 同時被 MainLayout(Outlet context 的 products)與 productionStore 引用,避免兩份清單分歧。
 */
export function createSeedProducts() {
  return [
    { id: 'seed_rsc_a', boxNo: 'RSC-A-001', customer: 'QA測試', productName: 'RSC A楞 標準外箱',
      boxType: 'RSC', flute: 'A', thickness: 5, bundleCount: 25, remarks: '常規開槽箱・A楞單瓦楞',
      length: 400, width: 300, height: 250 },
    { id: 'seed_rsc_b', boxNo: 'RSC-B-001', customer: 'QA測試', productName: 'RSC B楞 中型箱',
      boxType: 'RSC', flute: 'B', thickness: 3, bundleCount: 50, remarks: '常規開槽箱・B楞單瓦楞',
      length: 350, width: 250, height: 200 },
    { id: 'seed_rsc_ab', boxNo: 'RSC-AB-001', customer: 'QA測試', productName: 'RSC AB楞 重載箱',
      boxType: 'RSC', flute: 'AB', thickness: 7, bundleCount: 20, remarks: '常規開槽箱・AB雙瓦楞',
      length: 600, width: 400, height: 400 },
    { id: 'seed_hsc_b', boxNo: 'HSC-B-001', customer: 'QA測試', productName: 'HSC B楞 半槽箱',
      boxType: 'HSC', flute: 'B', thickness: 3, bundleCount: 40, remarks: '半槽箱・無上蓋',
      length: 350, width: 250, height: 300 },
  ];
}
