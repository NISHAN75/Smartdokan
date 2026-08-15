import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import { applyDateRangeFilter, getDateRange } from '../utils/applyDateRangeFilter.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';

const scope = req => ({ companyId: req.user.companyId || null });
const rangeMatch = (req, field, base = {}) => applyDateRangeFilter({ ...base }, field, ...Object.values(getDateRange(req)));
const validId = id => !id || mongoose.isValidObjectId(id);
const dateOrNull = v => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };

export const getSalesReport = asyncHandler(async (req,res)=>{
  const {companyId}=scope(req); const match=rangeMatch(req,'createdAt',{companyId});
  if(req.query.paymentStatus) match.paymentStatus=req.query.paymentStatus;
  const {page,limit,skip,sort}=new ApiFeatures(match,req.query).build();
  const [rows,totalItems,summary]=await Promise.all([
    Sale.find(match).sort(sort).skip(skip).limit(limit).select('invoiceNumber customerName subtotal discount total paidAmount dueAmount paymentMethod paymentStatus createdAt'),
    Sale.countDocuments(match),
    Sale.aggregate([{ $match:match },{$group:{_id:null,count:{$sum:1},subtotal:{$sum:'$subtotal'},discount:{$sum:'$discount'},total:{$sum:'$total'},paid:{$sum:'$paidAmount'},due:{$sum:'$dueAmount'}}}])
  ]);
  res.json({success:true,data:rows,summary:summary[0]||{count:0,subtotal:0,discount:0,total:0,paid:0,due:0},currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});

export const getPurchasesReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const match=rangeMatch(req,'createdAt',{companyId});
  if(req.query.paymentStatus) match.paymentStatus=req.query.paymentStatus;
  const {page,limit,skip,sort}=new ApiFeatures(match,req.query).build();
  const [rows,totalItems,summary]=await Promise.all([
    Purchase.find(match).sort(sort).skip(skip).limit(limit).select('purchaseNumber supplierName subtotal discount total paidAmount dueAmount paymentMethod paymentStatus createdAt'),
    Purchase.countDocuments(match),
    Purchase.aggregate([{ $match:match },{$group:{_id:null,count:{$sum:1},subtotal:{$sum:'$subtotal'},discount:{$sum:'$discount'},total:{$sum:'$total'},paid:{$sum:'$paidAmount'},due:{$sum:'$dueAmount'}}}])
  ]);
  res.json({success:true,data:rows,summary:summary[0]||{count:0,subtotal:0,discount:0,total:0,paid:0,due:0},currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});

export const getExpensesReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const match=rangeMatch(req,'expenseDate',{companyId,status:'active'});
  if(req.query.categoryId){if(!mongoose.isValidObjectId(req.query.categoryId)) throw new AppError('Invalid category',400); match.categoryId=new mongoose.Types.ObjectId(req.query.categoryId);}
  const {page,limit,skip,sort}=new ApiFeatures(match,req.query).search(['categoryName','reference','note']).build();
  const [rows,totalItems,summary,byCategory]=await Promise.all([
    Expense.find(match).sort(sort).skip(skip).limit(limit).select('categoryName amount expenseDate paymentMethod reference note'),
    Expense.countDocuments(match),
    Expense.aggregate([{ $match:match },{$group:{_id:null,count:{$sum:1},total:{$sum:'$amount'}}}]),
    Expense.aggregate([{ $match:match },{$group:{_id:'$categoryName',total:{$sum:'$amount'},count:{$sum:1}}},{$sort:{total:-1}},{$limit:10}])
  ]);
  res.json({success:true,data:rows,summary:summary[0]||{count:0,total:0},byCategory,currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});

export const getProfitLossReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const sales=rangeMatch(req,'createdAt',{companyId}); const purchases=rangeMatch(req,'createdAt',{companyId}); const expenses=rangeMatch(req,'expenseDate',{companyId,status:'active'});
  const [s,p,e]=await Promise.all([
    Sale.aggregate([{$match:sales},{$group:{_id:null,total:{$sum:'$total'},count:{$sum:1}}}]),
    Purchase.aggregate([{$match:purchases},{$group:{_id:null,total:{$sum:'$total'},count:{$sum:1}}}]),
    Expense.aggregate([{$match:expenses},{$group:{_id:null,total:{$sum:'$amount'},count:{$sum:1}}}])
  ]);
  const revenue=s[0]?.total||0, purchaseCost=p[0]?.total||0, expenseCost=e[0]?.total||0;
  res.json({success:true,data:{revenue,purchaseCost,expenses:expenseCost,grossProfit:revenue-purchaseCost,netProfit:revenue-purchaseCost-expenseCost,salesCount:s[0]?.count||0,purchaseCount:p[0]?.count||0,expenseCount:e[0]?.count||0}});
});

export const getProductsReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const {page,limit,skip,sort}=new ApiFeatures({companyId},req.query).search(['name','sku','barcode']).applyFilters(['status','categoryId']).build();
  const rows=await Product.find({companyId,...(req.query.status?{status:req.query.status}:{}),...(req.query.categoryId?{categoryId:req.query.categoryId}:{})}).sort(sort).skip(skip).limit(limit).select('name sku barcode purchasePrice sellingPrice openingStock minimumStock unit status categoryId');
  const totalItems=await Product.countDocuments({companyId,...(req.query.status?{status:req.query.status}:{}),...(req.query.categoryId?{categoryId:req.query.categoryId}:{})});
  res.json({success:true,data:rows,currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});

export const getCustomersReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const {page,limit,skip,sort}=new ApiFeatures({companyId},req.query).search(['name','phone','email']).build();
  const rows=await Customer.find({companyId,...(req.query.search ? { $or: [{name:new RegExp(req.query.search,'i')},{phone:new RegExp(req.query.search,'i')},{email:new RegExp(req.query.search,'i')}] } : {})}).sort(sort).skip(skip).limit(limit);
  const totalItems=await Customer.countDocuments({companyId});
  res.json({success:true,data:rows,currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});

export const getSuppliersReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const {page,limit,skip,sort}=new ApiFeatures({companyId},req.query).search(['name','phone','email']).applyFilters(['status']).build();
  const rows=await Supplier.find({companyId,...(req.query.status?{status:req.query.status}:{}),...(req.query.search ? { $or: [{name:new RegExp(req.query.search,'i')},{phone:new RegExp(req.query.search,'i')},{email:new RegExp(req.query.search,'i')}] } : {})}).sort(sort).skip(skip).limit(limit);
  const totalItems=await Supplier.countDocuments({companyId,...(req.query.status?{status:req.query.status}: {})});
  res.json({success:true,data:rows,currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});

export const getInventoryReport = asyncHandler(async(req,res)=>{
  const {companyId}=scope(req); const {page,limit,skip,sort}=new ApiFeatures({companyId},req.query).search(['name','sku','barcode']).applyFilters(['status','categoryId']).build();
  const match={companyId,...(req.query.status?{status:req.query.status}:{}),...(req.query.categoryId?{categoryId:req.query.categoryId}:{})};
  const pipeline=[{$match:match},{$lookup:{from:'stockmovements',let:{pid:'$_id'},pipeline:[{$match:{companyId,$expr:{$eq:['$productId','$$pid']}}},{$group:{_id:'$productId',net:{$sum:'$quantityChange'}}}],as:'movement'}},{$addFields:{currentStock:{$add:['$openingStock',{$ifNull:[{$arrayElemAt:['$movement.net',0]},0]}]}}},{$sort:sort},{$facet:{data:[{$skip:skip},{$limit:limit}],total:[{$count:'count'}]}}];
  const result=await Product.aggregate(pipeline); const data=result[0]?.data||[]; const totalItems=result[0]?.total?.[0]?.count||0;
  res.json({success:true,data,currentPage:page,totalPages:Math.max(1,Math.ceil(totalItems/limit)),totalItems,limit});
});
