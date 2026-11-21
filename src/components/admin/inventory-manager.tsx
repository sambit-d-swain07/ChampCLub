"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addItemAction,
  editItemAction,
  restockItemAction,
  adjustStockAction,
  archiveItemAction,
  bulkRestockAction,
  getItemHistoryAction,
} from "@/app/actions/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatInrPrecise, formatClubDate, formatClubTime } from "@/lib/site-settings";
import {
  Search,
  Plus,
  ArrowUpDown,
  History,
  AlertTriangle,
  Loader2,
  X,
  MoreVertical,
} from "lucide-react";

export interface InventoryRowItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stockQty: number;
  reorderLevel: number;
  marginPct: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

interface InventoryManagerProps {
  activeTab: "PRODUCT" | "BAR";
  items: InventoryRowItem[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  categories: string[];
  lowStockItems: InventoryRowItem[];
  currentQuery?: string;
  currentCategory?: string;
  currentStatus?: string;
  isOwner?: boolean;
}

export function InventoryManager({
  activeTab,
  items,
  totalItems,
  currentPage,
  totalPages,
  categories,
  lowStockItems,
  currentQuery = "",
  currentCategory = "",
  currentStatus = "ALL",
  isOwner = false,
}: InventoryManagerProps) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"all" | "low_stock">("all");
  const [search, setSearch] = useState(currentQuery);
  const [category, setCategory] = useState(currentCategory);
  const [status, setStatus] = useState(currentStatus);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState(categories[0] || "Accessories");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCost, setAddCost] = useState("");
  const [addOpeningStock, setAddOpeningStock] = useState("0");
  const [addReorderLevel, setAddReorderLevel] = useState("5");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Restock Modal
  const [restockTarget, setRestockTarget] = useState<InventoryRowItem | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const [restockCost, setRestockCost] = useState("");
  const [restockSupplier, setRestockSupplier] = useState("");
  const [restockNote, setRestockNote] = useState("");
  const [restockError, setRestockError] = useState<string | null>(null);
  const [restockLoading, setRestockLoading] = useState(false);

  // Adjust Modal
  const [adjustTarget, setAdjustTarget] = useState<InventoryRowItem | null>(null);
  const [adjustNewCount, setAdjustNewCount] = useState("0");
  const [adjustReason, setAdjustReason] = useState<"Damage" | "Loss" | "Count correction">("Count correction");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Edit Modal
  const [editTarget, setEditTarget] = useState<InventoryRowItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editReorderLevel, setEditReorderLevel] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Archive Modal
  const [archiveTarget, setArchiveTarget] = useState<InventoryRowItem | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Drawer / History State
  const [drawerTarget, setDrawerTarget] = useState<InventoryRowItem | null>(null);
  const [historyMovements, setHistoryMovements] = useState<any[]>([]);
  const [historyUnitsSold30d, setHistoryUnitsSold30d] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Bulk Restock State
  const [bulkRestockLoading, setBulkRestockLoading] = useState(false);

  // Active action menu id
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const applyFilters = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    params.set("tab", activeTab.toLowerCase());
    const q = overrides.search !== undefined ? overrides.search : search;
    const cat = overrides.category !== undefined ? overrides.category : category;
    const st = overrides.status !== undefined ? overrides.status : status;

    if (q.trim()) params.set("q", q.trim());
    if (cat) params.set("category", cat);
    if (st && st !== "ALL") params.set("status", st);
    params.set("page", "1");

    router.push(`/admin/inventory?${params.toString()}`);
  };

  const switchTab = (tab: "PRODUCT" | "BAR") => {
    router.push(`/admin/inventory?tab=${tab.toLowerCase()}&page=1`);
  };

  // Open History Drawer
  const handleOpenHistory = async (item: InventoryRowItem, page = 1) => {
    setDrawerTarget(item);
    setActiveMenuId(null);
    setHistoryLoading(true);
    setHistoryPage(page);

    const res = await getItemHistoryAction({
      itemType: activeTab,
      itemId: item.id,
      page,
    });
    setHistoryLoading(false);

    if (res.success) {
      setHistoryMovements(res.movements || []);
      setHistoryUnitsSold30d(res.unitsSold30d || 0);
      setHistoryTotal(res.totalMovements || 0);
    }
  };

  // Handle Add Item Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    const finalCategory = isNewCategory ? newCategoryName.trim() : addCategory;
    if (!finalCategory) {
      setAddError("Category is required.");
      setAddLoading(false);
      return;
    }

    const res = await addItemAction({
      itemType: activeTab,
      name: addName.trim(),
      category: finalCategory,
      price: parseFloat(addPrice) || 0,
      costPrice: parseFloat(addCost) || 0,
      openingStock: parseInt(addOpeningStock, 10) || 0,
      reorderLevel: parseInt(addReorderLevel, 10) || 5,
    });

    setAddLoading(false);
    if (!res.success) {
      setAddError(res.error || "Failed to add item.");
      return;
    }

    setAddOpen(false);
    setAddName("");
    setAddPrice("");
    setAddCost("");
    setAddOpeningStock("0");
    setAddReorderLevel("5");
    setIsNewCategory(false);
    setNewCategoryName("");
    router.refresh();
  };

  // Handle Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;

    setRestockLoading(true);
    setRestockError(null);

    const qty = parseInt(restockQty, 10);
    const unitCost = parseFloat(restockCost) || 0;

    const res = await restockItemAction({
      itemType: activeTab,
      itemId: restockTarget.id,
      quantity: qty,
      unitCost,
      supplier: restockSupplier.trim() || undefined,
      note: restockNote.trim() || undefined,
    });

    setRestockLoading(false);
    if (!res.success) {
      setRestockError(res.error || "Failed to restock item.");
      return;
    }

    setRestockTarget(null);
    setRestockQty("10");
    setRestockCost("");
    setRestockSupplier("");
    setRestockNote("");
    router.refresh();
  };

  // Handle Adjust Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    setAdjustLoading(true);
    setAdjustError(null);

    const newCount = parseInt(adjustNewCount, 10);

    const res = await adjustStockAction({
      itemType: activeTab,
      itemId: adjustTarget.id,
      newCount,
      reason: adjustReason,
      note: adjustNote.trim() || undefined,
    });

    setAdjustLoading(false);
    if (!res.success) {
      setAdjustError(res.error || "Failed to adjust stock count.");
      return;
    }

    setAdjustTarget(null);
    setAdjustNewCount("0");
    setAdjustNote("");
    router.refresh();
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setEditLoading(true);
    setEditError(null);

    const res = await editItemAction({
      itemType: activeTab,
      itemId: editTarget.id,
      name: editName.trim(),
      category: editCategory.trim(),
      price: parseFloat(editPrice) || 0,
      costPrice: parseFloat(editCost) || 0,
      reorderLevel: parseInt(editReorderLevel, 10) || 5,
    });

    setEditLoading(false);
    if (!res.success) {
      setEditError(res.error || "Failed to update item.");
      return;
    }

    setEditTarget(null);
    router.refresh();
  };

  // Handle Archive Submit
  const handleArchiveSubmit = async () => {
    if (!archiveTarget) return;

    setArchiveLoading(true);
    setArchiveError(null);

    const res = await archiveItemAction({
      itemType: activeTab,
      itemId: archiveTarget.id,
    });

    setArchiveLoading(false);
    if (!res.success) {
      setArchiveError(res.error || "Failed to archive item.");
      return;
    }

    setArchiveTarget(null);
    router.refresh();
  };

  // Bulk Restock Handler
  const handleBulkRestock = async () => {
    if (lowStockItems.length === 0) return;
    setBulkRestockLoading(true);

    const itemsToRestock = lowStockItems.map((item) => ({
      itemType: activeTab,
      itemId: item.id,
      quantity: Math.max(10, item.reorderLevel * 2 - item.stockQty),
      unitCost: item.costPrice || 0,
      supplier: "Standard Supplier",
    }));

    const res = await bulkRestockAction(itemsToRestock);
    setBulkRestockLoading(false);

    if (res.success) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Department Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Inventory Management</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Single shared stock across counter sales, online orders, and cafeteria tabs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setAddError(null);
              setAddName("");
              setAddPrice("");
              setAddCost("");
              setAddOpeningStock("0");
              setAddReorderLevel("5");
              setAddOpen(true);
            }}
            className="h-8 text-xs font-semibold bg-[#23513C] text-white hover:bg-[#1b402f]"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add {activeTab === "PRODUCT" ? "Product" : "Bar Item"}
          </Button>
        </div>
      </div>

      {/* Pro Shop vs Bar Tabs */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTab("PRODUCT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "PRODUCT"
                ? "bg-[#23513C] text-white"
                : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
            }`}
          >
            Pro Shop Inventory
          </button>
          <button
            type="button"
            onClick={() => switchTab("BAR")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "BAR"
                ? "bg-[#23513C] text-white"
                : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
            }`}
          >
            Champions Bar & Café
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              viewMode === "all" ? "bg-[#F1F5F9] text-[#0F172A] font-semibold" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            All Inventory ({totalItems})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("low_stock")}
            className={`text-xs px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
              viewMode === "low_stock"
                ? "bg-amber-100 text-amber-900 font-semibold"
                : "text-amber-800 hover:bg-amber-50"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Low Stock ({lowStockItems.length})
          </button>
        </div>
      </div>

      {/* Low Stock Watch View */}
      {viewMode === "low_stock" ? (
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="px-5 pt-4 pb-3 flex flex-row items-center justify-between border-b border-[#E2E8F0]">
            <div>
              <CardTitle className="text-sm font-semibold text-[#0F172A]">
                Low Stock Threshold Watch ({lowStockItems.length} items)
              </CardTitle>
            </div>
            {lowStockItems.length > 0 && (
              <Button
                size="sm"
                onClick={handleBulkRestock}
                disabled={bulkRestockLoading}
                className="h-8 text-xs font-semibold bg-[#23513C] text-white hover:bg-[#1b402f]"
              >
                {bulkRestockLoading ? "Restocking..." : "Restock Selected to Safe Level"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                All items in {activeTab === "PRODUCT" ? "Pro Shop" : "Champions Bar"} are currently above their reorder thresholds.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#E2E8F0] bg-[#F8FAFC]">
                    <TableHead className="text-xs text-[#64748B]">SKU</TableHead>
                    <TableHead className="text-xs text-[#64748B]">Name</TableHead>
                    <TableHead className="text-xs text-[#64748B]">Category</TableHead>
                    <TableHead className="text-xs text-[#64748B]">Current Stock</TableHead>
                    <TableHead className="text-xs text-[#64748B]">Reorder Level</TableHead>
                    <TableHead className="text-xs text-[#64748B]">Unit Cost</TableHead>
                    <TableHead className="text-xs text-[#64748B] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id} className="border-[#F1F5F9]">
                      <TableCell className="text-xs font-mono font-medium text-[#64748B]">{item.sku}</TableCell>
                      <TableCell className="text-xs font-semibold text-[#0F172A]">{item.name}</TableCell>
                      <TableCell className="text-xs text-[#64748B]">{item.category}</TableCell>
                      <TableCell className="text-xs font-bold text-amber-700">
                        {item.stockQty <= 0 ? "Out of stock (0)" : `${item.stockQty} units`}
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">{item.reorderLevel} units</TableCell>
                      <TableCell className="text-xs text-[#64748B]">{formatInrPrecise(item.costPrice)}</TableCell>
                      <TableCell className="text-xs text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRestockTarget(item);
                            setRestockQty(String(Math.max(10, item.reorderLevel * 2)));
                            setRestockCost(String(item.costPrice || ""));
                          }}
                          className="h-7 text-xs border-[#E2E8F0] text-[#23513C] hover:bg-[#F8FAFC]"
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        /* All Inventory Table View */
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#64748B]" />
                <Input
                  placeholder="Search name, category, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters({ search: e.currentTarget.value });
                  }}
                  onBlur={() => applyFilters()}
                  className="pl-8 h-8 text-xs bg-white border-[#E2E8F0]"
                />
              </div>

              {/* Category Select */}
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  applyFilters({ category: e.target.value });
                }}
                className="h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Status Select */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  applyFilters({ status: e.target.value });
                }}
                className="h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
              >
                <option value="ALL">All Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setStatus("ALL");
                  router.push(`/admin/inventory?tab=${activeTab.toLowerCase()}&page=1`);
                }}
                className="text-xs text-[#64748B] hover:text-[#0F172A] px-2 py-1"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr className="h-10 text-[#64748B] font-semibold">
                    <th className="px-4">SKU</th>
                    <th className="px-4">Name</th>
                    <th className="px-4">Category</th>
                    <th className="px-4">Stock</th>
                    <th className="px-4">Reorder</th>
                    <th className="px-4">Cost</th>
                    <th className="px-4">Price</th>
                    <th className="px-4">Margin %</th>
                    <th className="px-4">Status</th>
                    <th className="px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-xs text-[#64748B]">
                        No inventory items found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="h-11 hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 font-mono font-medium text-[#64748B]">{item.sku}</td>
                        <td className="px-4 font-semibold text-[#0F172A] max-w-xs truncate">{item.name}</td>
                        <td className="px-4 text-[#64748B]">{item.category}</td>
                        <td className="px-4 font-bold text-[#0F172A]">{item.stockQty}</td>
                        <td className="px-4 text-[#64748B]">{item.reorderLevel}</td>
                        <td className="px-4 text-[#64748B]">{formatInrPrecise(item.costPrice)}</td>
                        <td className="px-4 font-semibold text-[#0F172A]">{formatInrPrecise(item.price)}</td>
                        <td className="px-4 text-[#0F172A]">
                          {item.marginPct > 0 ? `${item.marginPct.toFixed(1)}%` : "0.0%"}
                        </td>
                        <td className="px-4">
                          {/* Plain coloured text chips for stock status */}
                          {item.status === "IN_STOCK" ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium">
                              In stock
                            </span>
                          ) : item.status === "LOW_STOCK" ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium">
                              Low stock
                            </span>
                          ) : (
                            <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-medium">
                              Out of stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenHistory(item, 1)}
                              className="h-7 px-2 text-xs text-[#64748B] hover:text-[#0F172A]"
                              title="Stock History & Analytics"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                className="p-1.5 rounded hover:bg-[#F1F5F9] text-[#64748B]"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeMenuId === item.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#E2E8F0] rounded shadow-md z-30 py-1 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setRestockTarget(item);
                                      setRestockQty("10");
                                      setRestockCost(String(item.costPrice || ""));
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] text-[#0F172A]"
                                  >
                                    Restock
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setAdjustTarget(item);
                                      setAdjustNewCount(String(item.stockQty));
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] text-[#0F172A]"
                                  >
                                    Adjust Count
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setEditTarget(item);
                                      setEditName(item.name);
                                      setEditCategory(item.category);
                                      setEditPrice(String(item.price));
                                      setEditCost(String(item.costPrice));
                                      setEditReorderLevel(String(item.reorderLevel));
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] text-[#0F172A]"
                                  >
                                    Edit Details
                                  </button>
                                  {isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setArchiveTarget(item);
                                      }}
                                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 border-t border-[#F1F5F9]"
                                    >
                                      Archive
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 15 Rows / Page Server Pagination */}
            <div className="p-4 border-t border-[#E2E8F0]">
              <PaginationBar
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={15}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">
                Add {activeTab === "PRODUCT" ? "Pro Shop Product" : "Bar Item"}
              </h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Item Name</Label>
                <Input
                  placeholder="e.g. Wilson Pro Overgrip 3-Pack"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              {/* Category Select with Add New Option */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-[#0F172A]">Category</Label>
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(!isNewCategory)}
                    className="text-[11px] text-[#23513C] hover:underline"
                  >
                    {isNewCategory ? "Select Existing" : "+ New Category"}
                  </button>
                </div>
                {isNewCategory ? (
                  <Input
                    placeholder="Enter new category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                ) : (
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Selling Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1000"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Cost Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="600"
                    value={addCost}
                    onChange={(e) => setAddCost(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Opening Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={addOpeningStock}
                    onChange={(e) => setAddOpeningStock(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Reorder Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={addReorderLevel}
                    onChange={(e) => setAddReorderLevel(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {addLoading ? "Creating..." : "Save to Inventory"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Restock Inventory</h2>
                <p className="text-xs text-[#64748B]">
                  {restockTarget.name} ({restockTarget.sku}) • Current: {restockTarget.stockQty} in stock
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestockTarget(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {restockError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {restockError}
              </div>
            )}

            <form onSubmit={handleRestockSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Add Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Unit Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={String(restockTarget.costPrice || "0")}
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                  />
                </div>
              </div>

              {parseFloat(restockCost) > 0 && parseInt(restockQty, 10) > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800">
                  Total disbursement of <strong>{formatInrPrecise(parseFloat(restockCost) * parseInt(restockQty, 10))}</strong> will be recorded as an Inventory Expense on Executive Finance.
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Supplier (Optional)</Label>
                <Input
                  placeholder="e.g. Wilson India Dist."
                  value={restockSupplier}
                  onChange={(e) => setRestockSupplier(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Notes</Label>
                <Input
                  placeholder="e.g. Batch #491 Delivery"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRestockTarget(null)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={restockLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {restockLoading ? "Restocking..." : "Confirm Restock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Count Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Adjust Inventory Count</h2>
                <p className="text-xs text-[#64748B]">
                  {adjustTarget.name} • Current system stock: {adjustTarget.stockQty}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">New Physical Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={adjustNewCount}
                  onChange={(e) => setAdjustNewCount(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                  required
                />
                <span className="text-[11px] text-[#64748B]">
                  Difference: {parseInt(adjustNewCount, 10) - adjustTarget.stockQty} units
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Reason for Adjustment</Label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as any)}
                  className="w-full h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
                >
                  <option value="Count correction">Count correction (Audit discrepancy)</option>
                  <option value="Damage">Damage (Broken / Unsellable)</option>
                  <option value="Loss">Loss (Missing item)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Explanation Note</Label>
                <Input
                  placeholder="e.g. Audit conducted at shift close"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustTarget(null)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {adjustLoading ? "Saving..." : "Apply Adjustment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Edit Item Details</h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Category</Label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Selling Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#0F172A]">Cost Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Reorder Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={editReorderLevel}
                  onChange={(e) => setEditReorderLevel(e.target.value)}
                  className="h-8 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal (Owner Only) */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-red-600">Archive Item</h2>
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {archiveError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {archiveError}
              </div>
            )}

            <p className="text-xs text-[#0F172A]">
              Are you sure you want to archive <strong>{archiveTarget.name}</strong>? It will disappear from the shop and POS carts but will remain in historical transaction records.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveTarget(null)}
                className="flex-1 text-xs border-[#E2E8F0]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={archiveLoading}
                onClick={handleArchiveSubmit}
                className="flex-1 text-xs font-semibold"
              >
                {archiveLoading ? "Archiving..." : "Archive Item"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail & Stock History Drawer */}
      {drawerTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto border-l border-[#E2E8F0]">
            <div className="space-y-5">
              <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-4">
                <div>
                  <span className="text-[11px] font-mono text-[#64748B]">{drawerTarget.sku}</span>
                  <h2 className="text-base font-bold text-[#0F172A]">{drawerTarget.name}</h2>
                  <p className="text-xs text-[#64748B]">{drawerTarget.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerTarget(null)}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 30-Day Velocity & Quick Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#F8FAFC] p-3.5 rounded border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block text-[11px]">30-Day Sales Velocity:</span>
                  <strong className="text-sm font-bold text-[#0F172A]">{historyUnitsSold30d} units</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Current Available:</span>
                  <strong className="text-sm font-bold text-[#0F172A]">{drawerTarget.stockQty} in stock</strong>
                </div>
              </div>

              {/* History Movement Ledger */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                    Stock Movement History
                  </h3>
                  <span className="text-[11px] text-[#64748B]">{historyTotal} movements</span>
                </div>

                {historyLoading ? (
                  <div className="py-8 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#23513C]" />
                    Loading movement history...
                  </div>
                ) : historyMovements.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B] border border-dashed border-[#E2E8F0] rounded">
                    No stock movements recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded overflow-hidden">
                    {historyMovements.map((m) => (
                      <div key={m.id} className="p-2.5 text-xs flex justify-between items-center hover:bg-[#F8FAFC]">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                m.type === "PURCHASE" || m.type === "OPENING" || m.type === "RETURN"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : m.type === "DAMAGE"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {m.type}
                            </span>
                            <span className="text-[11px] text-[#64748B]">{formatClubDate(m.createdAt)}</span>
                          </div>
                          {m.note && <p className="text-[11px] text-[#64748B] mt-0.5">{m.note}</p>}
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-mono font-bold ${
                              m.quantityChange > 0 ? "text-emerald-700" : "text-[#0F172A]"
                            }`}
                          >
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDrawerTarget(null)}
              className="w-full text-xs mt-6 border-[#E2E8F0]"
            >
              Close Drawer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
