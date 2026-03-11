import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Upload, Download, Settings, LogOut, LogIn, RotateCcw, CheckCircle, AlertCircle, Edit2, Save, X, Cloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const InventoryCheckingSystem = () => {
  // 基本狀態
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 用戶相關
  const [userName, setUserName] = useState('');
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  
  // 點貨相關
  const [checkingData, setCheckingData] = useState({});
  const [checkedCount, setCheckedCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // 新增/編輯商品相關
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tempProduct, setTempProduct] = useState({
    productNumber: '',
    productName: '',
    brand: '',
    project: '',
    totalQuantity: '',
  });

  // 計算已點貨的數量
  useEffect(() => {
    setCheckedCount(Object.keys(checkingData).length);
  }, [checkingData]);

  // 檢查 Supabase 連接
  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase 未配置。請檢查環境變量。');
    }
  }, []);

  // 登入
  const handleLogin = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setShowNameSetup(true);
    setIsLoading(false);
  };

  // 確認用戶名字
  const handleConfirmUserName = () => {
    if (!tempUserName.trim()) {
      alert('請輸入你的名字');
      return;
    }
    setUserName(tempUserName);
    setShowNameSetup(false);
    setTempUserName('');
    setIsLoggedIn(true);
  };

  // 登出
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setTempUserName('');
  };

  // 重置所有數據
  const handleResetAll = () => {
    if (window.confirm('確定要清空所有數據嗎？此操作無法復原。')) {
      setProducts([]);
      setCheckingData({});
      setCheckedCount(0);
      setTotalProducts(0);
    }
  };

  // 處理 Excel 上傳
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
          alert('❌ Excel 檔案為空');
          return;
        }

        const validProducts = data.map((row, index) => {
          const getField = (aliases) => {
            for (let alias of aliases) {
              if (row[alias] !== undefined) return row[alias];
            }
            return '';
          };

          const productNumber = String(getField(['貨品編號', '編號', 'SKU', '產品編號'])).trim();
          const productName = String(getField(['貨品名稱', '名稱', '商品名稱', '產品名稱'])).trim();
          
          if (!productNumber || !productName) {
            throw new Error(`第 ${index + 2} 行缺少「貨品編號」或「貨品名稱」`);
          }

          return {
            id: `${productNumber}_${Date.now()}_${index}`,
            productNumber: productNumber,
            productName: productName,
            brand: String(getField(['廠牌用途', '廠牌', '品牌', '用途'])).trim() || '-',
            project: String(getField(['項目', '分類', '類別'])).trim() || '-',
            totalQuantity: parseInt(getField(['總計', '預期數量', '數量'])) || 0,
            createdAt: new Date().toISOString(),
            isTemp: false,
          };
        });

        setProducts(validProducts);
        setTotalProducts(validProducts.length);
        setCheckingData({});

        alert(`✅ 成功導入 ${validProducts.length} 個商品！`);
        setShowImportModal(false);
      } catch (error) {
        alert(`❌ 導入失敗：${error.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 下載模板
  const handleDownloadTemplate = () => {
    const template = [
      {
        '貨品編號': 'SKU001',
        '貨品名稱': '示例商品 1',
        '廠牌': '示例品牌',
        '項目': '示例分類',
        '總計': 100,
      },
      {
        '貨品編號': 'SKU002',
        '貨品名稱': '示例商品 2',
        '廠牌': '示例品牌',
        '項目': '示例分類',
        '總計': 50,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '商品清單');
    XLSX.writeFile(workbook, '庫存清單模板.xlsx');
  };

  // 下載點貨結果
  const handleDownloadResults = () => {
    if (products.length === 0) {
      alert('❌ 沒有商品可下載');
      return;
    }

    const results = products.map(product => {
      const isChecked = checkingData[product.id];
      return {
        '貨品編號': product.productNumber,
        '貨品名稱': product.productName,
        '廠牌': product.brand,
        '項目': product.project,
        '預期數量': product.totalQuantity,
        '實際數量': isChecked ? isChecked.actualQuantity : '未點貨',
        '差異': isChecked ? (isChecked.actualQuantity - product.totalQuantity) : '',
        '點貨人': isChecked ? isChecked.checkedBy : '',
        '點貨時間': isChecked ? isChecked.checkedAt : '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '點貨結果');
    XLSX.writeFile(workbook, `點貨結果_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 篩選商品
  const filteredProducts = products.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.productName.toLowerCase().includes(search) ||
      p.productNumber.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search)
    );
  });

  // 記錄點貨 - 帶 Supabase 同步
  const handleProductCheck = async (productId, actualQuantity) => {
    const quantity = parseInt(actualQuantity);
    if (isNaN(quantity) || quantity < 0) {
      alert('❌ 請輸入有效的數字');
      return;
    }

    const product = products.find(p => p.id === productId);
    const newCheckData = {
      actualQuantity: quantity,
      checkedBy: userName,
      checkedAt: new Date().toLocaleString('zh-TW'),
    };

    // 更新本地狀態
    setCheckingData(prev => ({
      ...prev,
      [productId]: newCheckData
    }));

    // 如果有 Supabase 連接，同時保存到數據庫
    if (supabase) {
      setIsSyncing(true);
      try {
        const variance = quantity - product.totalQuantity;
        
        const { error } = await supabase
          .from('inventory_checks')
          .insert([
            {
              product_id: productId,
              product_number: product.productNumber,
              product_name: product.productName,
              brand: product.brand,
              project: product.project,
              expected_quantity: product.totalQuantity,
              actual_quantity: quantity,
              variance: variance,
              checked_by: userName,
              checked_at: new Date().toLocaleString('zh-TW'),
            }
          ]);

        if (error) {
          console.error('Supabase 保存錯誤:', error);
          // 繼續運行，不中斷用戶體驗
        } else {
          // 靜默保存成功，不打擾用戶
        }
      } catch (error) {
        console.error('同步到 Supabase 失敗:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 刪除點貨紀錄
  const handleDeleteCheck = (productId) => {
    setCheckingData(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  // 新增臨時商品
  const handleAddProduct = () => {
    if (!tempProduct.productNumber.trim() || !tempProduct.productName.trim()) {
      alert('❌ 請填寫貨品編號和名稱');
      return;
    }

    const newProduct = {
      id: `temp_${Date.now()}`,
      productNumber: tempProduct.productNumber.trim(),
      productName: tempProduct.productName.trim(),
      brand: tempProduct.brand.trim() || '-',
      project: tempProduct.project.trim() || '-',
      totalQuantity: parseInt(tempProduct.totalQuantity) || 0,
      createdAt: new Date().toISOString(),
      isTemp: true,
    };

    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? newProduct : p));
      setEditingId(null);
      alert('✅ 商品已更新');
    } else {
      setProducts(prev => [...prev, newProduct]);
      setTotalProducts(prev => prev + 1);
      alert('✅ 新商品已添加');
    }

    setTempProduct({
      productNumber: '',
      productName: '',
      brand: '',
      project: '',
      totalQuantity: '',
    });
    setShowAddProductModal(false);
  };

  // 編輯商品
  const handleEditProduct = (product) => {
    setTempProduct({
      productNumber: product.productNumber,
      productName: product.productName,
      brand: product.brand === '-' ? '' : product.brand,
      project: product.project === '-' ? '' : product.project,
      totalQuantity: product.totalQuantity.toString(),
    });
    setEditingId(product.id);
    setShowAddProductModal(true);
  };

  // 刪除商品
  const handleDeleteProduct = (productId) => {
    if (window.confirm('確定要刪除此商品嗎？')) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      setTotalProducts(prev => prev - 1);
      const newCheckingData = { ...checkingData };
      delete newCheckingData[productId];
      setCheckingData(newCheckingData);
    }
  };

  // 未登入畫面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">庫存點貨系統</h1>
            <p className="text-white/60">精確掌握庫存，輕鬆管理物品</p>
            {supabase && (
              <p className="text-cyan-400 text-sm mt-2 flex items-center justify-center gap-1">
                <Cloud className="w-4 h-4" />
                已連接 Supabase 雲端同步
              </p>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {isLoading ? '正在登入...' : '開始使用'}
          </button>
        </div>

        {/* 名字設置模態 */}
        {showNameSetup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-2">歡迎！</h2>
              <p className="text-white/60 mb-6">請輸入你的名字</p>
              <input
                type="text"
                placeholder="輸入你的名字"
                value={tempUserName}
                onChange={(e) => setTempUserName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleConfirmUserName();
                }}
                autoFocus
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10 mb-6 text-lg"
              />
              <button
                onClick={handleConfirmUserName}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all"
              >
                確認
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 主要應用畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-7 h-7 text-cyan-400" />
              庫存點貨系統
            </h1>
            <p className="text-white/60 text-sm mt-1">歡迎，{userName}</p>
            {supabase && !isSyncing && (
              <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                ✓ 已連接 Supabase
              </p>
            )}
            {isSyncing && (
              <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                <Cloud className="w-3 h-3 animate-spin" />
                正在同步...
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white"
              title="設置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-all text-white/70 hover:text-red-400"
              title="登出"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 設置菜單 */}
        {showSettings && (
          <div className="border-t border-white/10 bg-white/5 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setShowImportModal(true);
                  setShowSettings(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all"
              >
                <Upload className="w-4 h-4" />
                導入 Excel
              </button>
              <button
                onClick={() => {
                  handleDownloadTemplate();
                  setShowSettings(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
                下載模板
              </button>
              <button
                onClick={() => {
                  handleDownloadResults();
                  setShowSettings(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all"
                disabled={products.length === 0}
              >
                <Download className="w-4 h-4" />
                下載結果
              </button>
              <button
                onClick={() => {
                  handleResetAll();
                  setShowSettings(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                清空數據
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 匯入模態 */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">導入商品清單</h2>
              
              <div className="mb-6 p-6 border-2 border-dashed border-blue-400/50 rounded-lg bg-blue-500/10">
                <label className="cursor-pointer flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-blue-400" />
                  <span className="text-white font-semibold">點擊選擇 Excel 檔案</span>
                  <span className="text-white/60 text-sm">或拖拽檔案到此</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={() => handleDownloadTemplate()}
                className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg font-semibold transition-all mb-3"
              >
                下載 Excel 模板
              </button>

              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 新增/編輯商品模態 */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingId ? '編輯商品' : '新增臨時商品'}
              </h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-white/80 text-sm mb-2 font-semibold">貨品編號 *</label>
                  <input
                    type="text"
                    placeholder="例：SKU001"
                    value={tempProduct.productNumber}
                    onChange={(e) => setTempProduct({...tempProduct, productNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2 font-semibold">貨品名稱 *</label>
                  <input
                    type="text"
                    placeholder="例：鋼筆"
                    value={tempProduct.productName}
                    onChange={(e) => setTempProduct({...tempProduct, productName: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2 font-semibold">廠牌</label>
                  <input
                    type="text"
                    placeholder="例：派克"
                    value={tempProduct.brand}
                    onChange={(e) => setTempProduct({...tempProduct, brand: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2 font-semibold">項目分類</label>
                  <input
                    type="text"
                    placeholder="例：文具"
                    value={tempProduct.project}
                    onChange={(e) => setTempProduct({...tempProduct, project: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2 font-semibold">預期數量</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={tempProduct.totalQuantity}
                    onChange={(e) => setTempProduct({...tempProduct, totalQuantity: e.target.value})}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddProduct}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? '更新' : '新增'}
                </button>
                <button
                  onClick={() => {
                    setShowAddProductModal(false);
                    setEditingId(null);
                    setTempProduct({
                      productNumber: '',
                      productName: '',
                      brand: '',
                      project: '',
                      totalQuantity: '',
                    });
                  }}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 搜尋和操作區 */}
        <div className="mb-8">
          {/* 搜尋框 */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
            <input
              type="text"
              placeholder="搜尋商品名稱、SKU 或品牌..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/10 transition-all text-lg"
            />
          </div>

          {/* 新增商品按鈕 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setEditingId(null);
                setTempProduct({
                  productNumber: '',
                  productName: '',
                  brand: '',
                  project: '',
                  totalQuantity: '',
                });
                setShowAddProductModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              新增臨時商品
            </button>
          </div>

          {/* 進度條 */}
          {totalProducts > 0 && (
            <div className="p-6 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  點貨進度
                </p>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  {checkedCount} / {totalProducts} ({totalProducts > 0 ? Math.round((checkedCount / totalProducts) * 100) : 0}%)
                </p>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${totalProducts > 0 ? (checkedCount / totalProducts) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* 商品列表 */}
        {products.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-6">還沒有商品清單</p>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              <Upload className="w-5 h-5" />
              上傳商品清單
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60 text-lg">未找到匹配的商品</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(product => {
              const isChecked = checkingData[product.id];
              const variance = isChecked ? (isChecked.actualQuantity - product.totalQuantity) : null;
              
              return (
                <div
                  key={product.id}
                  className={`p-5 backdrop-blur-lg border rounded-xl transition-all ${
                    isChecked
                      ? 'bg-green-500/10 border-green-400/30 shadow-lg shadow-green-500/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {isChecked && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                        <h3 className="text-lg font-bold text-white truncate">
                          {product.productName}
                        </h3>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                          {product.productNumber}
                        </span>
                        {product.brand && product.brand !== '-' && (
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            {product.brand}
                          </span>
                        )}
                        {product.project && product.project !== '-' && (
                          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                            {product.project}
                          </span>
                        )}
                        {product.isTemp && (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-semibold">
                            ⚡ 臨時商品
                          </span>
                        )}
                      </div>
                    </div>

                    {product.isTemp && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all"
                          title="編輯"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                          title="刪除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-white/60 text-sm mb-1">預期數量</p>
                      <p className="text-3xl font-bold text-white">
                        {product.totalQuantity}
                      </p>
                    </div>

                    {isChecked ? (
                      <>
                        <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                          <p className="text-white/60 text-sm mb-1">實際數量</p>
                          <p className="text-3xl font-bold text-green-400">
                            {isChecked.actualQuantity}
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg border ${
                          variance === 0
                            ? 'bg-green-500/20 border-green-400/30'
                            : variance > 0
                            ? 'bg-yellow-500/20 border-yellow-400/30'
                            : 'bg-red-500/20 border-red-400/30'
                        }`}>
                          <p className="text-white/60 text-sm mb-1">差異</p>
                          <p className={`text-3xl font-bold ${
                            variance === 0
                              ? 'text-green-400'
                              : variance > 0
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}>
                            {variance > 0 ? '+' : ''}{variance}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 p-4 bg-white/5 rounded-lg border border-blue-400/30">
                        <input
                          type="number"
                          placeholder="輸入實際數量"
                          min="0"
                          defaultValue=""
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const value = e.target.value.trim();
                              if (value !== '') {
                                handleProductCheck(product.id, value);
                                e.target.value = '';
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value !== '') {
                              handleProductCheck(product.id, value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-3 bg-white/10 border border-blue-400/50 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-300 focus:bg-white/20 text-center text-xl font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  {isChecked && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-white/50">
                        ✓ {isChecked.checkedBy} 於 {isChecked.checkedAt}
                      </p>
                      <button
                        onClick={() => handleDeleteCheck(product.id)}
                        className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded-lg transition-all"
                        title="重新點貨"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryCheckingSystem;
